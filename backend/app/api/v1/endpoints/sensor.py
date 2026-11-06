from typing import List
from fastapi import APIRouter, HTTPException, Query, status
from starlette.concurrency import run_in_threadpool
from app.schemas.sensor import SensorReading, SensorReadingResponse
from app.services.sensor_service import SensorService

router = APIRouter()


@router.post(
    "/readings",
    response_model=SensorReadingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Sensor Reading"
)
async def receive_sensor_data(reading: SensorReading):
    """Receive and store sensor telemetry from IoT devices (e.g. ESP32, Raspberry Pi)."""
    saved = await run_in_threadpool(SensorService.add_reading, reading)
    return SensorReadingResponse(
        status="success",
        message="Reading recorded successfully",
        data=saved
    )


@router.get(
    "/readings",
    response_model=List[SensorReading],
    summary="Get All Sensor Readings"
)
async def list_sensor_data(limit: int = Query(default=50, ge=1, le=1000)):
    """Retrieve recent sensor readings up to limit."""
    return await run_in_threadpool(SensorService.get_recent_readings, limit=limit)


@router.get(
    "/readings/{sensor_id}",
    response_model=List[SensorReading],
    summary="Get Readings for Specific Sensor"
)
async def get_sensor_readings_by_id(sensor_id: str, limit: int = Query(default=50, ge=1, le=1000)):
    """Filter telemetry by sensor_id."""
    readings = await run_in_threadpool(SensorService.get_by_sensor_id, sensor_id=sensor_id, limit=limit)
    if not readings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No readings found for sensor: {sensor_id}"
        )
    return readings
