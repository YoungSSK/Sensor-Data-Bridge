from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class DeviceLatestResponse(BaseModel):
    device_id: int
    device_code: str
    last_seen_at: Optional[datetime] = None
    effective_at: Optional[datetime] = None
    time_quality: Optional[str] = None
    metrics_revision: int
    values: Dict[str, Optional[float]] = {}
    quality: Dict[str, str] = {}
    calibration_revision: Optional[str] = None
    firmware_version: Optional[str] = None
    uptime_ms: int = 0


class TelemetryHistoryItem(BaseModel):
    id: int
    message_id: str
    measured_at: Optional[datetime] = None
    received_at: datetime
    effective_at: datetime
    time_quality: str
    metrics_revision: int
    calibration_revision: Optional[str] = None
    firmware_version: Optional[str] = None
    uptime_ms: int
    values: Dict[str, Optional[float]]
    quality: Dict[str, str]

    model_config = {"from_attributes": True}


class DeviceTelemetryHistoryResponse(BaseModel):
    device_id: int
    device_code: str
    total: int
    readings: List[TelemetryHistoryItem]
