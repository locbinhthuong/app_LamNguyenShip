# Kế Hoạch Chuyển Đổi Web App Tài Xế Thành Ứng Dụng Di Động (iOS & Android)

**Mục tiêu:** Đóng gói dự án `driver-app` (hiện đang dùng React Js/Vite) thành ứng dụng gốc trên nền tảng hiển thị iOS và Android sử dụng **Capacitor**. Kế hoạch này được thực hiện khi Web App Tài Xế đã hoàn thiện đầy đủ các tính năng.

---

## Giai đoạn 1: Chuẩn bị & Cấu hình môi trường (Mức độ độ ưu tiên: Cao)

### 1. Dành cho Android
- **Công cụ:** Tải và cài đặt **Android Studio** (bao gồm Android SDK).
- **Tài khoản:** Đăng ký tài khoản Google Play Developer ($25 USD / trọn đời).
- **Trạng thái hiện tại:** Thư mục `android` đã tồn tại trong `driver-app`, các gói `@capacitor/android` đã được cài sẵn.

### 2. Dành cho iOS
- **Công cụ:** Phải có máy **macOS**, Tải và cài đặt phần mềm **Xcode**, cài đặt Xcode Command Line Tools, và `CocoaPods`.
- **Tài khoản:** Đăng ký chương trình Apple Developer Program ($99 USD / năm).
- **Khởi tạo iOS cho Project:**
  ```bash
  cd driver-app
  npm install @capacitor/ios
  npx cap add ios
  ```

---

## Giai đoạn 2: Điều chỉnh các tính năng Native (Hardware / Nền tảng)

Web App chạy trên trình duyệt sẽ có đôi chút khác biệt khi đóng gói thành ứng dụng Native. Khi app web đã hoàn chỉnh, cần cấu hình các plugin sau để thiết bị chạy ổn định:

1. **Background Geolocation (Định vị chạy ngầm):**
   - Plugin: `@capacitor-community/background-geolocation` (Đã thấy có trong `package.json`).
   - Cần đảm bảo quyền (Permissions) theo dõi vị trí được yêu cầu đúng cách trên cả `AndroidManifest.xml` (Android) và `Info.plist` (iOS).
   - Đảm bảo app vẫn giữ kết nối Socket.io / Cập nhật vị trí lên MongoDB khi tài xế khóa màn hình hoặc chạy đa nhiệm.

2. **Push Notifications (Thông báo nổi):**
   - Plugin: `@capacitor/local-notifications` hoặc `@capacitor/push-notifications` (kết hợp với Firebase Cloud Messaging - FCM).
   - Thay thế việc âm thanh kêu rè rè trên trình duyệt Web bằng thông báo Popup Native chuẩn của điện thoại (Banner đổ xuống từ trên, kèm chuông màn hình khóa). Tạo chứng chỉ APNs (iOS) và copy google-services.json vào Native repo.

3. **Giao Diện Tràn Viền (Safe Area):**
   - Điều chỉnh CSS trong phần Header/Footer của `driver-app` (Tailwind) để không bị lẹm vào "Tai thỏ" (Notch) của iPhone hoặc Thanh điều hướng của Android. Thường dùng thẻ meta `viewport-fit=cover` và biến CSS `env(safe-area-inset-top)`.

---

## Giai đoạn 3: Biên dịch, Đồng BỘ và Build App (Quy trình đóng gói)

Đây là vòng lặp bạn sẽ chạy mỗi lần `driver-app` có cập nhật mã nguồn mới.

1. **Build bản Web:** (Chuyển đổi toàn bộ Web từ React sang HTML/JS tĩnh).
   ```bash
   cd driver-app
   npm run build
   ```

2. **Đồng bộ vào Native App (Android/iOS):**
   ```bash
   npx cap sync
   ```

3. **Đóng gói mã gốc:**
   - **Android:** 
     Gõ `npx cap open android` => Mở Android Studio => Chọn Build => **Generate Signed Bundle / APK** => Chọn `.aab` (Android App Bundle) để upload.
   - **iOS:** 
     Gõ `npx cap open ios` => Mở Xcode => Cấu hình Signing & Capabilities bằng tài khoản Apple Dev => Chọn Product => **Archive** => Validate App và Upload thẳng lên App Store Connect.

---

## Giai đoạn 4: Đẩy ứng dụng lên Chợ ứng dụng (App Store / Play Store)

1. **Chuẩn bị Tài liệu & Hình ảnh (Metadata):**
   - Viết bài giới thiệu/ Mô tả App: Tính năng, Đối tượng sử dụng.
   - Lấy ảnh chụp màn hình (App Screenshots): Ít nhất 4 bức ảnh cho độ phân giải màn hình khác nhau.
   - Chính sách Quyền riêng tư (Privacy Policy): BẮT BUỘC. Cần đăng 1 trang chính sách giải thích vì sao App theo dõi vị trí ngầm (Background Tracking).

2. **Xét duyệt Google Play (Android):**
   - Thường mất khoảng 3 - 7 ngày làm việc. Google xét duyệt kỹ quyền "Lấy vị trí khi ứng dụng đang tắt", cần phải quay 1 Video giải thích lý do tài xế bắt buộc cần quyền này (để phân bổ cuốc xe).

3. **Xét duyệt Apple App Store (iOS):**
   - Thông thường từ 1 - 2 ngày làm việc. Apple khắt khe về UI/UX và đôi khi sẽ yêu cầu cấp cho họ 1 Tài khoản Testing (tài khoản tài xế ảo) để họ tự đăng nhập và test app của bạn.

---

## 💰 Bảng dự tính chi phí (Tham khảo):

| Hạng mục chi phí                    | Số tiền / Tần suất            | Ghi chú                                   |
|-------------------------------------|-------------------------------|-------------------------------------------|
| **Google Play Developer Account**   | $25 USD (~ 600K) / 1 Lần      | Trọn đời, không gia hạn thêm.             |
| **Apple Developer Account**         | $99 USD (~ 2.5 Tr) / Mỗi năm  | Bắt buộc đóng hàng năm để giữ app iOS.    |
| **Máy Mac (Thiết bị Biên Dịch)**    | Tùy chọn                      | Bắt buộc để code/build app đưa lên iOS App Store. (Tự mua máy hoặc thuê Cloud MacInCloud ~ $25/tháng).  |
| **Server Backend App (VPS/Mongo)**  | Không thay đổi                | Hiện đang chạy như bản Web, không phụ phí.|

---
*Ghi Chú Đặc Biệt: File kế hoạch này được lưu trữ tĩnh trong thư mục gốc. Khi dự án Web Tài Xế đủ độ hoàn thiện. Hãy chọn một ngày cụ thể mở IDE lên và chạy lần lượt các bước trong hướng dẫn này! Chúc dự án ra khơi thuận lợi!*
