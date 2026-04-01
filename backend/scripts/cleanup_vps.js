const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const API_URL = 'https://api.aloshipp.com/api';

async function cleanup() {
    try {
        console.log("🧹 ĐANG DỌN DẸP CHIẾN TRƯỜNG LOAD TEST TRÊN VPS...");
        
        // 1. Kết nối DB Local để lấy cấu hình Token
        await mongoose.connect(process.env.MONGO_URI);
        const admin = await Admin.findOne();
        if (!admin) throw new Error("Không tìm thấy Admin thật để mượn Token");
        
        const adminToken = jwt.sign(
            { id: admin._id, role: 'admin', phone: admin.phone },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 2. Lấy danh sách Toàn bộ đơn hàng trên VPS
        console.log("📥 Đang quyét tìm Đơn Hàng Rác trên Hệ thống VPS...");
        let allTestOrders = [];
        
        // Chạy qua vài trang để tìm
        for (let page = 1; page <= 10; page++) {
            const res = await axios.get(`${API_URL}/orders?page=${page}&limit=100`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            const orders = res.data.data;
            if (!orders || orders.length === 0) break;
            
            const testOrders = orders.filter(o => o.customerName && o.customerName.startsWith('TEST_Khách_'));
            allTestOrders.push(...testOrders);
        }

        console.log(`🔎 Tìm thấy ${allTestOrders.length} Đơn Hàng Rác. Bắt đầu xóa...`);

        // 3. Xóa từng đơn một
        let deleted = 0;
        const deletePromises = allTestOrders.map(async (o) => {
            try {
                await axios.delete(`${API_URL}/orders/${o._id}`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                deleted++;
                process.stdout.write(`\rĐã xóa ${deleted}/${allTestOrders.length} đơn rác...`);
            } catch(e) { /* ignore */ }
        });

        await Promise.all(deletePromises);

        console.log(`\n🎉 HOÀN TẤT DỌN DẸP! Trả máy chủ VPS về nguyên trạng sạch sẽ tinh tươm.`);
        process.exit(0);

    } catch (e) {
        console.error("LỖI DỌN DẸP:", e.response?.data || e.message);
        process.exit(1);
    }
}

cleanup();
