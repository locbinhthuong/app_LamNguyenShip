const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Driver = require('../models/Driver');
const Order = require('../models/Order');

async function cleanup() {
    try {
        console.log("🧹 ĐANG DỌN DẸP CHIẾN TRƯỜNG LOAD TEST...");
        const vpsUri = 'mongodb+srv://admin:admin123456@cluster0.zps3o.mongodb.net/lamnguyenship?retryWrites=true&w=majority';
        await mongoose.connect(vpsUri);
        console.log('✅ Đã kết nối Database thành công.');

        // Xóa tất cả 100 tài xế có tên bắt đầu bằng TEST_
        const delDrivers = await Driver.deleteMany({ name: { $regex: /^TEST_/ } });
        console.log(`🗑️ Đã xóa sạch ${delDrivers.deletedCount} Tài Xế Ảo Khỏi Bạch Cung.`);

        // Xóa tất cả các đơn hàng Load test có chữ TEST_Khách
        const delOrders = await Order.deleteMany({ customerName: { $regex: /^TEST_/ } });
        console.log(`🗑️ Đã xóa sạch ${delOrders.deletedCount} Đơn Hàng Rác Khỏi Hệ Thống.`);

        console.log(`\n🎉 HOÀN TẤT DỌN DẸP! Trả máy chủ về nguyên trạng sạch sẽ tinh tươm.`);
        process.exit(0);
    } catch (e) {
        console.error("LỖI DỌN DẸP:", e);
        process.exit(1);
    }
}

cleanup();
