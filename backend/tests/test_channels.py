from typing import Iterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models.base import Base


@pytest.fixture
def test_db_session() -> Iterator[object]:
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        app.dependency_overrides.clear()
        session.close()
        Base.metadata.drop_all(test_engine)


@pytest.mark.anyio
async def test_channel_api_key_feed_and_private_show_flow(test_db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        register = await ac.post(
            "/api/v1/auth/register",
            json={"email": "channel-owner@example.com", "password": "strong-password"},
        )
        assert register.status_code == 201
        owner_headers = {"Authorization": f"Bearer {register.json()['access_token']}"}

        channel_res = await ac.post(
            "/api/v1/channels",
            headers=owner_headers,
            json={
                "name": "Vườn ươm ớt",
                "fields": [
                    {"key": "field1", "name": "Nhiệt độ", "unit": "°C"},
                    {"key": "field2", "name": "Độ ẩm", "unit": "%"},
                ],
            },
        )
        assert channel_res.status_code == 201
        channel = channel_res.json()
        channel_id = channel["id"]
        assert isinstance(channel_id, int)
        assert [field["key"] for field in channel["fields"]] == ["field1", "field2"]

        update = await ac.patch(
            f"/api/v1/channels/{channel_id}",
            headers=owner_headers,
            json={
                "description": "Theo dõi môi trường",
                "fields": [
                    {"key": "field1", "name": "Nhiệt độ không khí", "unit": "°C"},
                    {"key": "field2", "name": "Độ ẩm không khí", "unit": "%"},
                ],
            },
        )
        assert update.status_code == 200
        assert update.json()["description"] == "Theo dõi môi trường"

        write_key_res = await ac.post(
            f"/api/v1/channels/{channel_id}/api_keys",
            headers=owner_headers,
            json={"type": "write", "name": "ESP32 writer"},
        )
        read_key_res = await ac.post(
            f"/api/v1/channels/{channel_id}/api_keys",
            headers=owner_headers,
            json={"type": "read", "name": "Chart reader"},
        )
        assert write_key_res.status_code == 201
        assert read_key_res.status_code == 201
        write_key = write_key_res.json()["raw_key"]
        read_key = read_key_res.json()["raw_key"]
        assert write_key.startswith("sdb_write_")
        assert write_key != read_key

        ingest = await ac.post(
            f"/api/v1/channels/{channel_id}/feeds",
            headers={"X-API-Key": write_key},
            json={"field1": 28.2, "field2": 42.5},
        )
        assert ingest.status_code == 201
        assert ingest.json()["values"] == {"field1": 28.2, "field2": 42.5}

        read = await ac.get(
            f"/api/v1/channels/{channel_id}/feeds",
            headers={"X-API-Key": read_key},
        )
        assert read.status_code == 200
        assert read.json()["total"] == 1

        private_show = await ac.get(
            f"/api/v1/channels/{channel_id}/private_show",
            headers=owner_headers,
        )
        assert private_show.status_code == 200
        assert private_show.json()["entries"] == 1
        assert private_show.json()["fields"][0]["name"] == "Nhiệt độ không khí"

        keys = await ac.get(f"/api/v1/channels/{channel_id}/api_keys", headers=owner_headers)
        assert keys.status_code == 200
        listed_keys = {item["name"]: item for item in keys.json()}
        assert listed_keys["ESP32 writer"]["raw_key"] == write_key
        assert listed_keys["Chart reader"]["raw_key"] == read_key


@pytest.mark.anyio
async def test_channel_key_scope_and_permissions(test_db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        owner = await ac.post(
            "/api/v1/auth/register",
            json={"email": "owner-two@example.com", "password": "strong-password"},
        )
        owner_headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}
        channel_res = await ac.post(
            "/api/v1/channels",
            headers=owner_headers,
            json={"name": "Channel", "fields": [{"key": "field1", "name": "Temperature"}]},
        )
        channel_id = channel_res.json()["id"]
        write_key_res = await ac.post(
            f"/api/v1/channels/{channel_id}/api_keys",
            headers=owner_headers,
            json={"type": "write"},
        )
        write_key = write_key_res.json()["raw_key"]

        wrong_permission = await ac.get(
            f"/api/v1/channels/{channel_id}/feeds",
            headers={"X-API-Key": write_key},
        )
        assert wrong_permission.status_code == 403

        revoke = await ac.delete(
            f"/api/v1/channels/{channel_id}/api_keys/{write_key_res.json()['id']}",
            headers=owner_headers,
        )
        assert revoke.status_code == 200
        revoked_ingest = await ac.post(
            f"/api/v1/channels/{channel_id}/feeds",
            headers={"X-API-Key": write_key},
            json={"field1": 1},
        )
        assert revoked_ingest.status_code == 401


@pytest.mark.anyio
async def test_replace_fields_after_channel_creation_preserves_feed_history(test_db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        owner = await ac.post(
            "/api/v1/auth/register",
            json={"email": "field-owner@example.com", "password": "strong-password"},
        )
        owner_headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}
        channel = await ac.post(
            "/api/v1/channels",
            headers=owner_headers,
            json={"name": "Nursery", "fields": [
                {"key": "field1", "name": "Temperature", "unit": "C"},
                {"key": "field2", "name": "Humidity", "unit": "%"},
            ]},
        )
        channel_id = channel.json()["id"]
        original_field_id = channel.json()["fields"][0]["id"]
        write_key = await ac.post(
            f"/api/v1/channels/{channel_id}/api_keys",
            headers=owner_headers,
            json={"type": "write"},
        )
        ingest_headers = {"X-API-Key": write_key.json()["raw_key"]}
        assert (await ac.post(
            f"/api/v1/channels/{channel_id}/feeds",
            headers=ingest_headers,
            json={"field1": 28, "field2": 60},
        )).status_code == 201

        updated = await ac.put(
            f"/api/v1/channels/{channel_id}/fields",
            headers=owner_headers,
            json=[
                {"key": "field1", "name": "Air temperature", "unit": "°C"},
                {"key": "field3", "name": "Soil moisture", "unit": "%"},
            ],
        )
        assert updated.status_code == 200
        assert [field["key"] for field in updated.json()] == ["field1", "field3"]
        assert updated.json()[0]["id"] == original_field_id
        assert updated.json()[0]["name"] == "Air temperature"

        private_show = await ac.get(
            f"/api/v1/channels/{channel_id}/private_show", headers=owner_headers,
        )
        assert private_show.status_code == 200
        assert [field["key"] for field in private_show.json()["fields"]] == ["field1", "field3"]
        assert private_show.json()["feeds"][0]["values"] == {"field1": 28, "field2": 60}

        removed_field = await ac.post(
            f"/api/v1/channels/{channel_id}/feeds",
            headers=ingest_headers,
            json={"field2": 61},
        )
        assert removed_field.status_code == 422
        assert (await ac.post(
            f"/api/v1/channels/{channel_id}/feeds",
            headers=ingest_headers,
            json={"field3": 45},
        )).status_code == 201
