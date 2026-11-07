from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Pepper Nursery"])
    description: Optional[str] = Field(default=None, examples=["Hệ thống giám sát môi trường vườn ươm ớt"])
    current_metrics_revision: int = Field(default=1, ge=1)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str] = None
    current_metrics_revision: int
    created_at: datetime
    devices_count: Optional[int] = 0

    model_config = {"from_attributes": True}
