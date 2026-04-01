# ✅ Hoàn Tất Triển Khai Tính Năng Giai Đoạn Nâng Cấp AloShipp

Dưới đây là bản kê khai chi tiết các tính năng mới đã được phát triển thành công và tích hợp vào hệ thống AloShipp theo đúng như kế hoạch. Mọi chức năng liên quan đến phần lõi Backend cùng App Khách Hàng và App Vận Hành (Admin) đều đã được nối kết và xác thực kỹ lưỡng.

---

> [!NOTE]
> Tất cả các code mới đã được tiêm trực tiếp vào kiến trúc hiện tại của dự án mà không làm xáo trộn các luồng giao nhận hàng / đặt xe đang chạy trên máy chủ (`backend`, `admin-app`, `frontend`).

### 1. Phân Tách Hệ Thống Thông Báo (Chuông Báo Động) 🔔
Giải quyết bài toán "oanh tạc chuông". 
* **Backend Socket.IO:** Bổ sung tham số `isSilent` để điều khiển loa báo lệnh.
* **App Thao Tác (Admin):** Giờ đây nhân viên tổng đài tạo / phân phối đơn hàng, hệ thống sẽ tự nín lặng ở phía Admin App nhưng sẽ _tự xé gió rú còi_ gửi thẳng qua màn hình của tài xế nhận cuốc.
* **App Đặt Hàng (Customer):** Khi khách thực sự là người tự tạo đơn, hệ thống mới phát còi vang dội gọi các nhân viên tổng đài xử lý.

### 2. Thiết Kế Mới Hệ Thống Tin Tức (Bảng Cáo Thị) 📰
Giải pháp quảng cáo và thông tin hiệu quả tận màn hình thiết bị khách hàng.
* Sếp / Quản trị viên giờ đây có trang công cụ riêng tên **"Bảng Tin"** trên thanh Menu Admin. 
* Tự do Đăng ảnh / Thả file Video (hỗ trợ file nặng lên đến 50MB) + Tiêu đề + Nội dung cho chiến dịch khuyến mãi.
* Tính năng "Ẩn/Hiện" tin đăng chỉ qua một chạm (Eye icon).
* Cấu trúc tự làm sạch: Nút "Xóa Sạch" không đơn thuần là ẩn bài viết, mà nó sẽ kích hoạt module "Lau Dọn Phần Cứng" **xoá vĩnh viễn** tấm ảnh/video đó ra khỏi ổ cứng VPS giúp giải phóng tài nguyên.
* **Customer App:** Ảnh và video của tin tức được tự động đồng bộ hóa và biến thành **băng chuyền thông minh tự trượt (Slider Carousel)** ngay giữa màn hình "Trang Chủ Đặt Xe". 

### 3. Sổ Đen Công Nợ / Doanh Số Chiết Khấu Tài Xế 💰
Tự động hóa mọi công cụ đánh thuế và truy thu quân lính (Tài xế).
* Bổ sung trường "Mức Chiết Khấu" cho từng tài xế (VD: 15% hoặc 20%). Áp dụng ngay khi Thêm mới hoặc Edit tài xế.
* **Thuật Toán Máy Chém:** Mỗi khi có 1 đơn hàng rơi vào trạng thái `Hoàn Thành`, ngay lập tức máy chủ sẽ tự **Phân Tách Lãi Lỗ**: _Lấy Tiền Ship x Tỉ lệ phần trăm Chiết Khấu_. Tiền này sẽ được Auto-cộng vào sổ nợ (`walletDebt`) của tài xế đó.
* **Sổ Nợ Cá Nhân:** Trong App Admin, nay xuất hiện sổ quản lý cho từng tài xế tên là **"Sổ Đen"**. Sổ này cấp chức năng: Cho phép ghi "Bộ Thu Tiền" tay, Xử Phạt hoặc "Ân Xá" Mốc bằng Không. Tất cả tiền thu/ phạt đều được in Lịch sử giao dịch chặt chẽ dưới mã `FEE_DEDUCTION`, `PENALTY`, và `PAYMENT`.

### 4. Quản Lý Thẩm Quyền Băng Đảng (Anti-Staff Phá Hoại) 🛡️
Rào chắn chống lại các hành vi cố tình/vô ý sai sót từ Nhân Viên Tổng đài. Mọi thứ chỉ được ủy quyền tuyệt đối cho chúa tể `Admin`.
* **Giấu mục Doanh Thu:** Ngay khi Tài khoản đăng nhập mang danh xưng `Role: Staff`, tự động thanh Doanh Thu sẽ bốc hơi và không thể truy đòi trên màn hình lớn.
* **Nút Xóa Tài Khoản Nhân Viên:** Tàng hình chức năng thu hồi "Xóa Tài Khoản Tài Xế Bằng Máu Đỏ". Chỉ Admin mới có quyền tiễn 1 con xe đăng ký ra khỏi hệ thống.

---

> [!TIP]
> Hệ thống hiện tại đã ở trạng thái ổn định và sẵn sàng cho bài test **"Treo tải cao điểm"** mà Sếp đã đề xuất (1000 đơn và 100 tài xế giả lập). Sếp có thể khởi động kiểm thử để xác nhận khả năng chống chịu của hệ thống mới. 🚀
