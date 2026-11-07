"""Version 1 device telemetry contract shared by the API and ESP32 client."""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


MetricKey = Annotated[str, StringConstraints(pattern=r"^[a-z0-9_]{1,40}$")]
FiniteValue = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Quality = Literal["valid", "uncalibrated", "sensor_error", "stale", "out_of_range"]
TimeQuality = Literal["synced", "unsynced"]


class TelemetryV1(BaseModel):
    """One atomic reading from a device; device identity comes from its token."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    metrics_revision: int = Field(ge=1)
    message_id: UUID
    measured_at: datetime | None
    time_quality: TimeQuality
    uptime_ms: int = Field(ge=0)
    values: dict[MetricKey, FiniteValue | None] = Field(
        min_length=1, json_schema_extra={"additionalProperties": False}
    )
    quality: dict[MetricKey, Quality] = Field(json_schema_extra={"additionalProperties": False})
    calibration_revision: str | None = Field(default=None, max_length=100)
    firmware_version: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def validate_reading(self) -> "TelemetryV1":
        if set(self.values) != set(self.quality):
            raise ValueError("quality must contain exactly the keys in values")
        for key, value in self.values.items():
            state = self.quality[key]
            if (state in ("valid", "out_of_range")) != (value is not None):
                raise ValueError(f"value and quality disagree for {key}")

        if self.time_quality == "synced":
            if self.measured_at is None or self.measured_at.utcoffset() != timedelta(0):
                raise ValueError("synced readings require a UTC measured_at")
            # Normalize equivalent UTC representations for stable hashes.
            self.measured_at = self.measured_at.astimezone(timezone.utc)
        elif self.measured_at is not None:
            raise ValueError("unsynced readings must have a null measured_at")
        return self

    def effective_at(self, received_at: datetime) -> datetime:
        """Time used by latest/history views; preserve time_quality separately."""
        return self.measured_at if self.measured_at is not None else received_at

    def validate_received_at(self, received_at: datetime) -> None:
        """Enforce the proposed 24-hour late and 5-minute future window."""
        if received_at.tzinfo is None or received_at.utcoffset() is None:
            raise ValueError("received_at must include a timezone")
        if self.measured_at is not None:
            if not received_at - timedelta(hours=24) <= self.measured_at <= received_at + timedelta(minutes=5):
                raise ValueError("measured_at is outside the accepted time window")

    def payload_hash(self) -> str:
        """Hash normalized business fields; JSON key order and whitespace do not matter."""
        payload = self.model_dump(mode="json")
        canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class TelemetryIngestData(BaseModel):
    message_id: UUID
    accepted: bool = True
    duplicate: bool = False
    received_at: datetime


class TelemetryIngestResponse(BaseModel):
    data: TelemetryIngestData
