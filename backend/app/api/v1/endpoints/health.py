import pymysql
from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.database import check_database

router = APIRouter()


@router.get("/health", summary="Health Check")
async def health_check():
    try:
        await run_in_threadpool(check_database)
    except (pymysql.MySQLError, OSError, RuntimeError):
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }
