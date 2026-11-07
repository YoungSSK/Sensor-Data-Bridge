import math
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


FIELD_KEY_PATTERN = r"^field[1-8]$"


class ChannelFieldCreate(BaseModel):
    key: str = Field(..., pattern=FIELD_KEY_PATTERN, examples=["field1"])
    name: str = Field(..., min_length=1, max_length=100, examples=["Nhiệt độ không khí"])
    unit: Optional[str] = Field(default=None, max_length=32, examples=["°C"])

    @field_validator("key", "name", "unit", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


class ChannelFieldResponse(ChannelFieldCreate):
    id: int
    channel_id: int
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Vườn ươm ớt"])
    description: Optional[str] = Field(default=None, max_length=1000)
    fields: List[ChannelFieldCreate] = Field(default_factory=list, max_length=8)

    @field_validator("name", "description", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    fields: Optional[List[ChannelFieldCreate]] = Field(default=None, max_length=8)

    @field_validator("name", "description", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


class ChannelResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str] = None
    fields: List[ChannelFieldResponse] = Field(default_factory=list)
    entries: int = 0
    latest_received_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ApiKeyCreate(BaseModel):
    type: str = Field(
        ...,
        pattern=r"^(read|write)$",
        examples=["write"],
        validation_alias=AliasChoices("type", "key_type"),
        serialization_alias="type",
    )
    name: str = Field(default="Default key", min_length=1, max_length=100)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


class ApiKeyResponse(BaseModel):
    id: int
    channel_id: int
    type: str
    name: str
    key_prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    key: Optional[str] = Field(default=None, description="Secret returned for an active key owned by the authenticated user")
    raw_key: Optional[str] = Field(default=None, description="Alias of key for ESP32 setup")

    @classmethod
    def from_model(cls, api_key: Any, raw_key: Optional[str] = None) -> "ApiKeyResponse":
        return cls(
            id=api_key.id,
            channel_id=api_key.channel_id,
            type=api_key.key_type,
            name=api_key.name,
            key_prefix=api_key.key_prefix,
            created_at=api_key.created_at,
            last_used_at=api_key.last_used_at,
            revoked_at=api_key.revoked_at,
            key=raw_key,
            raw_key=raw_key,
        )


class FeedIngestRequest(BaseModel):
    """Accept raw field1/field2 JSON and also a wrapped {values: {...}} form."""

    model_config = ConfigDict(extra="allow")

    values: Optional[Dict[str, Any]] = None

    def as_values(self) -> Dict[str, Any]:
        extra_values = dict(self.model_extra or {})
        if self.values is not None:
            if extra_values:
                raise ValueError("Use either top-level field values or a values object, not both")
            return dict(self.values)
        return extra_values


class ChannelFeedResponse(BaseModel):
    id: int
    channel_id: int
    values: Dict[str, float]
    received_at: datetime


class ChannelFeedListResponse(BaseModel):
    channel_id: int
    total: int
    feeds: List[ChannelFeedResponse]


class PrivateShowResponse(BaseModel):
    channel: ChannelResponse
    fields: List[ChannelFieldResponse]
    entries: int
    latest_received_at: Optional[datetime] = None
    feeds: List[ChannelFeedResponse]
