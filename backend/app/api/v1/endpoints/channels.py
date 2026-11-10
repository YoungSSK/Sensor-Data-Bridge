import math
import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated, List, Optional

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


VN_TZ = timezone(timedelta(hours=7))


def _to_vietnam_tz(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(VN_TZ)


def _field_response(field: ChannelField) -> ChannelFieldResponse:
    return ChannelFieldResponse.model_validate(field)


def _channel_response(channel: Channel, db: Session) -> ChannelResponse:
    entries = db.execute(
        select(func.count(ChannelFeed.id)).where(ChannelFeed.channel_id == channel.id)
    ).scalar_one()
    latest = db.execute(
        select(func.max(ChannelFeed.received_at)).where(ChannelFeed.channel_id == channel.id)
    ).scalar_one_or_none()
    return ChannelResponse(
        id=channel.id,
        owner_id=channel.owner_id,
        name=channel.name,
        description=channel.description,
        fields=[_field_response(field) for field in channel.fields],
        entries=int(entries or 0),
        latest_received_at=_to_vietnam_tz(latest),
        created_at=_to_vietnam_tz(channel.created_at),
        updated_at=_to_vietnam_tz(channel.updated_at),
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
        received_at=_to_vietnam_tz(feed.received_at),
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


def _parse_timezone(tz_str: Optional[str]) -> timezone:
    if not tz_str or tz_str.upper() in ("Z", "UTC"):
        return timezone.utc
    match = re.match(r"^([+-])(\d{1,2}):?(\d{2})?$", tz_str.strip())
    if not match:
        return timezone(timedelta(hours=7))
    sign = 1 if match.group(1) == "+" else -1
    hours = int(match.group(2))
    minutes = int(match.group(3)) if match.group(3) else 0
    return timezone(timedelta(minutes=sign * (hours * 60 + minutes)))


def _parse_time(time_str: Optional[str], default_time: time) -> time:
    if not time_str or not str(time_str).strip():
        return default_time
    parts = str(time_str).strip().split(":")
    try:
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        second = 0
        microsecond = 0
        if len(parts) >= 3:
            sec_parts = parts[2].split(".")
            second = int(sec_parts[0])
            if len(sec_parts) > 1:
                microsecond = int(sec_parts[1][:6].ljust(6, "0"))
        return time(hour=hour, minute=minute, second=second, microsecond=microsecond)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Định dạng giờ không hợp lệ: '{time_str}'. Cần định dạng HH:MM hoặc HH:MM:SS",
        ) from exc


def _combine_date_time_to_utc(
    date_str: Optional[str],
    time_str: Optional[str],
    default_time: time,
    tz_str: Optional[str] = "+07:00",
) -> Optional[datetime]:
    if not date_str or not str(date_str).strip():
        return None
    clean_date = str(date_str).strip().replace("/", "-")
    try:
        parsed_date = date.fromisoformat(clean_date)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Định dạng ngày không hợp lệ: '{date_str}'. Cần định dạng YYYY-MM-DD",
        ) from exc

    parsed_time = _parse_time(time_str, default_time)
    tz = _parse_timezone(tz_str)
    local_dt = datetime.combine(parsed_date, parsed_time, tzinfo=tz)
    return local_dt.astimezone(timezone.utc)


def _execute_feed_query(
    channel_id: int,
    db: Session,
    current_user: Optional[User],
    api_key_header: Optional[str],
    start_dt: Optional[datetime],
    end_dt: Optional[datetime],
    limit: Optional[int],
    page: int,
    page_size: int,
    order: str,
) -> ChannelFeedListResponse:
    channel = _get_channel(channel_id, db)
    if api_key_header:
        api_key = resolve_channel_api_key(api_key_header, channel.id, db)
        if api_key.key_type != "read":
            raise HTTPException(status_code=403, detail="This API key does not have read permission")
    elif current_user is None or current_user.id != channel.owner_id:
        raise HTTPException(status_code=401, detail="Read API key or channel owner session is required")

    conditions = [ChannelFeed.channel_id == channel.id]
    if start_dt:
        conditions.append(ChannelFeed.received_at >= start_dt)
    if end_dt:
        conditions.append(ChannelFeed.received_at <= end_dt)

    total = db.execute(
        select(func.count(ChannelFeed.id)).where(*conditions)
    ).scalar_one() or 0

    if limit is not None:
        effective_page_size = limit
        effective_page = 1
        offset = 0
    else:
        effective_page_size = page_size
        effective_page = page
        offset = (page - 1) * page_size

    total_pages = max(1, math.ceil(total / effective_page_size)) if total > 0 else 1

    query = select(ChannelFeed).where(*conditions)
    if order == "asc":
        query = query.order_by(ChannelFeed.received_at.asc(), ChannelFeed.id.asc())
    else:
        query = query.order_by(ChannelFeed.received_at.desc(), ChannelFeed.id.desc())

    feeds = db.execute(query.offset(offset).limit(effective_page_size)).scalars().all()
    if limit is not None and order == "desc":
        # Giữ tương thích ngược với client cũ cần timeline tăng dần khi gọi limit
        feeds = list(reversed(feeds))

    return ChannelFeedListResponse(
        channel_id=channel.id,
        total=total,
        page=effective_page,
        page_size=effective_page_size,
        total_pages=total_pages,
        feeds=[_feed_response(feed) for feed in feeds],
    )


@router.get(
    "/{channel_id}/feeds/range",
    response_model=ChannelFeedListResponse,
    summary="Query Channel Feeds by Date and Time Range",
    description="Truy vấn dữ liệu đo theo ngày bắt đầu/kết thúc và giờ bắt đầu/kết thúc (Hỗ trợ phân trang và múi giờ).",
)
def get_feeds_by_range(
    channel_id: int,
    db: Annotated[Session, Depends(get_db)],
    start_date: str = Query(..., description="Ngày bắt đầu (YYYY-MM-DD), ví dụ: 2026-11-08"),
    end_date: str = Query(..., description="Ngày kết thúc (YYYY-MM-DD), ví dụ: 2026-11-10"),
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    start_time: Optional[str] = Query(default="00:00:00", description="Giờ bắt đầu (HH:MM hoặc HH:MM:SS), mặc định: 00:00:00"),
    end_time: Optional[str] = Query(default="23:59:59", description="Giờ kết thúc (HH:MM hoặc HH:MM:SS), mặc định: 23:59:59"),
    timezone: Optional[str] = Query(default="+07:00", alias="tz", description="Múi giờ địa phương, ví dụ: +07:00 (mặc định) hoặc Z / UTC"),
    api_key_header: Annotated[str | None, Header(alias="X-API-Key")] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=1000),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> ChannelFeedListResponse:
    start_dt = _combine_date_time_to_utc(start_date, start_time, time(0, 0, 0), timezone)
    end_dt = _combine_date_time_to_utc(end_date, end_time, time(23, 59, 59, 999999), timezone)

    if start_dt and end_dt and start_dt > end_dt:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Thời điểm bắt đầu không được lớn hơn thời điểm kết thúc",
        )

    return _execute_feed_query(
        channel_id=channel_id,
        db=db,
        current_user=current_user,
        api_key_header=api_key_header,
        start_dt=start_dt,
        end_dt=end_dt,
        limit=limit,
        page=page,
        page_size=page_size,
        order=order,
    )


@router.get(
    "/{channel_id}/feeds",
    response_model=ChannelFeedListResponse,
    summary="Read Channel Feeds",
    description="Read feeds with a Read API Key or through the authenticated channel owner session.",
)
def list_feeds(
    channel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    api_key_header: Annotated[str | None, Header(alias="X-API-Key")] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=1000),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    start_at: Optional[datetime] = Query(default=None),
    end_at: Optional[datetime] = Query(default=None),
    start_date: Optional[str] = Query(default=None, description="Ngày bắt đầu (YYYY-MM-DD), ví dụ: 2026-11-08"),
    start_time: Optional[str] = Query(default=None, description="Giờ bắt đầu (HH:MM hoặc HH:MM:SS), mặc định: 00:00:00"),
    end_date: Optional[str] = Query(default=None, description="Ngày kết thúc (YYYY-MM-DD), ví dụ: 2026-11-10"),
    end_time: Optional[str] = Query(default=None, description="Giờ kết thúc (HH:MM hoặc HH:MM:SS), mặc định: 23:59:59"),
    timezone: Optional[str] = Query(default="+07:00", alias="tz", description="Múi giờ địa phương, ví dụ: +07:00 (mặc định) hoặc Z / UTC"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> ChannelFeedListResponse:
    # Nếu chưa truyền start_at/end_at dạng ISO, hỗ trợ ghép start_date + start_time
    if not start_at and start_date:
        start_at = _combine_date_time_to_utc(start_date, start_time, time(0, 0, 0), timezone)
    if not end_at and end_date:
        end_at = _combine_date_time_to_utc(end_date, end_time, time(23, 59, 59, 999999), timezone)

    if start_at and end_at and start_at > end_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Thời điểm bắt đầu không được lớn hơn thời điểm kết thúc",
        )

    return _execute_feed_query(
        channel_id=channel_id,
        db=db,
        current_user=current_user,
        api_key_header=api_key_header,
        start_dt=start_at,
        end_dt=end_at,
        limit=limit,
        page=page,
        page_size=page_size,
        order=order,
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
