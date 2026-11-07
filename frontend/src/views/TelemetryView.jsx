import React from 'react';
import { RefreshCw, Send, Activity } from 'lucide-react';
import TelemetryLogTable from '../components/TelemetryLogTable';

export default function TelemetryView({
  devices = [],
  selectedDeviceId,
  onSelectDevice,
  historyData,
  onRefresh,
  limit,
  onChangeLimit,
  onOpenSimulate,
}) {
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <div className="view-container">
      {/* HEADER BAR */}
      <div className="view-header-bar">
        <div>
          <h2 className="view-heading">Nhật Ký Dữ Liệu Đo Đa Chiều (Telemetry Logs)</h2>
          <p className="view-subheading">
            Theo dõi toàn bộ các gói tin telemetry theo chuẩn TelemetryV1 gửi từ vi điều khiển ESP32
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onRefresh}
            title="Tải lại dữ liệu mới nhất từ cơ sở dữ liệu"
          >
            <RefreshCw size={14} /> Làm Mới
          </button>
          {selectedDevice && (
            <button
              type="button"
              className="btn-primary"
              onClick={onOpenSimulate}
              title="Gửi bản tin đo mới giả lập"
            >
              <Send size={14} /> Gửi Đo Test
            </button>
          )}
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="control-bar" style={{ marginBottom: '20px' }}>
        <div className="bar-section">
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lọc Theo Trạm:</label>
          {devices.length > 0 ? (
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
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có trạm nào</span>
          )}
        </div>

        <div className="bar-actions">
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hiển thị:</label>
          <select
            className="select-input"
            value={limit}
            onChange={(e) => onChangeLimit(parseInt(e.target.value, 10))}
          >
            <option value={25}>25 bản ghi</option>
            <option value={50}>50 bản ghi</option>
            <option value={100}>100 bản ghi</option>
            <option value={200}>200 bản ghi</option>
          </select>

          <span className="badge" style={{ marginLeft: '6px' }}>
            Tổng: {historyData?.readings?.length || 0} bản ghi
          </span>
        </div>
      </div>

      {/* TELEMETRY TABLE */}
      {selectedDevice ? (
        <TelemetryLogTable historyData={historyData} />
      ) : (
        <div className="empty-state-card">
          <Activity size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#fff' }}>Chưa chọn thiết bị để xem nhật ký</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '8px 0 16px' }}>
            Vui lòng chọn một thiết bị ESP32 để tải lịch sử dữ liệu đo.
          </p>
        </div>
      )}
    </div>
  );
}
