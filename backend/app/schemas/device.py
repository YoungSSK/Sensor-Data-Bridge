from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DeviceTokenResponse(BaseModel):
    id: int
    token_prefix: str
    name: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    raw_token: Optional[str] = Field(
        default=None,
        description="The secret raw token, only presented once upon creation.",
    )

    model_config = {"from_attributes": True}


class DeviceCreate(BaseModel):
    device_code: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=64,
        examples=["ESP32_PEPPER_01"],
        description="Unique code for device. Auto-generated if not provided.",
    )
    name: str = Field(..., min_length=1, max_length=100, examples=["Trạm Ớt Vườn 1"])
    interval_seconds: int = Field(default=30, ge=1, le=86400)
    metrics_revision: int = Field(default=1, ge=1)


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    interval_seconds: Optional[int] = Field(default=None, ge=1, le=86400)
    status: Optional[str] = Field(default=None, pattern=r"^(active|inactive)$")


class DeviceResponse(BaseModel):
    id: int
    project_id: int
    device_code: str
    name: str
    status: str
    interval_seconds: int
    metrics_revision: int
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    token: Optional[DeviceTokenResponse] = None

    model_config = {"from_attributes": True}
