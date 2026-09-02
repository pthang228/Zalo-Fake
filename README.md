# ZaloFake — App điện thoại (React Native / Expo)

App di động kết nối tới [backend engine](../backend) qua REST + WebSocket. Giao diện kiểu
Zalo: danh sách chat, khung chat, cuộc gọi đến, thông báo, và **nhiều tài khoản**.

## Tính năng

- 🔐 Cấu hình backend (địa chỉ LAN + API token), lưu lại máy
- 👥 **Nhiều tài khoản Zalo** — thêm / chuyển đổi / đăng xuất
- ➕ Đăng nhập bằng **cookie** (ZaloDataExtractor) hoặc **QR**
- 💬 Danh sách hội thoại + số tin chưa đọc, cập nhật **realtime**
- ✉️ Khung chat: gửi tin, nhận realtime, tải tin cũ hơn
- 📞 Lịch sử cuộc gọi + **màn hình cuộc gọi đến** toàn màn hình
- 🔔 Thông báo cục bộ khi có tin nhắn / cuộc gọi

## Chạy app

```bash
cd app
npm install          # (đã cài sẵn nếu vừa scaffold)
npm start            # mở Expo Dev Tools
```

Rồi:
- **Điện thoại thật:** cài app **Expo Go**, quét QR hiện ra. Điện thoại phải **cùng WiFi** với máy chạy backend.
- **Android emulator:** `npm run android`
- **Web (xem thử nhanh):** `npm run web`

> ⚠️ Notification & một số API native chạy tốt nhất trên **Expo Go / bản build thật**, không đầy đủ trên web.

## Kết nối backend

1. Chạy backend trước (xem [../backend/README.md](../backend/README.md)).
2. Tìm IP LAN của máy chạy backend (vd `192.168.1.10`).
3. Mở app → màn hình **Setup** → nhập:
   - Địa chỉ: `http://192.168.1.10:8080` (KHÔNG dùng `localhost` trên điện thoại)
   - API Token: đúng `API_TOKEN` trong `backend/.env`
4. Bấm **Kết nối** → vào tab **Tài khoản** → **Thêm tài khoản Zalo**.

## Cấu trúc

```
app/
├─ App.tsx                     # Navigation + provider + overlay cuộc gọi đến
├─ src/
│  ├─ api/
│  │  ├─ client.ts             # REST client (Bearer token)
│  │  └─ ws.ts                 # WebSocket tự reconnect
│  ├─ state/
│  │  ├─ AppContext.tsx        # state toàn cục: settings, accounts, cuộc gọi
│  │  └─ storage.ts            # AsyncStorage
│  ├─ notify.ts                # thông báo cục bộ (expo-notifications)
│  ├─ screens/                 # Setup, Accounts, AddAccount, Threads, Chat, Calls
│  ├─ components/              # Avatar, ThreadItem, MessageBubble, IncomingCallModal
│  ├─ theme.ts
│  └─ types.ts                 # kiểu khớp backend
```

## Giới hạn (đọc kỹ)

- **Cuộc gọi:** app hiện màn hình + thông báo cuộc gọi đến, nhưng **không nghe/gọi audio thật** (giới hạn Zalo).
- **Lịch sử:** chỉ kéo được **một phần** tin cũ; tin từ lúc chạy trở đi thì đầy đủ.
- Xem chi tiết ràng buộc kỹ thuật ở [../backend/README.md](../backend/README.md).
