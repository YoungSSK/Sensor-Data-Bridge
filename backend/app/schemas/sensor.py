from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class SensorReading(BaseModel):
    sensor_id: str = Field(..., description="Unique identifier for the sensor device", examples=["ESP32_TEMP_01"])
    sensor_type: str = Field(..., description="Type of sensor (e.g. temperature, humidity, pressure)", examples=["dht22"])
    value: float = Field(..., description="Measured numeric value", examples=[28.5])
    unit: str = Field(..., description="Measurement unit", examples=["°C"])
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the reading was recorded in UTC"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional context or telemetry metadata"
    )


class SensorReadingResponse(BaseModel):
    status: str = "success"
    message: str = "Data recorded successfully"
    data: SensorReading
