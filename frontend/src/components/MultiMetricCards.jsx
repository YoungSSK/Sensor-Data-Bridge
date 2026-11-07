import React from 'react';
import {
  Thermometer,
  Droplets,
  Sprout,
  FlaskConical,
  Scale,
  Zap,
  Waves,
  Activity,
  Radio,
} from 'lucide-react';

const METRIC_CONFIG = {
  air_temperature: { label: 'Nhiệt độ không khí', unit: '°C', icon: Thermometer, color: '#f97316' },
  air_humidity: { label: 'Độ ẩm không khí', unit: '%', icon: Droplets, color: '#38bdf8' },
  soil_moisture: { label: 'Độ ẩm đất (Vườn ớt)', unit: '%', icon: Sprout, color: '#10b981' },
  solution_temperature: { label: 'Nhiệt độ dung dịch', unit: '°C', icon: FlaskConical, color: '#a855f7' },
  ph: { label: 'Độ pH', unit: 'pH', icon: Scale, color: '#eab308' },
  ph_voltage: { label: 'Điện áp cảm biến pH', unit: 'V', icon: Zap, color: '#94a3b8' },
  tds: { label: 'Tổng chất rắn hòa tan (TDS)', unit: 'ppm', icon: Waves, color: '#06b6d4' },
};

export default function MultiMetricCards({ latestData, device }) {
  if (!latestData || !latestData.values || Object.keys(latestData.values).length === 0) {
    return (
      <div className="empty-state-card">
        <Radio size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ marginTop: '10px', color: '#fff' }}>Chưa nhận được gói tin Telemetry nào từ trạm</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '8px auto' }}>
          Trạm <strong>{device.device_code}</strong> đang chờ ESP32 gửi dữ liệu qua HTTPS API hoặc bạn có thể dùng nút <strong>"+ Mô Phỏng ESP32"</strong> để gửi dữ liệu mẫu.
        </p>
      </div>
    );
  }

  const { values, quality, effective_at, uptime_ms, time_quality } = latestData;

  const formatUptime = (ms) => {
    if (!ms) return '0s';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div>
      <div className="telemetry-meta-bar">
        <div>
          <span>Cập nhật lúc: </span>
          <strong>{effective_at ? new Date(effective_at).toLocaleString() : 'N/A'}</strong>
          <span className={`time-pill ${time_quality === 'synced' ? 'pill-synced' : 'pill-unsynced'}`}>
            ● {time_quality === 'synced' ? 'Đồng bộ giờ NTP' : 'Chưa đồng bộ giờ'}
          </span>
        </div>
        <div>
          <span>Thời gian chạy trạm (Uptime): </span>
          <strong style={{ color: '#38bdf8' }}>{formatUptime(uptime_ms)}</strong>
        </div>
      </div>

      <div className="grid">
        {Object.entries(values).map(([key, val]) => {
          const cfg = METRIC_CONFIG[key] || {
            label: key.replace(/_/g, ' '),
            unit: '',
            icon: Activity,
            color: '#38bdf8',
          };
          const IconComponent = cfg.icon;
          const qStatus = quality[key] || 'unknown';

          return (
            <div key={key} className="metric-card">
              <div className="metric-header">
                <span className="metric-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconComponent size={16} color={cfg.color} />
                  {cfg.label}
                </span>
                <span className={`quality-pill quality-${qStatus}`}>
                  {qStatus}
                </span>
              </div>

              <div className="metric-value-area">
                <span className="metric-value" style={{ color: cfg.color }}>
                  {val !== null && val !== undefined ? val : '—'}
                </span>
                <span className="metric-unit">{cfg.unit}</span>
              </div>

              <div className="metric-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Key: <code>{key}</code></span>
                {val !== null ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>● Bình thường</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#eab308' }}>⚠️ Không có số đo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
