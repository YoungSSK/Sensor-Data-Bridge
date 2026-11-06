from typing import List, Optional
from app.schemas.sensor import SensorReading

# In-memory storage or interface to Database/Timeseries
_sensor_store: List[SensorReading] = []


class SensorService:
    @staticmethod
    def add_reading(reading: SensorReading) -> SensorReading:
        _sensor_store.append(reading)
        return reading

    @staticmethod
    def get_recent_readings(limit: int = 50) -> List[SensorReading]:
        return _sensor_store[-limit:]

    @staticmethod
    def get_by_sensor_id(sensor_id: str) -> List[SensorReading]:
        return [r for r in _sensor_store if r.sensor_id == sensor_id]
