# Telemetry contract v1

`telemetry-v1.example.json` is a sample device message. `telemetry-v1.schema.json`
is generated from `app.schemas.telemetry.TelemetryV1` and can be used by clients
for basic shape validation. The Pydantic model also enforces relationships that
JSON Schema does not express: matching `values`/`quality` keys, finite numbers,
quality-to-value pairing, and UTC or absent measurement time.

The planned `POST /api/v1/telemetry` endpoint is **not available yet**. The
existing `POST /api/v1/sensors/readings` endpoint and dashboard still use the
single-value legacy payload. A later migration will add devices, token-based
identity, immutable metric revisions, and atomic storage before the new endpoint
is enabled. Do not send `device_id` in the message: the API must resolve it from
the device token. The schema alone cannot check whether a metric key belongs to
the device's declared revision; ingestion must check that against the database.

The message ID is generated once per measurement and reused on retry. A future
database unique key on `(device_id, message_id)` will make retries idempotent.
`payload_hash()` canonicalizes the business payload for comparing retries; it
does not by itself prevent duplicate inserts. For `synced` messages, ingestion
will reject measurements more than 24 hours old or over 5 minutes ahead of the
server time. For `unsynced` messages, `measured_at` is null and the server
receipt time becomes the effective time. All times are UTC.

To regenerate the JSON Schema from the repository root:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -c "import json; from pathlib import Path; from app.schemas.telemetry import TelemetryV1; Path('../docs/contracts/telemetry-v1.schema.json').write_text(json.dumps(TelemetryV1.model_json_schema(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')"
```
