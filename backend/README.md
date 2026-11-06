# Backend FastAPI

Backend nhận và truy vấn số đo cảm biến qua MySQL trên Aiven. Các endpoint hiện tại nằm dưới `/api/v1`; tài liệu tương tác tại `/docs`.

## Cấu hình

Sao chép `.env.example` thành `.env` rồi điền thông tin của dịch vụ Aiven:

| Biến | Ý nghĩa |
| --- | --- |
| `MYSQL_HOST` | Host MySQL của Aiven |
| `MYSQL_PORT` | Port MySQL của Aiven |
| `MYSQL_DATABASE` | Database đã được tạo trên Aiven |
| `MYSQL_USER` | Tài khoản MySQL |
| `MYSQL_PASSWORD` | Mật khẩu tài khoản MySQL |
| `MYSQL_SSL_CA` | Đường dẫn tệp CA để xác minh TLS; đường dẫn tương đối tính từ `backend/` |

Ứng dụng cần đủ cả sáu biến trên và tệp CA. Khi khởi động, backend chạy `CREATE TABLE IF NOT EXISTS` cho bảng `sensor_readings`, nên tài khoản MySQL cần quyền `CREATE` khi khởi động, cùng quyền `INSERT` và `SELECT` để phục vụ API. Hiện chưa có migration cho thay đổi schema.

## Chạy cục bộ

Từ thư mục gốc repository, dùng PowerShell:

```powershell
py -3.13 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Truy cập `http://127.0.0.1:8000/docs` để thử API và `http://127.0.0.1:8000/api/v1/health` để kiểm tra MySQL. Backend sẽ không khởi động nếu thiếu cấu hình hoặc không kết nối được Aiven. Dữ liệu đo được ghi bền vững; khởi động lại backend không xóa dữ liệu.

## Kiểm thử

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest
```

Các kiểm thử tự động dùng dữ liệu giả để không ghi vào Aiven. API gửi/đọc số đo vẫn chưa có xác thực hoặc khóa thiết bị; chỉ dùng trong môi trường thử nghiệm có kiểm soát.
