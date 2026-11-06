# 🌐 Sensor-Data-Bridge (Fullstack IoT Platform)

Hệ thống quản lý, giám sát và thu thập dữ liệu cảm biến IoT thời gian thực gồm 2 phần riêng biệt:
- **Backend**: API RESTful hiệu năng cao xây dựng bằng **FastAPI** (Python 3.12).
- **Frontend**: Dashboard trực quan theo dõi cảm biến xây dựng bằng **React + Vite**.

---

## 📁 Cấu trúc dự án tổng thể

```text
Sensor-Data-Bridge/
├── backend/                      # Dịch vụ Backend (FastAPI)
│   ├── app/
│   │   ├── api/v1/               # Router & Endpoints (/health, /sensors/readings)
│   │   ├── core/                 # Cấu hình biến môi trường (Pydantic BaseSettings)
│   │   ├── models/               # Data models / thực thể
│   │   ├── schemas/              # Pydantic schemas kiểm tra tính hợp lệ dữ liệu
│   │   ├── services/             # Xử lý logic nghiệp vụ
│   │   └── main.py               # Điểm khởi chạy FastAPI & Middleware
│   ├── tests/
│   │   └── test_main.py          # Pytest test cases
│   ├── .env.example              # Mẫu biến môi trường cho Backend
│   ├── pytest.ini                # Cấu hình pytest
│   └── requirements.txt          # Danh sách thư viện Python
│
├── frontend/                     # Ứng dụng Frontend (React + Vite)
│   ├── public/                   # Tài nguyên tĩnh
│   ├── src/
│   │   ├── components/           # Component UI (SensorCard, IngestModal)
│   │   ├── services/             # Module kết nối API Backend
│   │   ├── styles/               # CSS định dạng giao diện
│   │   ├── App.jsx               # Dashboard chính
│   │   └── main.jsx              # Khởi tạo React
│   ├── .env.example              # Mẫu biến môi trường cho Frontend
│   ├── package.json              # Scripts & Dependencies Node.js
│   └── vite.config.js            # Cấu hình Vite & Proxy dev
│
├── .github/
│   └── workflows/
│       └── ci.yml                # CI/CD GitHub Actions test cả Backend & Frontend
├── .gitignore                    # Loại bỏ .venv, node_modules, .env, dist khỏi git
└── README.md                     # Tài liệu hướng dẫn sử dụng
```

---

## 🚀 Hướng dẫn khởi chạy dự án

### 1. Khởi chạy Backend (FastAPI)
Mở cửa sổ terminal:
```powershell
cd backend
..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
- **API Root:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger Interactive Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

Chạy kiểm thử:
```powershell
pytest
```

---

### 2. Khởi chạy Frontend (React + Vite)
Mở một cửa sổ terminal khác:
```powershell
cd frontend
npm install
npm run dev
```
- **Truy cập Dashboard:** [http://localhost:3000](http://localhost:3000)

---

## 📡 API Endpoints chính

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Thông tin root và đường dẫn docs |
| `GET` | `/api/v1/health` | Kiểm tra trạng thái hệ thống |
| `POST` | `/api/v1/sensors/readings` | Đẩy dữ liệu cảm biến mới lên (ESP32/IoT) |
| `GET` | `/api/v1/sensors/readings` | Lấy danh sách số liệu cảm biến gần nhất |
| `GET` | `/api/v1/sensors/readings/{sensor_id}` | Lọc số liệu theo mã cảm biến |

---

## 📤 Đẩy lên GitHub

```powershell
cd Sensor-Data-Bridge
git status
git add .
git commit -m "feat: setup fullstack FastAPI backend and React frontend"
git push -u origin main
```
