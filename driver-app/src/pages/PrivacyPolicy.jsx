import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <h1 style={{ color: '#2c3e50', textAlign: 'center', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
        Chính Sách Quyền Riêng Tư
      </h1>
      <p><em>Cập nhật lần cuối: 06/06/2026</em></p>

      <p>Chào mừng bạn đến với ứng dụng <strong>AloShipp Driver</strong>. Chúng tôi coi trọng quyền riêng tư của bạn và cam kết bảo vệ thông tin cá nhân của người dùng.</p>

      <div style={{ backgroundColor: '#e8f4f8', padding: '15px', borderLeft: '4px solid #3498db', borderRadius: '4px', margin: '20px 0' }}>
        <h2 style={{ color: '#2980b9', marginTop: 0 }}>1. Thu thập và Sử dụng Dữ liệu Vị trí (Location Data) - QUAN TRỌNG</h2>
        <p>Ứng dụng AloShipp Driver là ứng dụng dành riêng cho tài xế giao hàng. Để cung cấp dịch vụ tốt nhất, <strong>Ứng dụng yêu cầu quyền truy cập vào vị trí của thiết bị (Location Data)</strong>, bao gồm cả khi ứng dụng đang mở trên màn hình hoặc <strong>đang chạy ngầm trong nền (Background Location)</strong>.</p>
        <p>Mục đích sử dụng dữ liệu vị trí:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong>Điều phối đơn hàng:</strong> Giúp hệ thống tìm kiếm và phát các đơn hàng ở gần vị trí hiện tại của tài xế nhất, tối ưu hóa quãng đường.</li>
          <li><strong>Theo dõi lộ trình:</strong> Cho phép khách hàng và quản trị viên theo dõi hành trình giao hàng theo thời gian thực (real-time).</li>
        </ul>
        <p>Chúng tôi cam kết dữ liệu vị trí chỉ được sử dụng cho mục đích vận hành nghiệp vụ giao nhận của AloShipp và <strong>hoàn toàn không chia sẻ hay bán cho bất kỳ bên thứ ba nào vì mục đích quảng cáo</strong>.</p>
      </div>

      <h2 style={{ color: '#2980b9' }}>2. Thông tin khác</h2>
      <ul style={{ paddingLeft: '20px' }}>
        <li><strong>Thông tin tài khoản:</strong> Số điện thoại, họ tên, ảnh đại diện, phương tiện.</li>
        <li><strong>Camera/Thư viện ảnh:</strong> Để tài xế chụp ảnh xác nhận lấy/giao hàng.</li>
      </ul>

      <h2 style={{ color: '#2980b9' }}>3. Quyền của người dùng</h2>
      <p>Bạn có thể thu hồi quyền truy cập Vị trí, Camera qua Cài đặt trên thiết bị, hoặc yêu cầu xóa tài khoản bằng cách liên hệ với tổng đài.</p>

      <h2 style={{ color: '#2980b9' }}>4. Liên hệ</h2>
      <p>Email: support@aloshipp.com | Website: aloshipp.com</p>
    </div>
  );
}
