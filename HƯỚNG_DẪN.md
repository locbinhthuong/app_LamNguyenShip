# 📋 HƯỚNG DẪN CHI TIẾT - LamNguyenShip

## Mục lục
1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt MongoDB](#2-cài-đặt-mongodb)
3. [Cài đặt project](#3-cài-đặt-project)
4. [Chạy ứng dụng](#4-chạy-ứng-dụng)
5. [Test API](#5-test-api)
6. [Cấu hình cho Zalo Mini App](#6-cấu-hình-cho-zalo-mini-app)
7. [Deploy lên production](#7-deploy-lên-production)

---

## 1. Yêu Cầu Hệ Thống

### Bắt buộc:
- **Node.js** version 18.0 trở lên
- **npm** version 8.0 trở lên
- **MongoDB** (local hoặc Atlas)

### Kiểm tra:
```bash
node --version    # v18.x.x trở lên
npm --version     # 8.x.x trở lên
```

---

## 2. Cài Đặt MongoDB

### Cách 1: MongoDB Local

#### Windows:
1. Download MongoDB Community Server từ: https://www.mongodb.com/try/download/community
2. Chọn version: `Windows x64`
3. Cài đặt mặc định
4. Tạo thư mục `C:\data\db`
5. Chạy MongoDB service:
```bash
mongod --dbpath C:\data\db
```

#### macOS:
```bash
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu):
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
```

### Cách 2: MongoDB Atlas (Cloud - Khuyến nghị)

1. Truy cập: https://www.mongodb.com/atlas
2. Đăng ký tài khoản miễn phí
3. Tạo Free Cluster:
   - Chọn region: Singapore (gần Việt Nam nhất)
   - Cluster Tier: Free (M0 Sandbox)
4. Tạo Database User:
   - Username: `lamnguyen`
   - Password: `your_password`
5. Whitelist IP: `0.0.0.0/0` (cho phép truy cập từ mọi IP)
6. Lấy Connection String:
```env
mongodb+srv://lamnguyen:your_password@cluster.mongodb.net/lamnguyenship
```

---

## 3. Cài Đặt Project

### Bước 3.1: Clone/Download Project

```bash
cd "c:\Users\Tan Loc\Downloads"
# Nếu chưa có project, tải về giải nén
```

### Bước 3.2: Cài đặt Backend Dependencies

```bash
cd "c:\Users\Tan Loc\Downloads\app_LamNguyenShip\backend"
npm install
```

### Bước 3.3: Cài đặt Frontend Dependencies

```bash
cd "c:\Users\Tan Loc\Downloads\app_LamNguyenShip\frontend"
npm install
```

---

## 4. Chạy Ứng Dụng

### Bước 4.1: Cấu hình Environment Variables

#### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/lamnguyenship
CLIENT_URL=http://localhost:5173
```
Nếu dùng MongoDB Atlas, thay `MONGO_URI` bằng connection string của bạn.

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

### Bước 4.2: Chạy Backend

Mở terminal 1:
```bash
cd "c:\Users\Tan Loc\Downloads\app_LamNguyenShip\backend"
npm run dev
```

Kết quả mong đợi:
```
✅ Kết nối MongoDB thành công!

╔═══════════════════════════════════════════════════╗
║   🚀 LamNguyenShip Backend Server                ║
║   ✅ Server running on port: 5000                ║
║   🌐 API URL: http://localhost:5000              ║
║   📊 Health: http://localhost:5000/api/health    ║
║   📡 Socket.IO: Enabled                          ║
║   🗄️  MongoDB: Connected                        ║
╚═══════════════════════════════════════════════════╝
```

### Bước 4.3: Chạy Frontend

Mở terminal 2:
```bash
cd "c:\Users\Tan Loc\Downloads\app_LamNguyenShip\frontend"
npm run dev
```

Kết quả mong đợi:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Bước 4.4: Tạo Dữ Liệu Mẫu (Tùy chọn)

Mở terminal 3:
```bash
cd "c:\Users\Tan Loc\Downloads\app_LamNguyenShip\backend"
npm run seed
```

Kết quả mong đợi:
```
🔄 Đang kết nối MongoDB...
✅ Kết nối MongoDB thành công!
🗑️  Đang xóa dữ liệu cũ...
✅ Đã xóa dữ liệu cũ!
📝 Đang thêm dữ liệu mẫu...
✅ Đã thêm dữ liệu mẫu!
📊 Tổng số đơn hàng: 5
🎉 Seed database thành công!
```

### Bước 4.5: Truy Cập Ứng Dụng

Mở trình duyệt:
- **Shipper Dashboard**: http://localhost:5173
- **Admin Panel**: http://localhost:5173/admin

---

## 5. Test API

### Test bằng curl

#### Health Check
```bash
curl http://localhost:5000/api/health
```

#### Lấy danh sách đơn hàng
```bash
curl http://localhost:5000/api/orders
```

#### Tạo đơn hàng mới
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerPhone": "0909123456",
    "pickupAddress": "123 Test St",
    "deliveryAddress": "456 Demo Ave",
    "items": ["1x Item A", "2x Item B"],
    "note": "Test order"
  }'
```

#### Nhận đơn hàng
```bash
curl -X POST http://localhost:5000/api/orders/<ORDER_ID>/accept \
  -H "Content-Type: application/json" \
  -d '{"shipperId": "shipper_001"}'
```

#### Hoàn thành đơn hàng
```bash
curl -X POST http://localhost:5000/api/orders/<ORDER_ID>/complete \
  -H "Content-Type: application/json" \
  -d '{"shipperId": "shipper_001"}'
```

### Test bằng Postman

1. Download Postman: https://www.postman.com/downloads/
2. Tạo Collection mới: `LamNguyenShip`
3. Thêm requests theo API Endpoints

---

## 6. Cấu Hình Cho Zalo Mini App

### Bước 6.1: Đăng ký Zalo Developer

1. Truy cập: https://developers.zalo.me
2. Đăng nhập bằng tài khoản Zalo
3. Xác minh danh tính (cần CCCD)

### Bước 6.2: Tạo Mini App

1. Vào **"My Apps"** → **"Create App"**
2. Chọn loại: **"Mini App"**
3. Điền thông tin:
   - App Name: `LamNguyenShip`
   - Description: App shipper giao hàng
   - Category: Delivery/Transportation
4. Nhận **App ID**

### Bước 6.3: Cập nhật Frontend

Cập nhật `frontend/vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'YOUR_BACKEND_URL', // URL backend production
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
```

### Bước 6.4: Build Frontend

```bash
cd frontend
npm run build
```

Output: `frontend/dist/`

### Bước 6.5: Deploy lên Zalo

1. Upload code lên Zalo Dev Center
2. Submit review
3. Sau khi approved (1-3 ngày), app sẽ hoạt động

---

## 7. Deploy Lên Production

### Backend - Render.com (Miễn phí)

1. Đăng ký: https://render.com
2. Connect GitHub repo
3. Tạo Web Service:
   - Root Directory: `backend`
   - Build Command: (để trống)
   - Start Command: `npm start`
4. Thêm Environment Variables:
   - `MONGO_URI`: MongoDB connection string
   - `CLIENT_URL`: Frontend URL
5. Deploy!

### Frontend - Vercel (Miễn phí)

1. Đăng ký: https://vercel.com
2. Import GitHub repo
3. Framework: `Vite`
4. Root Directory: `frontend`
5. Environment Variables:
   - `VITE_API_URL`: Backend production URL
6. Deploy!

### MongoDB Atlas (Cloud)

1. Tạo cluster miễn phí
2. Lấy connection string
3. Thêm vào Render environment variables

---

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi 1: MongoDB Connection Failed

```
Error: MongooseServerSelectionError
```

**Giải pháp:**
- Kiểm tra MongoDB đang chạy
- Kiểm tra `MONGO_URI` trong `.env`
- Nếu dùng Atlas, kiểm tra whitelist IP

### Lỗi 2: CORS Error

```
Access-Control-Allow-Origin blocked
```

**Giải pháp:**
- Kiểm tra `CLIENT_URL` trong backend `.env`
- Restart backend server

### Lỗi 3: Socket.IO Connection Failed

```
Socket.IO connect_error
```

**Giải pháp:**
- Kiểm tra backend đang chạy
- Kiểm tra API URL trong frontend `.env`

### Lỗi 4: Port Already in Use

```
Error: listen EADDRINUSE :::5000
```

**Giải pháp:**
- Tìm process đang dùng port:
```bash
netstat -ano | findstr :5000
# Kill process bằng PID
taskkill /PID <PID> /F
```

---

## 📞 Liên Hệ Hỗ Trợ

- Documentation: https://developers.zalo.me/docs/mini-app
- Zalo Business: https://business.zalo.me
- Hotline: 1900 1234
