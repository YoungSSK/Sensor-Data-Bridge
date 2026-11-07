import uuid
from datetime import datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models.base import Base


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


@pytest.mark.anyio
async def test_email_login_and_me_flow(test_db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login with new email
        res = await ac.post("/api/v1/auth/login", json={"email": "student@ctut.edu.vn", "full_name": "CTUT Student"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "student@ctut.edu.vn"
        assert data["user"]["full_name"] == "CTUT Student"
        token = data["access_token"]

        # 2. Get profile with Bearer token
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "student@ctut.edu.vn"

        # 3. Get profile without token -> 401
        unauth_res = await ac.get("/api/v1/auth/me")
        assert unauth_res.status_code == 401


@pytest.mark.anyio
async def test_register_and_password_login_flow(test_db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register with normal personal email (gmail, not edu)
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "farmer.pepper@gmail.com",
                "password": "mySecurePassword123",
                "full_name": "Farmer John",
            },
        )
        assert reg_res.status_code == 201
        data = reg_res.json()
        assert data["user"]["email"] == "farmer.pepper@gmail.com"
        assert data["user"]["full_name"] == "Farmer John"
        assert "access_token" in data

        # 2. Register duplicate email -> 400
        dup_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "farmer.pepper@gmail.com",
                "password": "anotherPassword",
            },
        )
        assert dup_res.status_code == 400

        # 3. Login with wrong password -> 401
        bad_pw_res = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "farmer.pepper@gmail.com",
                "password": "wrongPassword",
            },
        )
        assert bad_pw_res.status_code == 401

        # 4. Login with correct password -> 200
        good_pw_res = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "farmer.pepper@gmail.com",
                "password": "mySecurePassword123",
            },
        )
        assert good_pw_res.status_code == 200
        assert "access_token" in good_pw_res.json()


@pytest.mark.anyio
async def test_project_and_device_lifecycle(test_db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login User 1
        u1_res = await ac.post("/api/v1/auth/login", json={"email": "user1@ctut.edu.vn"})
        u1_token = u1_res.json()["access_token"]
        u1_headers = {"Authorization": f"Bearer {u1_token}"}

        # 2. Login User 2 (for tenant isolation test)
        u2_res = await ac.post("/api/v1/auth/login", json={"email": "user2@ctut.edu.vn"})
        u2_token = u2_res.json()["access_token"]
        u2_headers = {"Authorization": f"Bearer {u2_token}"}

        # 3. User 1 creates Project
        p_res = await ac.post(
            "/api/v1/projects",
            json={"name": "Pepper Nursery", "description": "Vuon uom 2026"},
            headers=u1_headers,
        )
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]
        assert p_res.json()["name"] == "Pepper Nursery"

        # 4. User 2 cannot see or access User 1's project
        p_u2_res = await ac.get(f"/api/v1/projects/{project_id}", headers=u2_headers)
        assert p_u2_res.status_code == 404

        # 5. User 1 adds Device to Project
        d_res = await ac.post(
            f"/api/v1/projects/{project_id}/devices",
            json={
                "device_code": "ESP32_PEPPER_01",
                "name": "Tram 1 Sensor",
                "interval_seconds": 20,
            },
            headers=u1_headers,
        )
        assert d_res.status_code == 201
        device_data = d_res.json()
        device_id = device_data["id"]
        assert device_data["device_code"] == "ESP32_PEPPER_01"
        assert device_data["token"]["raw_token"] is not None
        device_raw_token = device_data["token"]["raw_token"]
        token_id = device_data["token"]["id"]

        # 6. Verify Project device count
        list_proj = await ac.get("/api/v1/projects", headers=u1_headers)
        assert list_proj.status_code == 200
        assert list_proj.json()[0]["devices_count"] == 1

        # 7. Device sends telemetry using device_raw_token
        device_headers = {"Authorization": f"Bearer {device_raw_token}"}
        telemetry_payload = {
            "schema_version": 1,
            "metrics_revision": 1,
            "message_id": str(uuid.uuid4()),
            "measured_at": datetime.now(timezone.utc).isoformat(),
            "time_quality": "synced",
            "uptime_ms": 50000,
            "values": {
                "air_temperature": 30.2,
                "air_humidity": 78.5,
                "soil_moisture": 65.0,
            },
            "quality": {
                "air_temperature": "valid",
                "air_humidity": "valid",
                "soil_moisture": "valid",
            },
        }
        telem_res = await ac.post("/api/v1/telemetry", json=telemetry_payload, headers=device_headers)
        assert telem_res.status_code == 201

        # 8. User checks latest telemetry for the device
        latest_res = await ac.get(f"/api/v1/devices/{device_id}/latest", headers=u1_headers)
        assert latest_res.status_code == 200
        latest_data = latest_res.json()
        assert latest_data["device_code"] == "ESP32_PEPPER_01"
        assert latest_data["values"]["air_temperature"] == 30.2
        assert latest_data["values"]["air_humidity"] == 78.5

        # 9. User checks telemetry history log
        history_res = await ac.get(f"/api/v1/devices/{device_id}/telemetry?limit=10", headers=u1_headers)
        assert history_res.status_code == 200
        history_data = history_res.json()
        assert history_data["total"] == 1
        assert len(history_data["readings"]) == 1
        assert history_data["readings"][0]["values"]["air_temperature"] == 30.2

        # 10. Issue secondary token and revoke initial token
        token_res = await ac.post(f"/api/v1/devices/{device_id}/tokens?name=Backup+Token", headers=u1_headers)
        assert token_res.status_code == 201
        assert token_res.json()["raw_token"] is not None

        revoke_res = await ac.delete(f"/api/v1/devices/{device_id}/tokens/{token_id}", headers=u1_headers)
        assert revoke_res.status_code == 200

        # Old revoked token should now fail
        telem_fail_res = await ac.post("/api/v1/telemetry", json=telemetry_payload, headers=device_headers)
        assert telem_fail_res.status_code == 401
