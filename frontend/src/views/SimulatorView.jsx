import React, { useState } from 'react';
import {
  Dices,
  Send,
  Code2,
  Copy,
  Check,
  Lightbulb,
  Thermometer,
  Droplets,
  Sprout,
  Scale,
  Waves,
  Clock,
  Radio,
} from 'lucide-react';
import { sendTelemetryV1 } from '../services/api';

export default function SimulatorView({
  devices = [],
  selectedDeviceId,
  onSelectDevice,
  onIngestSuccess,
}) {
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];
  const token = selectedDevice?.token?.raw_token || '';

  // Form State
  const [airTemp, setAirTemp] = useState(28.5);
  const [airHumidity, setAirHumidity] = useState(74.0);
  const [soilMoisture, setSoilMoisture] = useState(62.5);
  const [ph, setPh] = useState(6.7);
  const [tds, setTds] = useState(720);
  const [timeQuality] = useState('synced');
  const [uptimeSec, setUptimeSec] = useState(120);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Randomize helper
  const handleRandomize = () => {
    setAirTemp(parseFloat((25 + Math.random() * 8).toFixed(1)));
    setAirHumidity(parseFloat((60 + Math.random() * 25).toFixed(1)));
    setSoilMoisture(parseFloat((50 + Math.random() * 30).toFixed(1)));
    setPh(parseFloat((6.0 + Math.random() * 1.5).toFixed(2)));
    setTds(Math.round(600 + Math.random() * 400));
    setUptimeSec((prev) => prev + 30);
  };

  // Submit test telemetry
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Thiết bị chưa có Device Token hợp lệ để gửi dữ liệu.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      schema_version: 'v1',
      message_id: crypto.randomUUID ? crypto.randomUUID() : `sim-${Date.now()}`,
      sent_at: new Date().toISOString(),
      uptime_ms: uptimeSec * 1000,
      time_quality: timeQuality,
      values: {
        air_temperature: parseFloat(airTemp),
        air_humidity: parseFloat(airHumidity),
        soil_moisture: parseFloat(soilMoisture),
        solution_temperature: parseFloat((airTemp - 1.2).toFixed(1)),
        ph: parseFloat(ph),
        ph_voltage: parseFloat((ph * 0.42).toFixed(2)),
        tds: parseInt(tds, 10),
      },
      quality: {
        air_temperature: 'good',
        air_humidity: 'good',
        soil_moisture: 'good',
        ph: 'good',
        tds: 'good',
      },
      metadata: {
        simulator: true,
        device_code: selectedDevice?.device_code,
        battery_pct: 95,
        wifi_rssi_dbm: -58,
      },
    };

    try {
      const res = await sendTelemetryV1(token, payload);
      setResult(res);
      if (onIngestSuccess) onIngestSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const wokwiCode = `/*
 * Sensor Data Bridge - Firmware ESP32 Vườn Ươm Ớt Pepper Nursery
 * Thư viện yêu cầu: WiFi, HTTPClient, ArduinoJson (v6 hoặc v7)
 * Nền tảng: Wokwi ESP32 hoặc Board ESP32 thật
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "Wokwi-GUEST"; // Đổi thành WiFi nhà bạn khi nạp mạch thật
const char* WIFI_PASSWORD = "";

// Cấu hình Endpoint & Token xác thực trạm
const char* SERVER_URL   = "http://127.0.0.1:8000/api/v1/telemetry"; // Hoặc IP máy tính của bạn
const char* DEVICE_TOKEN = "${token || 'YOUR_DEVICE_TOKEN_HERE'}";

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n--- ESP32 SENSOR DATA BRIDGE KHỞI ĐỘNG ---");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    
    // Header xác thực Bearer Token của thiết bị
    String authHeader = String("Bearer ") + DEVICE_TOKEN;
    http.addHeader("Authorization", authHeader);

    // Chuẩn bị payload TelemetryV1
    StaticJsonDocument<512> doc;
    doc["schema_version"] = "v1";
    doc["message_id"]     = String(random(100000, 999999)) + "-" + String(millis());
    doc["sent_at"]        = "2026-11-07T12:00:00Z";
    doc["uptime_ms"]      = millis();
    doc["time_quality"]   = "synced";

    JsonObject vals = doc.createNestedObject("values");
    vals["air_temperature"]     = 28.5; // Thay bằng dht.readTemperature()
    vals["air_humidity"]        = 75.0; // Thay bằng dht.readHumidity()
    vals["soil_moisture"]       = 62.0; // Thay bằng analogRead(SOIL_PIN)
    vals["ph"]                  = 6.8;
    vals["tds"]                 = 750;

    JsonObject quality = doc.createNestedObject("quality");
    quality["air_temperature"] = "good";
    quality["air_humidity"]    = "good";
    quality["soil_moisture"]   = "good";
    quality["ph"]              = "good";

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.println("Gửi telemetry lên Sensor Data Bridge...");
    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
      Serial.printf("Server phản hồi [%d]: %s\\n", httpResponseCode, http.getString().c_str());
    } else {
      Serial.printf("Lỗi gửi dữ liệu: %s\\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }

  delay(${selectedDevice?.interval_seconds ? selectedDevice.interval_seconds * 1000 : 30000}); // Chu kỳ gửi định kỳ
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(wokwiCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="view-container">
      {/* HEADER SECTION */}
      <div className="view-header-bar">
        <div>
          <h2 className="view-heading">Mô Phỏng ESP32 & Nạp Code Wokwi</h2>
          <p className="view-subheading">
            Kiểm thử gửi telemetry trực tiếp từ Web hoặc copy mã nguồn C++ có sẵn Device Token để chạy trên Wokwi
          </p>
        </div>

        {devices.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trạm áp dụng:</span>
            <select
              className="select-input"
              value={selectedDeviceId || ''}
              onChange={(e) => onSelectDevice(parseInt(e.target.value, 10))}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.device_code} ({d.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="simulator-layout">
        {/* LEFT COLUMN: INTERACTIVE SIMULATION FORM */}
        <div className="simulator-form-panel">
          <div className="panel-title-bar">
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="#38bdf8" /> Giả Lập Gửi Telemetry V1
              </h3>
              <p className="panel-desc">Gửi gói tin HTTP POST trực tiếp đến Backend</p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleRandomize}
              title="Tự động tạo các giá trị ngẫu nhiên hợp lệ"
            >
              <Dices size={14} /> Ngẫu Nhiên
            </button>
          </div>

          <form onSubmit={handleSubmit} className="sim-form">
            <div className="form-group">
              <label>Device Token (Trạm {selectedDevice?.device_code}):</label>
              <input
                type="text"
                className="input-code"
                readOnly
                value={token || 'Chưa có Token! Hãy vào mục Thiết Bị để cấp token.'}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Thermometer size={14} color="#f97316" /> Nhiệt độ khí (°C):
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input-text"
                  value={airTemp}
                  onChange={(e) => setAirTemp(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplets size={14} color="#38bdf8" /> Độ ẩm không khí (%):
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input-text"
                  value={airHumidity}
                  onChange={(e) => setAirHumidity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sprout size={14} color="#10b981" /> Độ ẩm đất vườn ớt (%):
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input-text"
                  value={soilMoisture}
                  onChange={(e) => setSoilMoisture(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scale size={14} color="#eab308" /> Độ pH dung dịch:
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input-text"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Waves size={14} color="#06b6d4" /> TDS (ppm):
                </label>
                <input
                  type="number"
                  className="input-text"
                  value={tds}
                  onChange={(e) => setTds(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="#94a3b8" /> Thời gian chạy trạm (s):
                </label>
                <input
                  type="number"
                  className="input-text"
                  value={uptimeSec}
                  onChange={(e) => setUptimeSec(parseInt(e.target.value, 10))}
                  required
                />
              </div>
            </div>

            {error && <div className="alert-error" style={{ margin: '12px 0' }}>⚠️ {error}</div>}

            {result && (
              <div className="alert-success" style={{ margin: '12px 0' }}>
                <div style={{ fontWeight: '600' }}>✅ Gửi Telemetry Thành Công!</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Record ID: #{result.record_id} • Status: {result.status} {result.duplicate ? '(Duplicate check ok)' : ''}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary btn-block"
              style={{ marginTop: '14px', padding: '10px' }}
              disabled={loading || !token}
            >
              {loading ? (
                'Đang gửi gói tin...'
              ) : (
                <>
                  <Send size={16} /> Gửi Gói Tin Telemetry Lên Server
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: WOKWI / ARDUINO READY CODE */}
        <div className="simulator-code-panel">
          <div className="panel-title-bar">
            <div>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={18} color="#a855f7" /> Mã Nguồn C++ Arduino / Wokwi
              </h3>
              <p className="panel-desc">Đã điền sẵn Token trạm {selectedDevice?.device_code}</p>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleCopyCode}
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              {copiedCode ? 'Đã Copy Code!' : 'Copy Toàn Bộ Code'}
            </button>
          </div>

          <div className="code-viewer-container">
            <pre className="code-pre">
              <code>{wokwiCode}</code>
            </pre>
          </div>

          <div className="wokwi-tips">
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={16} color="#eab308" /> Hướng dẫn chạy trên Wokwi:
            </strong>
            <ol style={{ paddingLeft: '20px', marginTop: '6px', fontSize: '0.85rem' }}>
              <li>Truy cập <a href="https://wokwi.com/projects/new/esp32" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>wokwi.com/esp32</a>.</li>
              <li>Dán mã nguồn trên vào file <code>sketch.ino</code>.</li>
              <li>Thêm thư viện <code>ArduinoJson</code> vào tab Library Manager.</li>
              <li>Nhấn <strong>Play (Start Simulation)</strong> để xem ESP32 gửi dữ liệu!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
