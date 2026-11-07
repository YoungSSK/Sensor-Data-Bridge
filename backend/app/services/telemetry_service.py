from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.telemetry import TelemetryRecord
from app.schemas.telemetry import TelemetryIngestData, TelemetryV1


class TelemetryService:
    @staticmethod
    def ingest(
        db: Session,
        device: Device,
        payload: TelemetryV1,
    ) -> tuple[TelemetryIngestData, bool]:
        """
        Ingest telemetry payload from an authenticated device.
        Enforces time windows, metrics revision matching, and idempotency.

        Returns:
            (data, is_created)
        """
        received_at = datetime.now(timezone.utc)

        # 1. Validate time window for synced readings (within 24h past and 5m future)
        try:
            payload.validate_received_at(received_at)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Time validation error: {err}",
            )

        # 2. Check metrics revision matches the device's assigned revision
        if payload.metrics_revision != device.metrics_revision:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"Metrics revision mismatch: device expects revision {device.metrics_revision}, "
                    f"but telemetry payload contains revision {payload.metrics_revision}."
                ),
            )

        calculated_hash = payload.payload_hash()
        message_id_str = str(payload.message_id)

        # 3. Idempotency check: see if (device_id, message_id) already exists
        stmt = select(TelemetryRecord).where(
            TelemetryRecord.device_id == device.id,
            TelemetryRecord.message_id == message_id_str,
        )
        existing = db.execute(stmt).scalar_one_or_none()

        if existing is not None:
            # Check payload content equality via hash
            if existing.payload_hash != calculated_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Message ID already exists with different payload content.",
                )
            # Duplicate idempotent retry: return existing record timestamp with duplicate=True
            rec_time = existing.received_at
            if rec_time.tzinfo is None:
                rec_time = rec_time.replace(tzinfo=timezone.utc)

            return TelemetryIngestData(
                message_id=payload.message_id,
                accepted=True,
                duplicate=True,
                received_at=rec_time,
            ), False

        # 4. Insert new telemetry record
        effective_at = payload.effective_at(received_at)
        new_record = TelemetryRecord(
            device_id=device.id,
            message_id=message_id_str,
            measured_at=payload.measured_at,
            received_at=received_at,
            effective_at=effective_at,
            time_quality=payload.time_quality,
            metrics_revision=payload.metrics_revision,
            calibration_revision=payload.calibration_revision,
            firmware_version=payload.firmware_version,
            uptime_ms=payload.uptime_ms,
            values_json=payload.values,
            quality_json=payload.quality,
            payload_hash=calculated_hash,
        )

        try:
            db.add(new_record)
            device.last_seen_at = received_at
            db.commit()
            db.refresh(new_record)
        except IntegrityError:
            db.rollback()
            # Handle potential concurrent race condition for the same message_id
            concurrent_existing = db.execute(stmt).scalar_one_or_none()
            if concurrent_existing and concurrent_existing.payload_hash == calculated_hash:
                rec_time = concurrent_existing.received_at
                if rec_time.tzinfo is None:
                    rec_time = rec_time.replace(tzinfo=timezone.utc)
                return TelemetryIngestData(
                    message_id=payload.message_id,
                    accepted=True,
                    duplicate=True,
                    received_at=rec_time,
                ), False
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Concurrent conflict: message ID already processed with different content.",
            )

        return TelemetryIngestData(
            message_id=payload.message_id,
            accepted=True,
            duplicate=False,
            received_at=received_at,
        ), True
