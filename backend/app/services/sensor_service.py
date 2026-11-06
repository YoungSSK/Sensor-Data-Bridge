import json
from datetime import datetime, timezone

from app.core.database import get_connection
from app.schemas.sensor import SensorReading


def _from_row(row: dict) -> SensorReading:
    recorded_at = row["recorded_at"].replace(tzinfo=timezone.utc)
    metadata = row["metadata_json"]
    return SensorReading(
        sensor_id=row["sensor_id"],
        sensor_type=row["sensor_type"],
        value=row["value"],
        unit=row["unit"],
        timestamp=recorded_at,
        metadata=json.loads(metadata) if metadata is not None else None,
    )


class SensorService:
    @staticmethod
    def add_reading(reading: SensorReading) -> SensorReading:
        timestamp = reading.timestamp
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        timestamp = timestamp.astimezone(timezone.utc)

        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO sensor_readings
                        (sensor_id, sensor_type, value, unit, recorded_at, metadata_json)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        reading.sensor_id,
                        reading.sensor_type,
                        reading.value,
                        reading.unit,
                        timestamp.replace(tzinfo=None),
                        json.dumps(reading.metadata, ensure_ascii=False)
                        if reading.metadata is not None else None,
                    ),
                )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
        return reading.model_copy(update={"timestamp": timestamp})

    @staticmethod
    def get_recent_readings(limit: int = 50) -> list[SensorReading]:
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT sensor_id, sensor_type, value, unit, recorded_at, metadata_json
                    FROM sensor_readings ORDER BY id DESC LIMIT %s
                    """,
                    (limit,),
                )
                rows = cursor.fetchall()
        finally:
            connection.close()
        return [_from_row(row) for row in reversed(rows)]

    @staticmethod
    def get_by_sensor_id(sensor_id: str, limit: int = 50) -> list[SensorReading]:
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT sensor_id, sensor_type, value, unit, recorded_at, metadata_json
                    FROM sensor_readings
                    WHERE sensor_id = %s ORDER BY id DESC LIMIT %s
                    """,
                    (sensor_id, limit),
                )
                rows = cursor.fetchall()
        finally:
            connection.close()
        return [_from_row(row) for row in reversed(rows)]
