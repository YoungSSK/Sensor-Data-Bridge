from pathlib import Path

import pymysql
from pymysql.connections import Connection

from app.core.config import BACKEND_DIR, settings


def get_connection() -> Connection:
    required = {
        "MYSQL_HOST": settings.MYSQL_HOST,
        "MYSQL_PORT": settings.MYSQL_PORT,
        "MYSQL_DATABASE": settings.MYSQL_DATABASE,
        "MYSQL_USER": settings.MYSQL_USER,
        "MYSQL_SSL_CA": settings.MYSQL_SSL_CA,
    }
    missing = [name for name, value in required.items() if not value]
    if settings.MYSQL_PASSWORD is None or not settings.MYSQL_PASSWORD.get_secret_value():
        missing.append("MYSQL_PASSWORD")
    if missing:
        raise RuntimeError(f"Missing database settings: {', '.join(missing)}")

    ca_path = Path(settings.MYSQL_SSL_CA).expanduser()
    if not ca_path.is_absolute():
        ca_path = BACKEND_DIR / ca_path
    if not ca_path.is_file():
        raise RuntimeError("MYSQL_SSL_CA must point to a readable CA certificate file")

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
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    finally:
        connection.close()
