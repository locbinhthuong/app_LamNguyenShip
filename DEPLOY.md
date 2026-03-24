# Deploy LamNguyenShip - Production

## 1. Deploy Backend lên Render (Free)

### Bước 1: Tạo tài khoản Render
1. Truy cập https://render.com
2. Đăng ký với GitHub
3. Connect repository chứa code backend

### Bước 2: Tạo Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository
3. Cấu hình:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### Bước 3: Thêm Environment Variables
Click **"Environment"** và thêm:

```
NODE_ENV = production
PORT = 10000
MONGO_URI = mongodb+srv://username:password@cluster.mongodb.net/lamnguyenship?retryWrites=true&w=majority
CLIENT_URL = https://your-frontend.vercel.app
```

> **Lưu ý**: PORT trên Render thường là `10000`, không phải `5000`

### Bước 4: Deploy
- Click **"Create Web Service"**
- Đợi deploy (3-5 phút)
- Copy URL backend (ví dụ: `https://lamnguyenship.onrender.com`)

---

## 2. Deploy Frontend lên Vercel (Free)

### Bước 1: Chuẩn bị Repository
1. Push code lên GitHub
2. Tạo repository `lamnguyenship-frontend`

### Bước 2: Tạo Project trên Vercel
1. Truy cập https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import repository từ GitHub
4. Cấu hình:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (hoặc `frontend` nếu chứa trong repo cha)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Bước 3: Thêm Environment Variables
Click **"Environment Variables"** và thêm:

```
VITE_API_URL = https://lamnguyenship.onrender.com
VITE_APP_NAME = LamNguyenShip
VITE_APP_VERSION = 1.0.0
```

### Bước 4: Deploy
- Click **"Deploy"**
- Đợi deploy (1-2 phút)
- Copy URL frontend (ví dụ: `https://lamnguyenship.vercel.app`)

### Bước 5: Cập nhật Backend
Quay lại Render, cập nhật `CLIENT_URL`:
```
CLIENT_URL = https://lamnguyenship.vercel.app
```

---

## 3. Cấu hình Zalo Mini App

### Bước 1: Cập nhật Zalo Developer
1. Truy cập https://developers.zalo.me
2. Chọn Mini App của bạn
3. Cập nhật **App URL** = URL Vercel của bạn

### Bước 2: Cập nhật Vite Config
```javascript
// frontend/vite.config.js
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://lamnguyenship.onrender.com',
        changeOrigin: true,
        secure: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

---

## 4. Cập nhật Files sau Deploy

### backend/.env.production
```env
PORT=10000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lamnguyenship
CLIENT_URL=https://lamnguyenship.vercel.app
```

### frontend/.env.production
```env
VITE_API_URL=https://lamnguyenship.onrender.com
VITE_APP_NAME=LamNguyenShip
VITE_SOCKET_URL=https://lamnguyenship.onrender.com
```

---

## 5. Kiểm tra sau Deploy

Sau khi deploy xong, kiểm tra:

### Health Check Backend
```
https://lamnguyenship.onrender.com/api/health
```

### Kiểm tra Response
```json
{
  "success": true,
  "message": "LamNguyenShip API đang hoạt động",
  "version": "1.0.0",
  "mongodb": "Connected"
}
```

---

## 6. Custom Domain (Tùy chọn)

### Vercel
1. Project Settings → Domains
2. Thêm domain (ví dụ: `app.lamnguyenship.com`)
3. Cập nhật DNS records

### Render
1. Settings → Custom Domain
2. Thêm domain
3. Cập nhật DNS

---

## 7. Monitoring & Logs

### Render
- Dashboard → Web Service → Logs
- Xem real-time logs
- Cài đặt alerts

### Vercel
- Dashboard → Project → Logs
- Xem deployment logs
- Cài đặt notifications

---

## 8. Backup & Security

### MongoDB Atlas
- Backup tự động (Free tier có backup hàng ngày)
- Kích hoạt 2FA cho tài khoản
- Whitelist IP cụ thể thay vì `0.0.0.0/0`

### Backend
- Không commit `.env` lên GitHub
- Sử dụng Environment Variables trên Render
- Bật Rate Limiting (đã cấu hình sẵn)

---

## 9. Scaling (Khi cần)

### Khi traffic tăng
1. **Render**: Upgrade từ Free → Paid plan ($7/tháng)
2. **MongoDB**: Upgrade M0 → M10 ($29/tháng)
3. **Vercel**: Pro plan ($20/tháng) cho nhiều bandwidth

### Tối ưu
- Bật Caching
- Sử dụng CDN
- Tối ưu database indexes
- Sử dụng Redis cho session/cache

---

## Liên hệ Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Zalo Mini App: https://developers.zalo.me/docs/mini-app
