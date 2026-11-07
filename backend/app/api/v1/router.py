from fastapi import APIRouter
from app.api.v1.endpoints import auth, devices, health, projects, sensor, telemetry

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(devices.router, prefix="/devices", tags=["Devices"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
api_router.include_router(sensor.router, prefix="/sensors", tags=["Sensors (Legacy)"])
