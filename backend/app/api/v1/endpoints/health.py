from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", summary="Health Check")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }
