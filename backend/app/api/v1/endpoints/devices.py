from datetime import datetime, timedelta, timezone
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import generate_device_token
from app.models.device import Device, DeviceToken
from app.models.project import Project
from app.models.telemetry import TelemetryRecord
from app.models.user import User
from app.schemas.device import DeviceResponse, DeviceTokenResponse, DeviceUpdate
from app.schemas.device_telemetry import (
    DeviceLatestResponse,
    DeviceTelemetryHistoryResponse,
    TelemetryHistoryItem,
)

router = APIRouter()


VN_TZ = timezone(timedelta(hours=7))


def _to_vietnam_tz(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(VN_TZ)


def _get_user_device(device_id: int, current_user: User, db: Session) -> Device:
    """Helper to verify that a device exists and belongs to the authenticated user."""
    stmt = (
        select(Device)
        .join(Project, Project.id == Device.project_id)
        .where(Device.id == device_id, Project.owner_id == current_user.id)
    )
    device = db.execute(stmt).scalar_one_or_none()
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or access denied",
        )
    return device


@router.get(
    "/{device_id}",
    response_model=DeviceResponse,
    summary="Get Device Details",
)
def get_device(
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DeviceResponse:
    device = _get_user_device(device_id, current_user, db)
    res = DeviceResponse.model_validate(device)
    active_token = next((t for t in device.tokens if t.revoked_at is None), None)
    if active_token:
        res.token = DeviceTokenResponse.model_validate(active_token)
    return res


@router.get(
    "/{device_id}/tokens",
    response_model=List[DeviceTokenResponse],
    summary="List Device Tokens",
)
def list_device_tokens(
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[DeviceTokenResponse]:
    device = _get_user_device(device_id, current_user, db)
    stmt = (
        select(DeviceToken)
        .where(DeviceToken.device_id == device.id)
        .order_by(DeviceToken.created_at.desc())
    )
    tokens = db.execute(stmt).scalars().all()
    return [DeviceTokenResponse.model_validate(t) for t in tokens]


@router.patch(
    "/{device_id}",
    response_model=DeviceResponse,
    summary="Update Device",
)
def update_device(
    device_id: int,
    payload: DeviceUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DeviceResponse:
    device = _get_user_device(device_id, current_user, db)

    if payload.name is not None:
        device.name = payload.name.strip()
    if payload.interval_seconds is not None:
        device.interval_seconds = payload.interval_seconds
    if payload.status is not None:
        device.status = payload.status

    db.commit()
    db.refresh(device)
    return DeviceResponse.model_validate(device)


@router.post(
    "/{device_id}/tokens",
    response_model=DeviceTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue New Device Token",
    description="Generate a new API token for the device. The raw secret is returned only once.",
)
def issue_device_token(
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    name: str = "Secondary Token",
) -> DeviceTokenResponse:
    device = _get_user_device(device_id, current_user, db)

    raw_token, token_hash, token_prefix = generate_device_token()
    token = DeviceToken(
        device_id=device.id,
        token_hash=token_hash,
        token_prefix=token_prefix,
        raw_token=raw_token,
        name=name.strip(),
    )
    db.add(token)
    db.commit()
    db.refresh(token)

    res = DeviceTokenResponse.model_validate(token)
    res.raw_token = raw_token
    return res


@router.delete(
    "/{device_id}/tokens/{token_id}",
    summary="Revoke Device Token",
)
def revoke_device_token(
    device_id: int,
    token_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    device = _get_user_device(device_id, current_user, db)

    stmt = select(DeviceToken).where(
        DeviceToken.id == token_id,
        DeviceToken.device_id == device.id,
    )
    token = db.execute(stmt).scalar_one_or_none()
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Device token revoked successfully"}


@router.get(
    "/{device_id}/latest",
    response_model=DeviceLatestResponse,
    summary="Get Latest Device Telemetry",
    description="Retrieve the latest multi-metric reading and state for dashboard display.",
)
def get_device_latest(
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DeviceLatestResponse:
    device = _get_user_device(device_id, current_user, db)

    # Get the latest record for this device
    stmt = (
        select(TelemetryRecord)
        .where(TelemetryRecord.device_id == device.id)
        .order_by(TelemetryRecord.effective_at.desc(), TelemetryRecord.id.desc())
        .limit(1)
    )
    latest_record = db.execute(stmt).scalar_one_or_none()

    if latest_record is None:
        return DeviceLatestResponse(
            device_id=device.id,
            device_code=device.device_code,
            last_seen_at=_to_vietnam_tz(device.last_seen_at),
            metrics_revision=device.metrics_revision,
            values={},
            quality={},
            uptime_ms=0,
        )

    return DeviceLatestResponse(
        device_id=device.id,
        device_code=device.device_code,
        last_seen_at=_to_vietnam_tz(device.last_seen_at),
        effective_at=_to_vietnam_tz(latest_record.effective_at),
        time_quality=latest_record.time_quality,
        metrics_revision=latest_record.metrics_revision,
        values=latest_record.values_json or {},
        quality=latest_record.quality_json or {},
        calibration_revision=latest_record.calibration_revision,
        firmware_version=latest_record.firmware_version,
        uptime_ms=latest_record.uptime_ms,
    )


@router.get(
    "/{device_id}/telemetry",
    response_model=DeviceTelemetryHistoryResponse,
    summary="Get Device Telemetry History",
    description="Retrieve recent telemetry readings for historical logs and charts.",
)
def get_device_telemetry_history(
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=1000),
) -> DeviceTelemetryHistoryResponse:
    device = _get_user_device(device_id, current_user, db)

    stmt = (
        select(TelemetryRecord)
        .where(TelemetryRecord.device_id == device.id)
        .order_by(TelemetryRecord.effective_at.desc(), TelemetryRecord.id.desc())
        .limit(limit)
    )
    records = db.execute(stmt).scalars().all()

    items = []
    for r in records:
        items.append(
            TelemetryHistoryItem(
                id=r.id,
                message_id=r.message_id,
                measured_at=_to_vietnam_tz(r.measured_at),
                received_at=_to_vietnam_tz(r.received_at),
                effective_at=_to_vietnam_tz(r.effective_at),
                time_quality=r.time_quality,
                metrics_revision=r.metrics_revision,
                calibration_revision=r.calibration_revision,
                firmware_version=r.firmware_version,
                uptime_ms=r.uptime_ms,
                values=r.values_json or {},
                quality=r.quality_json or {},
            )
        )

    return DeviceTelemetryHistoryResponse(
        device_id=device.id,
        device_code=device.device_code,
        total=len(items),
        readings=items,
    )
