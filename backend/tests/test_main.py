import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.anyio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Sensor-Data-Bridge" in data["message"]


@pytest.mark.anyio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.anyio
async def test_sensor_ingestion():
    payload = {
        "sensor_id": "TEST_ESP32_01",
        "sensor_type": "temperature",
        "value": 26.8,
        "unit": "°C",
        "metadata": {"location": "Lab 1"}
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/sensors/readings", json=payload)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["data"]["sensor_id"] == "TEST_ESP32_01"

    # Verify retrieval
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        list_response = await ac.get("/api/v1/sensors/readings/TEST_ESP32_01")
    assert list_response.status_code == 200
    readings = list_response.json()
    assert len(readings) >= 1
    assert readings[0]["sensor_id"] == "TEST_ESP32_01"
