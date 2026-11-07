from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PK_BIGINT


class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id: Mapped[int] = mapped_column(PK_BIGINT, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(
        PK_BIGINT, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message_id: Mapped[str] = mapped_column(String(36), nullable=False)
    measured_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    effective_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    time_quality: Mapped[str] = mapped_column(String(16), nullable=False)
    metrics_revision: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    calibration_revision: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    firmware_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    uptime_ms: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0, server_default="0"
    )
    values_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    quality_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    device: Mapped["Device"] = relationship("Device", back_populates="telemetry_records")

    __table_args__ = (
        UniqueConstraint("device_id", "message_id", name="uq_telemetry_device_message"),
        Index("idx_telemetry_history", "device_id", "effective_at", "id"),
        Index("idx_telemetry_received", "received_at", "id"),
    )

    def __repr__(self) -> str:
        return f"<TelemetryRecord id={self.id} device_id={self.device_id} message_id={self.message_id}>"
