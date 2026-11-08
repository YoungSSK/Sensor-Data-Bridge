# Sensor Data Bridge Frontend

React + Vite frontend cho MVP Channel của Sensor Data Bridge.

## Màn hình hiện có

- `/login` và `/register`: đăng nhập/đăng ký bằng email và mật khẩu.
- `/channels`: danh sách Channel và tạo Channel mới.
- `/channels/:channelId/private_show`: Private View, số bản ghi và biểu đồ riêng cho từng field.
- Trong Private View, nút **Quản lý field** cho phép thêm, sửa tên/đơn vị và xóa field sau khi tạo Channel. Key `field1`–`field8` được cấp tự động.
- `/channels/:channelId/api_keys`: tạo/thu hồi Read/Write API Key; chủ Channel có thể sao chép lại key còn hoạt động.

Frontend gọi backend qua `/api/v1`. Khi chạy local, Vite proxy request `/api` tới `http://127.0.0.1:8000`; có thể ghi đè bằng `VITE_API_BASE_URL` khi deploy.

## Chạy cục bộ

```powershell
npm ci
npm run dev
```

Mở `http://localhost:5173`. Backend cần chạy trước tại `http://127.0.0.1:8000`.

## Kiểm tra build

```powershell
npm run build
```

Các component và view cũ cho `projects/devices/telemetry` vẫn được giữ trong source để phục vụ giai đoạn chuyển tiếp, nhưng luồng mặc định hiện tại là Channel MVP.
