from typing import Annotated
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_device
from app.core.database import get_db
from app.models.device import Device
from app.schemas.telemetry import TelemetryIngestResponse, TelemetryV1
from app.services.telemetry_service import TelemetryService

router = APIRouter()


@router.post(
    "",
    response_model=TelemetryIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Device Telemetry (V1)",
    description="Receive, validate and store atomic multi-metric telemetry from an authenticated IoT device (ESP32).",
    responses={
        201: {"description": "Telemetry ingested successfully (new message)"},
        200: {"description": "Duplicate message accepted (idempotent retry with duplicate=true)"},
        401: {"description": "Missing, invalid or revoked device token"},
        403: {"description": "Device is inactive or suspended"},
        409: {"description": "Message ID conflict with different payload contents"},
        422: {"description": "Validation error, time window error or revision mismatch"},
    },
)
def ingest_telemetry(
    payload: TelemetryV1,
    device: Annotated[Device, Depends(get_current_device)],
    db: Annotated[Session, Depends(get_db)],
    response: Response,
) -> TelemetryIngestResponse:
    data, is_created = TelemetryService.ingest(db=db, device=device, payload=payload)
    if is_created:
        response.status_code = status.HTTP_201_CREATED
    else:
        response.status_code = status.HTTP_200_OK

    return TelemetryIngestResponse(data=data)
