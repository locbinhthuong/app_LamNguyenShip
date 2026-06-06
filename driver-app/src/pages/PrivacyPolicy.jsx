import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6', color: '#333' }}>
      <h1 style={{ color: '#2c3e50', textAlign: 'center', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
        Chính sách bảo mật (Privacy Policy)
      </h1>
      <p style={{ textAlign: 'center' }}><em>Cập nhật: 06/06/2026</em></p>

      <h2 style={{ color: '#2980b9' }}>1. Thu thập thông tin</h2>
      <p>Ứng dụng có thể thu thập các thông tin cá nhân sau đây từ người dùng:</p>
      <ul style={{ paddingLeft: '20px' }}>
        <li>Họ tên</li>
        <li>Số điện thoại</li>
        <li>Địa chỉ email (nếu có)</li>
        <li>Địa chỉ giao hàng và nhận hàng</li>
      </ul>

      <div style={{ backgroundColor: '#e8f4f8', padding: '15px', borderLeft: '4px solid #3498db', borderRadius: '4px', margin: '20px 0' }}>
        <h3 style={{ color: '#2980b9', marginTop: 0 }}>* Thu thập và Sử dụng Dữ liệu Vị trí (Location Data) - QUAN TRỌNG</h3>
        <p>Ứng dụng <strong>AloShipp Driver</strong> yêu cầu quyền truy cập vào vị trí hiện tại của thiết bị (Location Data), bao gồm cả khi ứng dụng đang mở trên màn hình hoặc <strong>đang chạy ngầm trong nền (Background Location)</strong>.</p>
        <p>Mục đích sử dụng dữ liệu vị trí:</p>
        <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
          <li>Phục vụ việc xác định chính xác điểm lấy hàng và giao hàng.</li>
          <li>Giúp hệ thống điều phối, tìm kiếm và phát các đơn hàng ở gần vị trí hiện tại của tài xế nhất.</li>
          <li>Cho phép khách hàng và quản trị viên theo dõi hành trình giao hàng theo thời gian thực (real-time) để đảm bảo an toàn và tính chính xác.</li>
        </ul>
      </div>

      <h2 style={{ color: '#2980b9' }}>2. Mục đích sử dụng thông tin</h2>
      <p>Thông tin cá nhân của người dùng được sử dụng để:</p>
      <ul style={{ paddingLeft: '20px' }}>
        <li>Tạo và quản lý đơn hàng.</li>
        <li>Liên hệ giữa khách hàng, tài xế và hệ thống.</li>
        <li>Nâng cao chất lượng dịch vụ và hỗ trợ khách hàng.</li>
      </ul>

      <h2 style={{ color: '#2980b9' }}>3. Bảo mật thông tin</h2>
      <p>Chúng tôi cam kết bảo vệ thông tin cá nhân của người dùng bằng các biện pháp kỹ thuật và quản lý phù hợp.</p>
      <p>Dữ liệu sẽ không được chia sẻ cho bên thứ ba nếu không có sự đồng ý, trừ khi có yêu cầu từ cơ quan chức năng theo quy định pháp luật. <strong>Đặc biệt, dữ liệu vị trí hoàn toàn không được chia sẻ hay bán cho bất kỳ bên thứ ba nào vì mục đích quảng cáo.</strong></p>

      <h2 style={{ color: '#2980b9' }}>4. Quyền của người dùng</h2>
      <p>Người dùng có quyền yêu cầu chỉnh sửa hoặc xóa thông tin cá nhân bằng cách liên hệ với bộ phận hỗ trợ. Bạn cũng có thể thu hồi quyền truy cập Vị trí thông qua Cài đặt trên thiết bị (tuy nhiên việc này có thể làm gián đoạn khả năng nhận đơn).</p>

      <h2 style={{ color: '#2980b9' }}>5. Thay đổi chính sách</h2>
      <p>Chính sách bảo mật này có thể được cập nhật theo thời gian. Mọi thay đổi sẽ được thông báo trong ứng dụng hoặc trên trang web chính thức.</p>

      <h2 style={{ color: '#2980b9' }}>6. Trung Tâm Hỗ Trợ</h2>
      <p>Nếu bạn cần hỗ trợ khi sử dụng ứng dụng AloShipp vui lòng liên hệ:</p>
      <ul style={{ paddingLeft: '20px' }}>
        <li><strong>Email:</strong> Aloshippcantho@gmail.com</li>
        <li><strong>Số điện thoại:</strong> 0765120777</li>
        <li><strong>Địa chỉ:</strong> 387 - Trần Nam Phú, Ninh Kiều, Tỉnh Cần Thơ, Việt Nam</li>
      </ul>
    </div>
  );
}
