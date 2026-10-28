package vn.lamnguyenship.taixe;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PersistentLocationService extends Service {
    public static final String PREFS_NAME = "AloShippGpsPrefs";
    public static final String KEY_IS_ONLINE = "isOnline";
    public static final String KEY_API_URL = "apiUrl";
    public static final String KEY_TOKEN = "token";

    private static final String CHANNEL_ID = "aloshipp_persistent_gps_channel";
    private static final int NOTIFICATION_ID = 39102;
    private static final long HEARTBEAT_INTERVAL_MS = 12000L;

    private LocationManager locationManager;
    private Location lastLocation;
    private long lastSentTimeMs = 0L;
    private Handler heartbeatHandler;
    private Runnable heartbeatRunnable;
    private PowerManager.WakeLock wakeLock;
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            if (location != null) {
                lastLocation = location;
                long now = System.currentTimeMillis();
                if (now - lastSentTimeMs >= 6000L) {
                    lastSentTimeMs = now;
                    sendLocationToServer(location.getLatitude(), location.getLongitude());
                }
            }
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {}

        @Override
        public void onProviderEnabled(String provider) {}

        @Override
        public void onProviderDisabled(String provider) {}
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        startLocationUpdates();
        startHeartbeatLoop();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isOnline = prefs.getBoolean(KEY_IS_ONLINE, false);
        if (!isOnline) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification notification = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {}

        startLocationUpdates();
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isOnline = prefs.getBoolean(KEY_IS_ONLINE, false);
        if (isOnline) {
            // Tài xế vuốt bỏ app nhưng chưa bấm Offline -> Giữ dịch vụ định vị tiếp tục chạy ngầm
            try {
                Intent restartIntent = new Intent(getApplicationContext(), PersistentLocationService.class);
                restartIntent.setPackage(getPackageName());
                int flags = PendingIntent.FLAG_ONE_SHOT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent restartPendingIntent = PendingIntent.getService(
                        getApplicationContext(), 1001, restartIntent, flags
                );
                AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null) {
                    alarmManager.set(
                            AlarmManager.ELAPSED_REALTIME,
                            SystemClock.elapsedRealtime() + 1500L,
                            restartPendingIntent
                    );
                }
            } catch (Exception ignored) {}
        }
        super.onTaskRemoved(rootIntent);
    }

    @SuppressLint("MissingPermission")
    private void startLocationUpdates() {
        try {
            if (locationManager == null) {
                locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            }
            if (locationManager == null) return;

            try {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000L, 0f, locationListener, Looper.getMainLooper());
                Location gpsLast = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (gpsLast != null) lastLocation = gpsLast;
            } catch (Exception ignored) {}

            try {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000L, 0f, locationListener, Looper.getMainLooper());
                if (lastLocation == null) {
                    Location netLast = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    if (netLast != null) lastLocation = netLast;
                }
            } catch (Exception ignored) {}
        } catch (Exception ignored) {}
    }

    @SuppressLint("MissingPermission")
    private void startHeartbeatLoop() {
        if (heartbeatHandler != null) return;
        heartbeatHandler = new Handler(Looper.getMainLooper());
        heartbeatRunnable = new Runnable() {
            @Override
            public void run() {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                if (!prefs.getBoolean(KEY_IS_ONLINE, false)) {
                    stopForeground(true);
                    stopSelf();
                    return;
                }

                Location loc = lastLocation;
                if (loc == null && locationManager != null) {
                    try {
                        loc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                        if (loc == null) {
                            loc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                        }
                    } catch (Exception ignored) {}
                }

                if (loc != null) {
                    lastLocation = loc;
                    lastSentTimeMs = System.currentTimeMillis();
                    sendLocationToServer(loc.getLatitude(), loc.getLongitude());
                }

                if (heartbeatHandler != null) {
                    heartbeatHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS);
                }
            }
        };
        heartbeatHandler.postDelayed(heartbeatRunnable, 4000L);
    }

    private void sendLocationToServer(final double lat, final double lng) {
        final SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        final boolean isOnline = prefs.getBoolean(KEY_IS_ONLINE, false);
        final String apiUrl = prefs.getString(KEY_API_URL, "https://api.aloshipp.com");
        final String token = prefs.getString(KEY_TOKEN, "");

        if (!isOnline || token == null || token.isEmpty()) return;

        networkExecutor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String baseUrl = (apiUrl == null || apiUrl.trim().isEmpty())
                        ? "https://api.aloshipp.com"
                        : apiUrl.trim().replaceAll("/+$", "");
                URL url = new URL(baseUrl + "/api/auth/driver/location");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setDoOutput(true);

                String jsonBody = "{\"lat\":" + lat + ",\"lng\":" + lng + "}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
                }

                int status = conn.getResponseCode();
                if (status == 401 || status == 403) {
                    // Token hết hạn hoặc bị đăng xuất -> Ngưng dịch vụ
                    prefs.edit().putBoolean(KEY_IS_ONLINE, false).apply();
                    stopForeground(true);
                    stopSelf();
                    return;
                }

                if (status >= 200 && status < 300) {
                    StringBuilder sb = new StringBuilder();
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = br.readLine()) != null) {
                            sb.append(line);
                        }
                    }
                    String responseText = sb.toString();
                    if (responseText.contains("\"isOnline\":false")) {
                        // Tài xế đã Offline hoặc bị Admin tắt định vị -> Ngưng dịch vụ
                        prefs.edit().putBoolean(KEY_IS_ONLINE, false).apply();
                        stopForeground(true);
                        stopSelf();
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Định vị Tài xế AloShipp",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Duy trì định vị tài xế khi đang Online nhận đơn");
                channel.setShowBadge(false);
                channel.enableLights(false);
                channel.enableVibration(false);
                channel.setSound(null, null);
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags);
        }

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        int iconId = getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        if (iconId == 0) iconId = android.R.drawable.ic_menu_mylocation;

        builder.setContentTitle("AloShipp: Đang bật định vị Online")
                .setContentText("Vị trí vẫn được cập nhật khi đóng app. Bấm Offline trong app để tắt.")
                .setSmallIcon(iconId)
                .setOngoing(true);

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent);
        }

        return builder.build();
    }

    @SuppressLint("WakelockTimeout")
    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AloShipp::PersistentGpsWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
            }
        } catch (Exception ignored) {}
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        if (heartbeatHandler != null && heartbeatRunnable != null) {
            heartbeatHandler.removeCallbacks(heartbeatRunnable);
        }
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (Exception ignored) {}
        }
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
