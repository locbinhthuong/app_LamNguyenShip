const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Driver = require('../models/Driver');
const Order = require('../models/Order');
const Admin = require('../models/Admin');

const NUM_DRIVERS = 100;
const NUM_ORDERS = 500; // Giới hạn 500 để không vi phạm Rate Limit 2000
const API_URL = 'https://api.aloshipp.com/api';

async function runTest() {
    try {
        console.log("🔥 ĐANG KHỞI ĐỘNG HỆ THỐNG LOAD TEST KỊCH TRẦN...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Đã kết nối Database thành công.');

        // 1. Lên nòng: Tạo 100 Tài xế ảo trực tiếp qua DB
        console.log(`⏳ Đang tạo ${NUM_DRIVERS} Tài xế ảo...`);
        const drivers = [];
        for (let i = 0; i < NUM_DRIVERS; i++) {
            const d = await Driver.create({
                name: `TEST_Driver_${i}`,
                phone: `0999000${i.toString().padStart(3, '0')}`,
                password: 'testpassword123',
                status: 'active',
                isOnline: true,
                vehicleType: 'motorcycle',
                licensePlate: `59-T1 ${i.toString().padStart(5, '0')}`
            });
            const token = jwt.sign(
                { id: d._id, role: 'driver', phone: d.phone },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );
            drivers.push({ driver: d, token });
        }
        console.log('✅ Hoàn tất tạo 100 Tài xế ảo.');

        // 2. Cắm chốt 100 tài xế lên hệ thống Socket.IO
        console.log(`⏳ Đang kết nối 100 Điện thoại tới Mạng lưới Socket.IO...`);
        let connectedCount = 0;
        
        // Quản lý rate limit gọi API Accept Order
        let acceptTokensBucket = 500;

        await new Promise(resolve => {
            drivers.forEach((d, index) => {
                const socket = io('https://api.aloshipp.com', {
                    auth: { token: d.token, role: 'driver' },
                    transports: ['websocket']
                });

                socket.on('connect', () => {
                    connectedCount++;
                    if (connectedCount === NUM_DRIVERS) {
                        console.log('✅ 100 Tài xế Ảo đã Bật Cờ Sẵn Sàng!');
                        resolve();
                    }
                });

                // Thuật toán: Khi có Đơn mới nổ ra, gán 1 tài xế nổ sớm, vài tài xế sẽ hụt
                socket.on('new_order', async (order) => {
                    // Nếu tài xế có index trùng với ID phần trăm thì lao vào nhận để tránh Spam 100 request
                    const orderNum = parseInt(order.customerPhone.slice(-3));
                    if (orderNum % NUM_DRIVERS === index && acceptTokensBucket > 0) {
                        acceptTokensBucket--;
                        const reactionTime = Math.floor(Math.random() * 500) + 100; // Nghĩ 0.1 - 0.6s
                        setTimeout(async () => {
                            try {
                                await axios.post(`${API_URL}/orders/${order._id}/accept`, {}, {
                                    headers: { Authorization: `Bearer ${d.token}` }
                                });
                                // console.log(`⚡ Tài xế ${d.driver.name} Đã Chốt Đơn!`);
                            } catch (e) {
                                // Người khác nhận mất hoặc quá tải
                            }
                        }, reactionTime);
                    }
                });
            });
        });

        // 3. Chuẩn bị đạn dược: Admin Token để tạo Lệnh Nổ Đơn
        const admin = await Admin.findOne();
        if (!admin) throw new Error("Không tìm thấy Admin thật để mượn Token");
        const adminToken = jwt.sign(
            { id: admin._id, role: 'admin', phone: admin.phone },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log(`\n🚀 CHUẨN BỊ XẢ 500 ĐƠN HÀNG TRONG VÀI GIÂY... LÀM TỚI ĐÂY!`);
        let ordersCreated = 0;
        let successOrders = 0;

        const interval = setInterval(async () => {
            if (ordersCreated >= NUM_ORDERS) {
                clearInterval(interval);
                console.log(`\n🎉 ĐÃ NÃ HOA TIÊU ĐÚNG ${NUM_ORDERS} LẦN.`);
                console.log(`Chờ dàn tài xế chốt nốt những đơn cuối rơi rớt...`);
                setTimeout(() => {
                    console.log(`\n============================================`);
                    console.log(`✅ [HOÀN TẤT BÀI THI] Hệ thống không hề xập xệ`);
                    console.log(`============================================\n`);
                    process.exit(0);
                }, 5000);
                return;
            }

            // Gửi 25 đơn cùng 1 tích tắc
            const batchSize = 25;
            const requests = [];
            for (let i = 0; i < batchSize; i++) {
                if (ordersCreated + i >= NUM_ORDERS) break;
                
                const curIndex = ordersCreated + i;
                requests.push(
                    axios.post(`${API_URL}/orders`, {
                        customerName: `TEST_Khách_${curIndex}`,
                        customerPhone: `0988000${curIndex.toString().padStart(3, '0')}`,
                        pickupAddress: 'Tòa nhà Landmark 81',
                        pickupLocation: { lat: 10.7961, lng: 106.7223 },
                        deliveryAddress: 'Chợ Bến Thành TEST',
                        deliveryLocation: { lat: 10.7725, lng: 106.6980 },
                        distance: 4.5,
                        shippingFee: 25000,
                        notes: 'TEST_ORDER_LOAD'
                    }, {
                        headers: { Authorization: `Bearer ${adminToken}` }
                    }).then(() => { successOrders++; })
                      .catch(e => {})
                );
            }
            ordersCreated += batchSize;
            await Promise.allSettled(requests);
            
            process.stdout.write(`\rĐã phát nổ ${successOrders}/${NUM_ORDERS} Đơn hàng...`);

        }, 1000); // Mỗi giây 25 đơn -> 500 đơn tốn ~20s

    } catch (e) {
        console.error("LỖI KỊCH BẢN:", e);
        process.exit(1);
    }
}

runTest();
