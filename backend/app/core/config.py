import json
from pathlib import Path
from typing import Any, List, Union

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "Sensor-Data-Bridge"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    SECRET_KEY: str = "sensor-data-bridge-dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days (10080 minutes)

    MYSQL_HOST: str | None = None
    MYSQL_PORT: int | None = None
    MYSQL_DATABASE: str | None = None
    MYSQL_USER: str | None = None
    MYSQL_PASSWORD: SecretStr | None = None
    MYSQL_SSL_CA: str | None = None

    # Cho phép nhận cả chuỗi '*' hoặc list JSON trên Render / Cloud
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            clean = v.strip()
            if clean == "*":
                return ["*"]
            if clean.startswith("[") and clean.endswith("]"):
                try:
                    return json.loads(clean)
                except Exception:
                    pass
            return [i.strip() for i in clean.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
