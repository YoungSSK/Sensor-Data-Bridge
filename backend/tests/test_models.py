import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.user import User
from app.models.project import Project
from app.models.device import Device, DeviceToken
from app.models.telemetry import TelemetryRecord


@pytest.fixture
def db_session():
    """Create an isolated in-memory SQLite database for model unit tests."""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(test_engine)
    Session = sessionmaker(bind=test_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(test_engine)


def test_user_project_device_hierarchy(db_session):
    # 1. Create User
    user = User(email="sinhvien@ctut.edu.vn", full_name="Sinh Vien CTUT")
    db_session.add(user)
    db_session.commit()
    assert user.id is not None
    assert user.role == "user"
    assert user.status == "active"

    # 2. Create Project owned by User
    project = Project(
        name="Pepper Nursery",
        description="Giám sát môi trường vườn ươm ớt",
        owner_id=user.id,
    )
    db_session.add(project)
    db_session.commit()
    assert project.id is not None
    assert project.owner.email == "sinhvien@ctut.edu.vn"

    # 3. Create Device inside Project
    device = Device(
        project_id=project.id,
        device_code="ESP32_PEPPER_01",
        name="Vườn ươm Trạm 1",
        interval_seconds=15,
    )
    db_session.add(device)
    db_session.commit()
    assert device.id is not None
    assert device.project.name == "Pepper Nursery"

    # 4. Create Device Token
    token = DeviceToken(
        device_id=device.id,
        token_hash="fake_hash_value_for_testing_123456",
        token_prefix="sdb_dev_ab12",
        name="Trạm 1 Primary Token",
    )
    db_session.add(token)
    db_session.commit()
    assert token.id is not None
    assert token.device.device_code == "ESP32_PEPPER_01"


def test_telemetry_record_uniqueness(db_session):
    user = User(email="test@ctut.edu.vn")
    db_session.add(user)
    db_session.flush()

    project = Project(name="Project Test", owner_id=user.id)
    db_session.add(project)
    db_session.flush()

    device = Device(
        project_id=project.id,
        device_code="ESP32_TEST_01",
        name="Trạm Test",
    )
    db_session.add(device)
    db_session.commit()

    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # First insert: success
    record1 = TelemetryRecord(
        device_id=device.id,
        message_id=msg_id,
        measured_at=now,
        received_at=now,
        effective_at=now,
        time_quality="synced",
        metrics_revision=1,
        uptime_ms=12000,
        values_json={"temperature": 28.5, "humidity": 75.0},
        quality_json={"temperature": "valid", "humidity": "valid"},
        payload_hash="hash_value_123",
    )
    db_session.add(record1)
    db_session.commit()
    assert record1.id is not None

    # Second insert with same device_id and message_id: must raise IntegrityError
    record2 = TelemetryRecord(
        device_id=device.id,
        message_id=msg_id,
        measured_at=now,
        received_at=now,
        effective_at=now,
        time_quality="synced",
        metrics_revision=1,
        uptime_ms=12000,
        values_json={"temperature": 28.5, "humidity": 75.0},
        quality_json={"temperature": "valid", "humidity": "valid"},
        payload_hash="hash_value_123",
    )
    db_session.add(record2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
