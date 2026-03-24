require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Driver = require('./models/Driver');
const Admin = require('./models/Admin');
const Order = require('./models/Order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lamnguyenship';

const seedData = async () => {
  try {
    console.log('🔄 Đang kết nối MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Kết nối MongoDB thành công!');

    // ==================== XÓA DỮ LIỆU CŨ ====================
    console.log('🗑️  Đang xóa dữ liệu cũ...');
    await Promise.all([
      Driver.deleteMany({}),
      Admin.deleteMany({}),
      Order.deleteMany({})
    ]);
    console.log('✅ Đã xóa dữ liệu cũ!');

    // ==================== TẠO ADMIN ====================
    console.log('👤 Đang tạo Admin...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await Admin.create({
      name: 'Nguyễn Văn Admin',
      phone: '0909123456',
      password: adminPassword,
      role: 'admin',
      status: 'active'
    });
    console.log(`✅ Admin tạo thành công!`);
    console.log(`   Phone: 0909123456`);
    console.log(`   Password: admin123`);

    // ==================== TẠO DRIVERS ====================
    console.log('\n🚗 Đang tạo Tài xế...');
    const driverPassword = await bcrypt.hash('driver123', 10);

    const drivers = await Driver.create([
      {
        name: 'Trần Văn Tài',
        phone: '0911111111',
        password: driverPassword,
        vehicleType: 'motorcycle',
        licensePlate: '59P1-12345',
        status: 'active',
        isOnline: true,
        stats: { totalOrders: 150, completedOrders: 145, cancelledOrders: 3, rating: 4.8, totalRatingCount: 120 }
      },
      {
        name: 'Lê Thị Xe',
        phone: '0922222222',
        password: driverPassword,
        vehicleType: 'motorcycle',
        licensePlate: '59P2-23456',
        status: 'active',
        isOnline: true,
        stats: { totalOrders: 200, completedOrders: 195, cancelledOrders: 2, rating: 4.9, totalRatingCount: 180 }
      },
      {
        name: 'Phạm Công Sự',
        phone: '0933333333',
        password: driverPassword,
        vehicleType: 'car',
        licensePlate: '59A-11111',
        status: 'active',
        isOnline: false,
        stats: { totalOrders: 80, completedOrders: 78, cancelledOrders: 1, rating: 4.7, totalRatingCount: 75 }
      }
    ]);
    console.log(`✅ Đã tạo ${drivers.length} tài xế!`);
    drivers.forEach(d => {
      console.log(`   - ${d.name} | ${d.phone} | Password: driver123`);
    });

    // ==================== TẠO ORDERS ====================
    console.log('\n📦 Đang tạo Đơn hàng...');
    const orders = await Order.create([
      {
        customerName: 'Nguyễn Văn A',
        customerPhone: '0901000001',
        pickupAddress: '123 Nguyễn Trãi, Quận 1, TP.HCM',
        deliveryAddress: '456 Lê Lợi, Quận 1, TP.HCM',
        items: ['2x Bánh mì thịt', '1x Trà sữa'],
        note: 'Giao nhanh giúp em',
        status: 'PENDING',
        codAmount: 75000,
        deliveryFee: 20000,
        createdBy: admin._id
      },
      {
        customerName: 'Trần Thị B',
        customerPhone: '0901000002',
        pickupAddress: '789 Đồng Khởi, Quận 1, TP.HCM',
        deliveryAddress: '321 Hai Bà Trưng, Quận 3, TP.HCM',
        items: ['1x Cơm gà', '1x Nước ngọt'],
        note: '',
        status: 'PENDING',
        codAmount: 55000,
        deliveryFee: 20000,
        createdBy: admin._id
      },
      {
        customerName: 'Lê Văn C',
        customerPhone: '0901000003',
        pickupAddress: '555 Võ Văn Tần, Quận 3, TP.HCM',
        deliveryAddress: '888 Phạm Ngũ Lão, Quận 1, TP.HCM',
        items: ['3x Bún bò', '2x Chả'],
        note: 'Khách dị ứng hành',
        status: 'PENDING',
        codAmount: 120000,
        deliveryFee: 25000,
        createdBy: admin._id
      },
      {
        customerName: 'Phạm Thị D',
        customerPhone: '0901000004',
        pickupAddress: '111 Nguyễn Huệ, Quận 1, TP.HCM',
        deliveryAddress: '222 Pasteur, Quận 3, TP.HCM',
        items: ['2x Phở bò', '1x Nước sâm'],
        note: '',
        status: 'PENDING',
        codAmount: 95000,
        deliveryFee: 20000,
        createdBy: admin._id
      },
      {
        customerName: 'Hoàng Văn E',
        customerPhone: '0901000005',
        pickupAddress: '333 Đề Thám, Quận 1, TP.HCM',
        deliveryAddress: '444 Cao Thắng, Quận 3, TP.HCM',
        items: ['1x Bún chả', '1x Chả nem'],
        note: 'Gọi trước khi giao',
        status: 'ACCEPTED',
        assignedTo: drivers[0]._id,
        acceptedAt: new Date(Date.now() - 3600000),
        codAmount: 65000,
        deliveryFee: 20000,
        createdBy: admin._id
      },
      {
        customerName: 'Vũ Thị F',
        customerPhone: '0901000006',
        pickupAddress: '666 Trần Hưng Đạo, Quận 1, TP.HCM',
        deliveryAddress: '777 Nguyễn Tri Phương, Quận 10, TP.HCM',
        items: ['2x Cơm tấm', '1x Nước đá'],
        note: '',
        status: 'COMPLETED',
        assignedTo: drivers[1]._id,
        acceptedAt: new Date(Date.now() - 7200000),
        deliveredAt: new Date(Date.now() - 3600000),
        codAmount: 80000,
        deliveryFee: 20000,
        createdBy: admin._id
      }
    ]);
    console.log(`✅ Đã tạo ${orders.length} đơn hàng!`);

    // ==================== KẾT QUẢ ====================
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  🎉 SEED THÀNH CÔNG!                      ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  👤 ADMIN                                               ║');
    console.log('║     Phone:     0909123456                               ║');
    console.log('║     Password:  admin123                                  ║');
    console.log('║                                                          ║');
    console.log('║  🚗 DRIVERS (đăng nhập bằng phone + password)           ║');
    console.log('║     0911111111 | driver123 | Trần Văn Tài               ║');
    console.log('║     0922222222 | driver123 | Lê Thị Xe                   ║');
    console.log('║     0933333333 | driver123 | Phạm Công Sự               ║');
    console.log('║                                                          ║');
    console.log('║  📦 ORDERS: 6 đơn (4 PENDING, 1 ACCEPTED, 1 COMPLETED)  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed:', error);
    process.exit(1);
  }
};

seedData();
