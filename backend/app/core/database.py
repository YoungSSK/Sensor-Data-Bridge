from pathlib import Path
from typing import Generator
from urllib.parse import quote_plus

import pymysql
from pymysql.connections import Connection
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import BACKEND_DIR, settings
from app.models import Base


def get_ca_path() -> Path:
    """Resolve and validate the CA certificate path for TLS connections."""
    if settings.MYSQL_SSL_CA:
        ca_path = Path(settings.MYSQL_SSL_CA).expanduser()
        if ca_path.is_file():
            return ca_path
        if not ca_path.is_absolute():
            rel_path = BACKEND_DIR / ca_path
            if rel_path.is_file():
                return rel_path
    fallback = BACKEND_DIR / "certs" / "aiven-ca.pem"
    if fallback.is_file():
        return fallback
    raise RuntimeError("MYSQL_SSL_CA must point to a readable CA certificate file")


def get_database_url_and_ssl() -> tuple[str, dict]:
    """Build SQLAlchemy database URL and connect_args with SSL settings."""
    user = quote_plus(settings.MYSQL_USER or "")
    pwd = quote_plus(settings.MYSQL_PASSWORD.get_secret_value() if settings.MYSQL_PASSWORD else "")
    host = settings.MYSQL_HOST or "127.0.0.1"
    port = settings.MYSQL_PORT or 3306
    db = settings.MYSQL_DATABASE or "defaultdb"

    url = f"mysql+pymysql://{user}:{pwd}@{host}:{port}/{db}?charset=utf8mb4"
    connect_args = {
        "ssl_ca": str(get_ca_path()),
        "ssl_verify_cert": True,
        "ssl_verify_identity": True,
    }
    return url, connect_args


db_url, ssl_args = get_database_url_and_ssl()
engine = create_engine(
    db_url,
    connect_args=ssl_args,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_connection() -> Connection:
    """Legacy direct PyMySQL connection for existing endpoints."""
    required = {
        "MYSQL_HOST": settings.MYSQL_HOST,
        "MYSQL_PORT": settings.MYSQL_PORT,
        "MYSQL_DATABASE": settings.MYSQL_DATABASE,
        "MYSQL_USER": settings.MYSQL_USER,
    }
    missing = [name for name, value in required.items() if not value]
    if settings.MYSQL_PASSWORD is None or not settings.MYSQL_PASSWORD.get_secret_value():
        missing.append("MYSQL_PASSWORD")
    if missing:
        raise RuntimeError(f"Missing database settings: {', '.join(missing)}")

    ca_path = get_ca_path()

    return pymysql.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        database=settings.MYSQL_DATABASE,
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD.get_secret_value(),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        ssl_ca=str(ca_path),
        ssl_verify_cert=True,
        ssl_verify_identity=True,
        connect_timeout=10,
        read_timeout=10,
        write_timeout=10,
        autocommit=False,
    )


def init_database() -> None:
    """Create tables for local/bootstrap deployments and preserve the legacy table."""
    # Alembic remains the canonical schema migration path. create_all is a no-op for
    # tables that already exist and lets a fresh deployment boot before first migration.
    Base.metadata.create_all(bind=engine)
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    sensor_id VARCHAR(191) NOT NULL,
                    sensor_type VARCHAR(100) NOT NULL,
                    value DOUBLE NOT NULL,
                    unit VARCHAR(32) NOT NULL,
                    recorded_at DATETIME(6) NOT NULL,
                    metadata_json JSON NULL,
                    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    INDEX idx_sensor_readings_sensor_id_id (sensor_id, id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        connection.commit()
    finally:
        connection.close()


def check_database() -> None:
    """Check database health."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    finally:
        connection.close()
