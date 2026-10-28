package vn.lamnguyenship.taixe;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Vô hiệu hóa luật cấm tự động phát âm thanh của Android và gắn cầu nối GPS chạy ngầm
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            webView.addJavascriptInterface(new NativeGpsBridge(), "AndroidNativeGps");
        }
    }

    public class NativeGpsBridge {
        @JavascriptInterface
        public void startService(String apiUrl, String token) {
            try {
                SharedPreferences prefs = getSharedPreferences(PersistentLocationService.PREFS_NAME, MODE_PRIVATE);
                prefs.edit()
                        .putBoolean(PersistentLocationService.KEY_IS_ONLINE, true)
                        .putString(PersistentLocationService.KEY_API_URL, apiUrl != null ? apiUrl : "https://api.aloshipp.com")
                        .putString(PersistentLocationService.KEY_TOKEN, token != null ? token : "")
                        .apply();

                Intent serviceIntent = new Intent(MainActivity.this, PersistentLocationService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void stopService() {
            try {
                SharedPreferences prefs = getSharedPreferences(PersistentLocationService.PREFS_NAME, MODE_PRIVATE);
                prefs.edit()
                        .putBoolean(PersistentLocationService.KEY_IS_ONLINE, false)
                        .apply();

                Intent serviceIntent = new Intent(MainActivity.this, PersistentLocationService.class);
                MainActivity.this.stopService(serviceIntent);
            } catch (Exception ignored) {}
        }
    }
}
