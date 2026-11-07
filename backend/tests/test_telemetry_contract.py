"""Checks that device messages keep their meaning across validation and retry."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.telemetry import TelemetryV1


EXAMPLE = Path(__file__).resolve().parents[2] / "docs" / "contracts" / "telemetry-v1.example.json"


def message(**changes):
    data = json.loads(EXAMPLE.read_text(encoding="utf-8"))
    return {**data, **changes}


def test_example_and_unsynced_time():
    reading = TelemetryV1.model_validate(message())
    received = datetime(2026, 11, 5, 8, 0, 1, tzinfo=timezone.utc)
    reading.validate_received_at(received)
    assert reading.effective_at(received) == reading.measured_at

    unsynced = TelemetryV1.model_validate(message(measured_at=None, time_quality="unsynced"))
    unsynced.validate_received_at(received)
    assert unsynced.effective_at(received) == received


@pytest.mark.parametrize("changes", [
    {"values": {}},
    {"values": {"Air Temperature": 29.5}, "quality": {"Air Temperature": "valid"}},
    {"values": {"air_temperature": 29.5}, "quality": {"air_humidity": "valid"}},
    {"values": {"air_temperature": None}, "quality": {"air_temperature": "valid"}},
    {"values": {"air_temperature": 29.5}, "quality": {"air_temperature": "stale"}},
    {"values": {"air_temperature": float("nan")}, "quality": {"air_temperature": "valid"}},
    {"measured_at": None, "time_quality": "synced"},
    {"measured_at": "2026-11-05T09:00:00+01:00"},
    {"schema_version": 2},
    {"device_id": "forged-device"},
])
def test_invalid_messages_are_rejected(changes):
    with pytest.raises(ValidationError):
        TelemetryV1.model_validate(message(**changes))


def test_out_of_range_keeps_numeric_value():
    reading = TelemetryV1.model_validate(message(
        values={"air_temperature": 65.0},
        quality={"air_temperature": "out_of_range"},
    ))
    assert reading.values["air_temperature"] == 65.0


def test_time_window_boundaries():
    received = datetime.now(timezone.utc)
    for measured in (received - timedelta(hours=24), received + timedelta(minutes=5)):
        TelemetryV1.model_validate(message(measured_at=measured.isoformat())).validate_received_at(received)
    for measured in (received - timedelta(hours=24, microseconds=1),
                     received + timedelta(minutes=5, microseconds=1)):
        with pytest.raises(ValueError, match="outside"):
            TelemetryV1.model_validate(message(measured_at=measured.isoformat())).validate_received_at(received)


def test_retry_hash_ignores_json_order_but_detects_changed_values():
    original = message()
    reordered = json.loads(json.dumps(original, sort_keys=True))
    reordered["values"] = dict(reversed(list(reordered["values"].items())))
    assert TelemetryV1.model_validate(original).payload_hash() == TelemetryV1.model_validate(reordered).payload_hash()

    reordered["values"]["air_temperature"] = 30.0
    assert TelemetryV1.model_validate(original).payload_hash() != TelemetryV1.model_validate(reordered).payload_hash()


def test_checked_in_json_schema_matches_model():
    schema_path = EXAMPLE.with_name("telemetry-v1.schema.json")
    assert json.loads(schema_path.read_text(encoding="utf-8")) == TelemetryV1.model_json_schema()
