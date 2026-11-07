from datetime import datetime, timezone
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token, hash_token
from app.models.device import Device, DeviceToken
from app.models.channel import ChannelApiKey
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def _decode_user_from_credentials(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User | None:
    if credentials is None:
        return None
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization scheme. Expected 'Bearer <USER_TOKEN>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if user is None or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """
    Authenticate a human user via Bearer JWT token in Authorization header.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer <USER_TOKEN>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _decode_user_from_credentials(credentials, db)  # type: ignore[return-value]


def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    """Resolve an optional Bearer user for read endpoints that also accept a Read API Key."""
    return _decode_user_from_credentials(credentials, db)


def resolve_channel_api_key(raw_key: str | None, channel_id: int, db: Session) -> ChannelApiKey:
    """Authenticate a channel API key using its one-way hash."""
    if not raw_key or not raw_key.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    stmt = select(ChannelApiKey).where(
        ChannelApiKey.channel_id == channel_id,
        ChannelApiKey.key_hash == hash_token(raw_key),
        ChannelApiKey.revoked_at.is_(None),
    )
    api_key = db.execute(stmt).scalar_one_or_none()
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked channel API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return api_key


def get_current_device(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Device:
    """
    Authenticate IoT device via Bearer token in Authorization header.
    Validates token hash, checks revocation and device status.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer <DEVICE_TOKEN>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raw_token = credentials.credentials
    hashed = hash_token(raw_token)

    stmt = select(DeviceToken).where(
        DeviceToken.token_hash == hashed,
        DeviceToken.revoked_at.is_(None),
    )
    token_record = db.execute(stmt).scalar_one_or_none()

    if token_record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked device token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    device = token_record.device
    if device is None or device.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device is inactive or suspended",
        )

    # Record token usage time
    token_record.last_used_at = datetime.now(timezone.utc)
    db.commit()

    return device
