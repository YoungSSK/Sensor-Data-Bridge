import math
from datetime import datetime, timezone
from typing import Annotated, List

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_current_user_optional,
    resolve_channel_api_key,
)
from app.core.database import get_db
from app.core.security import decrypt_channel_api_key, encrypt_channel_api_key, generate_channel_api_key
from app.models.channel import Channel, ChannelApiKey, ChannelFeed, ChannelField
from app.models.user import User
from app.schemas.channel import (
    ApiKeyCreate,
    ApiKeyResponse,
    ChannelCreate,
    ChannelFeedListResponse,
    ChannelFeedResponse,
    ChannelFieldCreate,
    ChannelFieldResponse,
    ChannelResponse,
    ChannelUpdate,
    FeedIngestRequest,
    PrivateShowResponse,
)

router = APIRouter()


def _validate_field_definitions(fields: List[ChannelFieldCreate]) -> None:
    keys = [field.key for field in fields]
    if len(keys) != len(set(keys)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Each channel field key must be unique",
        )


def _get_owned_channel(channel_id: int, current_user: User, db: Session) -> Channel:
    channel = db.execute(
        select(Channel).where(Channel.id == channel_id, Channel.owner_id == current_user.id)
    ).scalar_one_or_none()
    if channel is None:
        # Do not reveal whether another user's channel exists.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")
    return channel


def _get_channel(channel_id: int, db: Session) -> Channel:
    channel = db.get(Channel, channel_id)
    if channel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")
    return channel


def _field_response(field: ChannelField) -> ChannelFieldResponse:
    return ChannelFieldResponse.model_validate(field)


def _channel_response(channel: Channel, db: Session) -> ChannelResponse:
    entries = db.execute(
        select(func.count(ChannelFeed.id)).where(ChannelFeed.channel_id == channel.id)
    ).scalar_one()
    latest = db.execute(
        select(func.max(ChannelFeed.received_at)).where(ChannelFeed.channel_id == channel.id)
    ).scalar_one()
    return ChannelResponse(
        id=channel.id,
        owner_id=channel.owner_id,
        name=channel.name,
        description=channel.description,
        fields=[_field_response(field) for field in channel.fields],
        entries=int(entries or 0),
        latest_received_at=latest,
        created_at=channel.created_at,
        updated_at=channel.updated_at,
    )


def _replace_fields(channel: Channel, fields: List[ChannelFieldCreate], db: Session) -> None:
    _validate_field_definitions(fields)
    existing_by_key = {field.key: field for field in channel.fields}
    requested_keys = {field.key for field in fields}

    # Update existing definitions in place and explicitly delete removed rows first.
    # This avoids a unique-key collision when a field keeps the same key during a
    # full field configuration replacement.
    for existing in list(channel.fields):
        if existing.key not in requested_keys:
            db.delete(existing)
            channel.fields.remove(existing)
    db.flush()

    for position, field in enumerate(fields, start=1):
        existing = existing_by_key.get(field.key)
        if existing is None:
            channel.fields.append(
                ChannelField(
                    key=field.key,
                    name=field.name,
                    unit=field.unit,
                    position=position,
                )
            )
        else:
            existing.name = field.name
            existing.unit = field.unit
            existing.position = position
    db.flush()


def _feed_response(feed: ChannelFeed) -> ChannelFeedResponse:
    return ChannelFeedResponse(
        id=feed.id,
        channel_id=feed.channel_id,
        values={key: float(value) for key, value in (feed.values_json or {}).items()},
        received_at=feed.received_at,
    )


def _normalise_feed_values(payload: FeedIngestRequest, channel: Channel) -> dict[str, float]:
    try:
        values = payload.as_values()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not values:
        raise HTTPException(status_code=422, detail="At least one sensor field is required")

    configured = {field.key for field in channel.fields}
    if not configured:
        raise HTTPException(status_code=422, detail="Configure channel fields before sending data")

    unknown = sorted(set(values) - configured)
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown channel field(s): {', '.join(unknown)}",
        )

    normalised: dict[str, float] = {}
    for key, value in values.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise HTTPException(status_code=422, detail=f"Value for {key} must be a finite number")
        normalised[key] = float(value)
    return normalised


@router.get("", response_model=List[ChannelResponse], summary="List My Channels")
def list_channels(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[ChannelResponse]:
    channels = db.execute(
        select(Channel).where(Channel.owner_id == current_user.id).order_by(Channel.created_at.desc())
    ).scalars().all()
    return [_channel_response(channel, db) for channel in channels]


@router.post("", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED, summary="Create Channel")
def create_channel(
    payload: ChannelCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ChannelResponse:
    _validate_field_definitions(payload.fields)
    channel = Channel(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
    )
    db.add(channel)
    db.flush()
    _replace_fields(channel, payload.fields, db)
    db.commit()
    db.refresh(channel)
    return _channel_response(channel, db)


@router.get("/{channel_id}", response_model=ChannelResponse, summary="Get Channel")
def get_channel(
    channel_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ChannelResponse:
    return _channel_response(_get_owned_channel(channel_id, current_user, db), db)


@router.patch("/{channel_id}", response_model=ChannelResponse, summary="Update Channel")
def update_channel(
    channel_id: int,
    payload: ChannelUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ChannelResponse:
    channel = _get_owned_channel(channel_id, current_user, db)
    if "name" in payload.model_fields_set and payload.name is not None:
        channel.name = payload.name
    if "description" in payload.model_fields_set:
        channel.description = payload.description
    if "fields" in payload.model_fields_set and payload.fields is not None:
        _replace_fields(channel, payload.fields, db)
    db.commit()
    db.refresh(channel)
    return _channel_response(channel, db)


@router.put(
    "/{channel_id}/fields",
    response_model=List[ChannelFieldResponse],
    summary="Replace Channel Fields",
)
def replace_channel_fields(
    channel_id: int,
    fields: List[ChannelFieldCreate],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[ChannelFieldResponse]:
    channel = _get_owned_channel(channel_id, current_user, db)
    _replace_fields(channel, fields, db)
    db.commit()
    db.refresh(channel)
    return [_field_response(field) for field in channel.fields]


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Channel")
def delete_channel(
    channel_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    channel = _get_owned_channel(channel_id, current_user, db)
    db.delete(channel)
    db.commit()


@router.get(
    "/{channel_id}/api_keys",
    response_model=List[ApiKeyResponse],
    summary="List Channel API Keys",
)
def list_api_keys(
    channel_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[ApiKeyResponse]:
    channel = _get_owned_channel(channel_id, current_user, db)
    keys = db.execute(
        select(ChannelApiKey)
        .where(ChannelApiKey.channel_id == channel.id)
        .order_by(ChannelApiKey.created_at.desc())
    ).scalars().all()
    return [
        ApiKeyResponse.from_model(
            api_key,
            raw_key=(
                decrypt_channel_api_key(api_key.key_ciphertext)
                if api_key.revoked_at is None
                else None
            ),
        )
        for api_key in keys
    ]


@router.post(
    "/{channel_id}/api_keys",
    response_model=ApiKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Channel API Key",
    description="The raw secret is returned on creation and to the owner while the key is active; it is encrypted at rest.",
)
def create_api_key(
    channel_id: int,
    payload: ApiKeyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApiKeyResponse:
    channel = _get_owned_channel(channel_id, current_user, db)
    raw_key, key_hash, key_prefix = generate_channel_api_key(payload.type)
    api_key = ChannelApiKey(
        channel_id=channel.id,
        key_type=payload.type,
        name=payload.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        key_ciphertext=encrypt_channel_api_key(raw_key),
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return ApiKeyResponse.from_model(api_key, raw_key=raw_key)


@router.delete(
    "/{channel_id}/api_keys/{api_key_id}",
    response_model=ApiKeyResponse,
    summary="Revoke Channel API Key",
)
def revoke_api_key(
    channel_id: int,
    api_key_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ApiKeyResponse:
    channel = _get_owned_channel(channel_id, current_user, db)
    api_key = db.execute(
        select(ChannelApiKey).where(
            ChannelApiKey.id == api_key_id,
            ChannelApiKey.channel_id == channel.id,
        )
    ).scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    if api_key.revoked_at is None:
        api_key.revoked_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(api_key)
    return ApiKeyResponse.from_model(api_key)


@router.post(
    "/{channel_id}/feeds",
    response_model=ChannelFeedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Channel Feed",
    description="Receive numeric field values from ESP32 using a Write API Key.",
)
def ingest_feed(
    channel_id: int,
    payload: FeedIngestRequest,
    db: Annotated[Session, Depends(get_db)],
    api_key_header: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> ChannelFeedResponse:
    channel = _get_channel(channel_id, db)
    api_key = resolve_channel_api_key(api_key_header, channel.id, db)
    if api_key.key_type != "write":
        raise HTTPException(status_code=403, detail="This API key does not have write permission")

    feed = ChannelFeed(
        channel_id=channel.id,
        values_json=_normalise_feed_values(payload, channel),
        received_at=datetime.now(timezone.utc),
    )
    db.add(feed)
    db.commit()
    db.refresh(feed)
    return _feed_response(feed)


@router.get(
    "/{channel_id}/feeds",
    response_model=ChannelFeedListResponse,
    summary="Read Channel Feeds",
    description="Read feeds with a Read API Key or through the authenticated channel owner session.",
)
def list_feeds(
    channel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
    api_key_header: Annotated[str | None, Header(alias="X-API-Key")] = None,
    limit: int = Query(default=100, ge=1, le=1000),
) -> ChannelFeedListResponse:
    channel = _get_channel(channel_id, db)
    if api_key_header:
        api_key = resolve_channel_api_key(api_key_header, channel.id, db)
        if api_key.key_type != "read":
            raise HTTPException(status_code=403, detail="This API key does not have read permission")
    elif current_user is None or current_user.id != channel.owner_id:
        raise HTTPException(status_code=401, detail="Read API key or channel owner session is required")

    feeds = db.execute(
        select(ChannelFeed)
        .where(ChannelFeed.channel_id == channel.id)
        .order_by(ChannelFeed.received_at.desc(), ChannelFeed.id.desc())
        .limit(limit)
    ).scalars().all()
    feeds = list(reversed(feeds))
    return ChannelFeedListResponse(
        channel_id=channel.id,
        total=len(feeds),
        feeds=[_feed_response(feed) for feed in feeds],
    )


@router.get(
    "/{channel_id}/private_show",
    response_model=PrivateShowResponse,
    summary="Show Private Channel Data",
    description="Owner-only chart data for the future frontend private_show page.",
)
def private_show(
    channel_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=100, ge=1, le=1000),
) -> PrivateShowResponse:
    channel = _get_owned_channel(channel_id, current_user, db)
    feeds = db.execute(
        select(ChannelFeed)
        .where(ChannelFeed.channel_id == channel.id)
        .order_by(ChannelFeed.received_at.desc(), ChannelFeed.id.desc())
        .limit(limit)
    ).scalars().all()
    feeds = list(reversed(feeds))
    channel_data = _channel_response(channel, db)
    return PrivateShowResponse(
        channel=channel_data,
        fields=channel_data.fields,
        entries=channel_data.entries,
        latest_received_at=channel_data.latest_received_at,
        feeds=[_feed_response(feed) for feed in feeds],
    )
