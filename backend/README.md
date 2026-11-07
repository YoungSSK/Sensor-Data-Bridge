# Sensor Data Bridge Backend

FastAPI backend cho MVP Channel của Sensor Data Bridge. Backend dùng JWT cho tài khoản người dùng, MySQL/Aiven để lưu dữ liệu và API key theo từng Channel cho ESP32.

## Mô hình dữ liệu

- `users`: tài khoản email/mật khẩu đã băm.
- `channels`: Channel thuộc một user, có ID số tự tăng.
- `channel_fields`: cấu hình `field1` ... `field8`, gồm tên hiển thị và đơn vị.
- `api_keys`: khóa `read` hoặc `write`, lưu SHA-256 hash cùng secret đã mã hóa để chủ Channel có thể sao chép lại key còn hoạt động.
- `channel_feeds`: từng payload số đo cùng thời điểm backend nhận.

Các bảng cũ `projects/devices/telemetry_records` và API tương ứng vẫn được giữ để dashboard thử nghiệm hiện tại không bị gãy; luồng Channel là API chính của MVP mới.

## API MVP

Tất cả endpoint nằm dưới `/api/v1`.

| Nhóm | Endpoint | Quyền |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | JWT |
| Channel | `GET/POST /channels`, `GET/PATCH/DELETE /channels/{id}` | Chủ Channel |
| Field | `PUT /channels/{id}/fields` | Chủ Channel |
| API key | `GET/POST /channels/{id}/api_keys`, `DELETE /channels/{id}/api_keys/{key_id}` | Chủ Channel |
| Ghi feed | `POST /channels/{id}/feeds` | `X-API-Key: <WRITE_KEY>` |
| Đọc feed | `GET /channels/{id}/feeds` | Read key hoặc chủ Channel |
| Biểu đồ riêng | `GET /channels/{id}/private_show` | Chủ Channel |

Tạo Channel:

```json
{
  "name": "Vườn ươm ớt",
  "description": "Theo dõi môi trường",
  "fields": [
    {"key": "field1", "name": "Nhiệt độ không khí", "unit": "°C"},
    {"key": "field2", "name": "Độ ẩm không khí", "unit": "%"}
  ]
}
```

ESP32 gửi dữ liệu:

```http
POST /api/v1/channels/1/feeds
X-API-Key: sdb_write_...
Content-Type: application/json
```

```json
{
  "field1": 28.2,
  "field2": 42.5
}
```

Secret API key được trả về khi tạo và khi chủ Channel tải danh sách key còn hoạt động. Backend chỉ lưu secret ở dạng mã hóa; key đã thu hồi không được trả lại secret.

## Cấu hình và chạy

```powershell
py -3.13 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
Set-Location backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Điền các biến `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_SSL_CA` trong `backend/.env`. Tài liệu OpenAPI ở `http://127.0.0.1:8000/docs`.

`alembic upgrade head` là đường dẫn migration chính. Ứng dụng vẫn có bootstrap `create_all` khi triển khai mới để tránh khởi động thất bại trước migration đầu tiên.

## Kiểm thử

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest -q
```
