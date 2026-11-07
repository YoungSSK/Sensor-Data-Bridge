import React from 'react';

export default function TelemetryLogTable({ historyData }) {
  const readings = historyData?.readings || [];

  if (readings.length === 0) {
    return (
      <div className="table-section" style={{ textAlign: 'center', padding: '30px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Chưa có bản ghi lịch sử đo nào được lưu.</p>
      </div>
    );
  }

  const formatUptime = (ms) => {
    if (!ms) return '0s';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="table-section">
      <table>
        <thead>
          <tr>
            <th>Thời Gian (Effective)</th>
            <th>Mã Bản Tin (UUID)</th>
            <th>Đồng Bộ Giờ</th>
            <th>Nhiệt Độ Khí</th>
            <th>Độ Ẩm Khí</th>
            <th>Độ Ẩm Đất</th>
            <th>pH</th>
            <th>Uptime</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((r) => {
            const vals = r.values || {};
            return (
              <tr key={r.id}>
                <td>{new Date(r.effective_at).toLocaleString()}</td>
                <td>
                  <code style={{ fontSize: '0.8rem', color: '#cbd5e1' }} title={r.message_id}>
                    {r.message_id.slice(0, 8)}...
                  </code>
                </td>
                <td>
                  <span className={`time-pill ${r.time_quality === 'synced' ? 'pill-synced' : 'pill-unsynced'}`}>
                    {r.time_quality}
                  </span>
                </td>
                <td style={{ color: '#f97316', fontWeight: '600' }}>
                  {vals.air_temperature !== undefined ? `${vals.air_temperature} °C` : '—'}
                </td>
                <td style={{ color: '#38bdf8', fontWeight: '600' }}>
                  {vals.air_humidity !== undefined ? `${vals.air_humidity} %` : '—'}
                </td>
                <td style={{ color: '#10b981', fontWeight: '600' }}>
                  {vals.soil_moisture !== undefined ? `${vals.soil_moisture} %` : '—'}
                </td>
                <td style={{ color: '#eab308' }}>
                  {vals.ph !== undefined ? vals.ph : '—'}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {formatUptime(r.uptime_ms)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
