# 🚀 Backend - FastAPI Service

FastAPI-powered RESTful API microservice for IoT sensor telemetry.

## Structure
```text
backend/
├── app/
│   ├── api/v1/         # Route endpoints & API routers
│   ├── core/           # Configuration & App settings
│   ├── models/         # Data models
│   ├── schemas/        # Pydantic schemas for validation
│   ├── services/       # Business logic / data access layer
│   └── main.py         # Entrypoint & FastAPI instance
├── tests/              # Pytest test cases
├── requirements.txt    # Python dependencies
├── pytest.ini          # Pytest configurations
└── .env.example        # Environment variables template
```

## Running Backend
```powershell
# From project root:
cd backend
..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
