# 🚚 LamNguyenShip - Zalo Mini App Shipper

## Mô Tả

Ứng dụng Shipper chạy trên nền tảng Zalo Mini App, giúp shipper nhận đơn realtime và quản lý đơn hàng giao hàng. Được thiết kế cho **kinh doanh thực sự** với cấu hình production-ready.

---

## Tech Stack

### Frontend
- **ReactJS** (Vite)
- **TailwindCSS**
- **Axios**
- **Socket.IO Client**

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **Socket.IO**
- **Helmet** (Security)
- **Rate Limiting**
- **Winston** (Logging)

---

## Tính Năng

### Shipper (Trang chủ)
- Xem danh sách đơn hàng PENDING
- Nhận đơn hàng (button "Nhận đơn")
- Hoàn thành đơn hàng (button "Hoàn thành")
- Gọi điện cho khách hàng
- Auto update realtime qua Socket.IO
- Filter đơn hàng theo trạng thái
- Thông báo toast khi có đơn mới

### Admin (Trang Admin)
- Tạo đơn hàng mới
- Xem danh sách tất cả đơn hàng
- Real-time khi có đơn mới

### Realtime Events
- `new_order` - Có đơn mới được tạo
- `order_taken` - Có đơn được nhận
- `order_done` - Có đơn hoàn thành
- `order_cancelled` - Có đơn bị hủy

---

## API Endpoints

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/api/orders` | Lay danh sach don hang |
| GET | `/api/orders/:id` | Lay chi tiet don hang |
| GET | `/api/orders/stats/summary` | Thong ke tong quan |
| POST | `/api/orders` | Tao don hang moi |
| POST | `/api/orders/:id/accept` | Nhan don hang |
| POST | `/api/orders/:id/complete` | Hoan thanh don hang |
| POST | `/api/orders/:id/cancel` | Huy don hang |
| POST | `/api/orders/:id/rate` | Danh gia don hang |
| DELETE | `/api/orders/:id` | Xoa don hang |
| GET | `/api/health` | Health check |

---

## Cau Truc Project

```
app_LamNguyenShip/
├── backend/
│   ├── models/Order.js              # Schema don hang
│   ├── controllers/orderController.js # Logic xu ly
│   ├── routes/orderRoutes.js        # API routes
│   ├── sockets/orderSocket.js        # Socket.IO handlers
│   ├── .env                         # Environment variables
│   ├── package.json
│   ├── seed.js                      # Script tao du lieu mau
│   └── server.js                     # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Trang Shipper
│   │   │   └── Admin.jsx           # Trang Admin
│   │   ├── components/
│   │   │   └── OrderCard.jsx       # Component don hang
│   │   ├── services/
│   │   │   └── api.js              # API + Socket.IO
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── .env.development
│   ├── .env.production
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── START.bat                        # Script chay nhanh
├── README.md
├── HUONG_DAN.md                    # Huong dan chi tiet
└── DEPLOY.md                       # Huong dan deploy
```

---

## Chay Ung Dung

### Cach 1: Su dung START.bat (De nhat)

```bash
# Di chuyen den thu muc project
cd "c:\Users\Tan Loc\Downloads\app_LamNguyenShip"

# Chay script
START.bat
```

### Cach 2: Manual

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Seed Data (Optional)
```bash
cd backend
npm run seed
```

---

## Truy Cap

- **Shipper**: http://localhost:5173
- **Admin**: http://localhost:5173/admin
- **API**: http://localhost:5000/api/health

---

## Cau Hinh MongoDB

### Buoc 1: Tao MongoDB Atlas
1. Truy cap https://www.mongodb.com/atlas
2. Dang ky tai khoan mien phi
3. Tao Free Cluster (Singapore region)
4. Connect > Connect your application
5. Copy connection string

### Buoc 2: Cap Nhat .env
```env
# backend/.env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lamnguyenship
CLIENT_URL=http://localhost:5173
```

---

## Deploy Len Production

Xem chi tiet trong file `DEPLOY.md`

### Tom tat:
- **Backend**: Render.com (Free)
- **Frontend**: Vercel (Free)
- **Database**: MongoDB Atlas (Free tier)

---

## Bao Mat

- Helmet.js cho HTTP headers
- Rate Limiting (500 req/15 phut)
- CORS protection
- Input validation
- Graceful shutdown
- Winston logging

---

## License

MIT License
