# Telemetry contract v1

`telemetry-v1.example.json` is a sample device message. `telemetry-v1.schema.json`
is generated from `app.schemas.telemetry.TelemetryV1` and can be used by clients
for basic shape validation. The Pydantic model also enforces relationships that
JSON Schema does not express: matching `values`/`quality` keys, finite numbers,
quality-to-value pairing, and UTC or absent measurement time.

The `POST /api/v1/telemetry` endpoint is **available**. Devices authenticate via
the `Authorization: Bearer <DEVICE_TOKEN>` header. Do not send `device_id` in the message:
the API resolves it securely from the device token. Ingestion checks that `metrics_revision`
matches the device's assigned revision in the database.

The message ID is generated once per measurement and reused on retry. The database
unique key on `(device_id, message_id)` makes retries idempotent: retrying with the same
payload returns `duplicate: true` (HTTP 200); sending a different payload with the same
`message_id` returns HTTP 409 Conflict. `payload_hash()` canonicalizes the business payload
for comparing retries. For `synced` messages, ingestion rejects measurements more than 24 hours
old or over 5 minutes ahead of the server time. For `unsynced` messages, `measured_at` is null
and the server receipt time becomes the effective time. All times are UTC.

To regenerate the JSON Schema from the repository root:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -c "import json; from pathlib import Path; from app.schemas.telemetry import TelemetryV1; Path('../docs/contracts/telemetry-v1.schema.json').write_text(json.dumps(TelemetryV1.model_json_schema(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')"
```
