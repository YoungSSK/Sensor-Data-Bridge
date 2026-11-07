import React, { useState } from 'react';
import {
  Send,
  Thermometer,
  Droplets,
  Sprout,
  FlaskConical,
  Scale,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { sendTelemetryV1 } from '../services/api';

export default function SimulateTelemetryModal({ isOpen, onClose, device, onIngestSuccess }) {
  const [deviceToken, setDeviceToken] = useState('');

  React.useEffect(() => {
    if (isOpen && device?.token?.raw_token) {
      setDeviceToken(device.token.raw_token);
    }
  }, [isOpen, device]);
  const [messageId, setMessageId] = useState(() => crypto.randomUUID());
  const [airTemp, setAirTemp] = useState('29.5');
  const [airHum, setAirHum] = useState('75.0');
  const [soilMoist, setSoilMoist] = useState('62.0');
  const [solutionTemp, setSolutionTemp] = useState('27.6');
  const [ph, setPh] = useState('6.5');
  const [isRetry, setIsRetry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseLog, setResponseLog] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!deviceToken.trim()) {
      setError('Vui lòng nhập Device Token của trạm.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponseLog(null);

    const payload = {
      schema_version: 1,
      metrics_revision: device.metrics_revision || 1,
      message_id: messageId,
      measured_at: new Date().toISOString(),
      time_quality: 'synced',
      uptime_ms: 125000,
      values: {
        air_temperature: parseFloat(airTemp),
        air_humidity: parseFloat(airHum),
        soil_moisture: parseFloat(soilMoist),
        solution_temperature: parseFloat(solutionTemp),
        ph: parseFloat(ph),
      },
      quality: {
        air_temperature: 'valid',
        air_humidity: 'valid',
        soil_moisture: 'valid',
        solution_temperature: 'valid',
        ph: 'valid',
      },
      calibration_revision: 'cal-v1',
      firmware_version: '0.1.0-esp32',
    };

    try {
      const res = await sendTelemetryV1(deviceToken.trim(), payload);
      setResponseLog(res);
      onIngestSuccess();
      if (!isRetry) {
        setMessageId(crypto.randomUUID());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#fff', margin: 0 }}>
            <Send size={20} color="#38bdf8" /> Mô Phỏng Gửi Gói Tin ESP32 (V1)
          </h2>
          <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Gửi gói tin đa chỉ số trực tiếp vào endpoint <code>POST /api/v1/telemetry</code> bằng Device Token của trạm <strong>{device?.device_code}</strong>.
        </p>

        {error && (
          <div className="alert-error" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {responseLog && (
          <div className="alert-success" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <CheckCircle2 size={16} color="#10b981" /> Phản hồi từ Server:
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              • Trạng thái: {responseLog.data.accepted ? 'Đã chấp nhận' : 'Từ chối'}<br />
              • Chống trùng lặp (Duplicate): {responseLog.data.duplicate ? 'Trùng bản tin (Idempotent 200 OK)' : 'Bản tin mới (201 Created)'}<br />
              • Received At: {new Date(responseLog.data.received_at).toLocaleTimeString()}
            </div>
          </div>
        )}

        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>Device Token (Bearer Token)</label>
            <input
              type="text"
              value={deviceToken}
              onChange={(e) => setDeviceToken(e.target.value)}
              placeholder="sdb_dev_..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Thermometer size={14} color="#f97316" /> Nhiệt độ không khí (°C)
              </label>
              <input type="number" step="0.1" value={airTemp} onChange={(e) => setAirTemp(e.target.value)} required />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={14} color="#38bdf8" /> Độ ẩm không khí (%)
              </label>
              <input type="number" step="0.1" value={airHum} onChange={(e) => setAirHum(e.target.value)} required />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sprout size={14} color="#10b981" /> Độ ẩm đất (%)
              </label>
              <input type="number" step="0.1" value={soilMoist} onChange={(e) => setSoilMoist(e.target.value)} required />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FlaskConical size={14} color="#a855f7" /> Nhiệt độ dung dịch (°C)
              </label>
              <input type="number" step="0.1" value={solutionTemp} onChange={(e) => setSolutionTemp(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scale size={14} color="#eab308" /> Độ pH
            </label>
            <input type="number" step="0.1" value={ph} onChange={(e) => setPh(e.target.value)} required />
          </div>

          <div className="form-group" style={{ background: '#090d16', padding: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ margin: 0, fontSize: '0.8rem' }}>Mã bản tin (Message ID):</label>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setMessageId(crypto.randomUUID())}
              >
                <RefreshCw size={11} /> Tạo mã mới
              </button>
            </div>
            <code style={{ fontSize: '0.8rem', color: '#94a3b8', wordBreak: 'break-all' }}>{messageId}</code>

            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isRetry}
                  onChange={(e) => setIsRetry(e.target.checked)}
                />
                Giữ nguyên message_id để thử nghiệm gửi lại (Test Retry / Idempotency)
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Đóng
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} />
              {loading ? 'Đang gửi...' : 'Gửi Telemetry V1'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
