import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import generate_device_token
from app.main import app
from app.models.base import Base
from app.models.device import Device, DeviceToken
from app.models.project import Project
from app.models.user import User


@pytest.fixture
def test_db_session():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield session
    finally:
        app.dependency_overrides.clear()
        session.close()
        Base.metadata.drop_all(test_engine)


@pytest.fixture
def sample_device_and_token(test_db_session):
    user = User(email="farmer@ctut.edu.vn", full_name="Nguyen Van A")
    test_db_session.add(user)
    test_db_session.flush()

    project = Project(name="Pepper Nursery", owner_id=user.id)
    test_db_session.add(project)
    test_db_session.flush()

    device = Device(
        project_id=project.id,
        device_code="ESP32_PEPPER_01",
        name="Trạm Ớt Vườn 1",
        metrics_revision=1,
        status="active",
    )
    test_db_session.add(device)
    test_db_session.flush()

    raw_token, token_hash, token_prefix = generate_device_token()
    token = DeviceToken(
        device_id=device.id,
        token_hash=token_hash,
        token_prefix=token_prefix,
        name="Default Primary Token",
    )
    test_db_session.add(token)
    test_db_session.commit()

    return device, raw_token


def valid_payload(metrics_revision=1, measured_at=None, message_id=None):
    now = datetime.now(timezone.utc)
    return {
        "schema_version": 1,
        "metrics_revision": metrics_revision,
        "message_id": str(message_id or uuid.uuid4()),
        "measured_at": (measured_at or now).isoformat(),
        "time_quality": "synced",
        "uptime_ms": 150000,
        "values": {
            "air_temperature": 29.5,
            "air_humidity": 75.0,
            "soil_moisture": 62.0,
        },
        "quality": {
            "air_temperature": "valid",
            "air_humidity": "valid",
            "soil_moisture": "valid",
        },
        "calibration_revision": "cal-v1",
        "firmware_version": "1.0.0",
    }


@pytest.mark.anyio
async def test_auth_missing_token(test_db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/telemetry", json=valid_payload())
    assert response.status_code == 401
    assert "Missing or invalid Authorization header" in response.json()["detail"]


@pytest.mark.anyio
async def test_auth_invalid_token(test_db_session):
    headers = {"Authorization": "Bearer wrong_invalid_secret_token"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/telemetry", json=valid_payload(), headers=headers)
    assert response.status_code == 401
    assert "Invalid or revoked device token" in response.json()["detail"]


@pytest.mark.anyio
async def test_auth_inactive_device(test_db_session, sample_device_and_token):
    device, raw_token = sample_device_and_token
    device.status = "inactive"
    test_db_session.commit()

    headers = {"Authorization": f"Bearer {raw_token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/telemetry", json=valid_payload(), headers=headers)
    assert response.status_code == 403
    assert "inactive or suspended" in response.json()["detail"]


@pytest.mark.anyio
async def test_metrics_revision_mismatch(test_db_session, sample_device_and_token):
    _, raw_token = sample_device_and_token
    headers = {"Authorization": f"Bearer {raw_token}"}
    payload = valid_payload(metrics_revision=2)  # Device expects revision 1

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/telemetry", json=payload, headers=headers)
    assert response.status_code == 422
    assert "Metrics revision mismatch" in response.json()["detail"]


@pytest.mark.anyio
async def test_time_window_validation(test_db_session, sample_device_and_token):
    _, raw_token = sample_device_and_token
    headers = {"Authorization": f"Bearer {raw_token}"}

    # Reading measured 25 hours ago (> 24h allowed)
    old_time = datetime.now(timezone.utc) - timedelta(hours=25)
    payload = valid_payload(measured_at=old_time)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/telemetry", json=payload, headers=headers)
    assert response.status_code == 422
    assert "outside the accepted time window" in response.json()["detail"]


@pytest.mark.anyio
async def test_successful_ingestion_and_idempotency(test_db_session, sample_device_and_token):
    device, raw_token = sample_device_and_token
    headers = {"Authorization": f"Bearer {raw_token}"}
    msg_id = uuid.uuid4()
    payload = valid_payload(message_id=msg_id)

    # 1. First Ingestion: 201 Created
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res1 = await ac.post("/api/v1/telemetry", json=payload, headers=headers)
    assert res1.status_code == 201
    data1 = res1.json()["data"]
    assert data1["message_id"] == str(msg_id)
    assert data1["accepted"] is True
    assert data1["duplicate"] is False
    received_at_1 = data1["received_at"]

    # Verify device.last_seen_at was updated
    test_db_session.refresh(device)
    assert device.last_seen_at is not None

    # 2. Second Ingestion (Identical Retry): 200 OK with duplicate=True
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res2 = await ac.post("/api/v1/telemetry", json=payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()["data"]
    assert data2["message_id"] == str(msg_id)
    assert data2["accepted"] is True
    assert data2["duplicate"] is True
    assert data2["received_at"] == received_at_1

    # 3. Third Ingestion (Same message_id, but different payload): 409 Conflict
    conflict_payload = valid_payload(message_id=msg_id)
    conflict_payload["values"]["air_temperature"] = 35.0  # Modified value
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res3 = await ac.post("/api/v1/telemetry", json=conflict_payload, headers=headers)
    assert res3.status_code == 409
    assert "Message ID already exists with different payload" in res3.json()["detail"]
