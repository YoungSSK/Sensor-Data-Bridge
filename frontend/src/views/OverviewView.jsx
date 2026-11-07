import React, { useState } from 'react';
import {
  Folder,
  Cpu,
  Activity,
  Clock,
  KeyRound,
  Copy,
  Check,
  Settings2,
  Plus,
  Send,
} from 'lucide-react';
import MultiMetricCards from '../components/MultiMetricCards';
import TelemetryLogTable from '../components/TelemetryLogTable';

export default function OverviewView({
  project,
  devices = [],
  selectedDeviceId,
  setSelectedDeviceId,
  latestData,
  historyData,
  onOpenCreateDevice,
  onOpenSimulate,
  onOpenTokenModal,
}) {
  const [quickCopied, setQuickCopied] = useState(false);
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  const isDeviceOnline = (dev) => {
    if (!dev?.last_seen_at) return false;
    const diffMs = Date.now() - new Date(dev.last_seen_at).getTime();
    return diffMs < 120000;
  };

  const onlineDevicesCount = devices.filter(isDeviceOnline).length;
  const recentLogs = historyData?.readings ? { readings: historyData.readings.slice(0, 5) } : null;

  const handleCopyToken = (token) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setQuickCopied(true);
    setTimeout(() => setQuickCopied(false), 2000);
  };

  return (
    <div className="view-container">
      {/* 1. TOP SUMMARY CARDS */}
      <div className="overview-stats-grid">
        <div className="stat-card">
          <div className="stat-icon icon-blue">
            <Folder size={22} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Dự Án Đang Chọn</span>
            <div className="stat-val">{project?.name || 'Chưa chọn dự án'}</div>
            <span className="stat-sub">Mã: #{project?.id || '—'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-green">
            <Cpu size={22} color="#10b981" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Trạm Đo ESP32</span>
            <div className="stat-val">
              {devices.length} <span className="stat-sub-val">({onlineDevicesCount} online)</span>
            </div>
            <span className="stat-sub">{onlineDevicesCount > 0 ? 'Đang truyền dữ liệu' : 'Đang chờ kết nối'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-purple">
            <Activity size={22} color="#a855f7" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Gói Tin Telemetry</span>
            <div className="stat-val">{historyData?.total || 0}</div>
            <span className="stat-sub">Lịch sử bản ghi đa chiều</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-amber">
            <Clock size={22} color="#f59e0b" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Chu Kỳ Báo Cáo</span>
            <div className="stat-val">{selectedDevice?.interval_seconds || 30}s</div>
            <span className="stat-sub">Revision: v{selectedDevice?.metrics_revision || 1}</span>
          </div>
        </div>
      </div>

      {/* 2. DEVICE SWITCHER BAR */}
      <div className="device-selection-card">
        <div className="device-bar-left">
          <span className="bar-title">Chọn Trạm Giám Sát:</span>
          {devices.length === 0 ? (
            <span className="text-muted">Dự án chưa có thiết bị nào.</span>
          ) : (
            <div className="device-pills-row">
              {devices.map((d) => {
                const online = isDeviceOnline(d);
                const isSelected = d.id === selectedDeviceId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`device-pill-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDeviceId(d.id)}
                  >
                    <span className={`status-dot ${online ? 'dot-online' : 'dot-offline'}`} />
                    <span className="device-pill-code">{d.device_code}</span>
                    <span className="device-pill-name">({d.name})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="device-bar-right">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onOpenCreateDevice}
          >
            <Plus size={13} /> Đăng Ký Trạm
          </button>
          {selectedDevice && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={onOpenSimulate}
            >
              <Send size={13} /> Giả Lập Gửi Đo
            </button>
          )}
        </div>
      </div>

      {/* 3. DEVICE TOKEN BANNER (QUICK ACCESS) */}
      {selectedDevice && (
        <div className="token-banner-card">
          <div className="token-banner-top">
            <div className="token-banner-title-group">
              <span className="token-key-icon">
                <KeyRound size={20} color="#38bdf8" />
              </span>
              <div>
                <strong className="token-banner-title">
                  Device Token trạm {selectedDevice.device_code}
                </strong>
                <span className="token-banner-desc">
                  Mã bí mật xác thực HTTP Bearer Token gửi từ ESP32 / Wokwi
                </span>
              </div>
            </div>

            <div className="token-banner-actions">
              {selectedDevice.token?.raw_token && (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => handleCopyToken(selectedDevice.token.raw_token)}
                >
                  {quickCopied ? <Check size={14} /> : <Copy size={14} />}
                  {quickCopied ? 'Đã Copy Token!' : 'Copy Token Nhanh'}
                </button>
              )}
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => onOpenTokenModal(selectedDevice)}
              >
                <Settings2 size={14} /> Quản Lý / Xem Thêm Token
              </button>
            </div>
          </div>

          <div className="token-banner-body">
            {selectedDevice.token?.raw_token ? (
              <div className="token-code-row">
                <code className="token-code-display">{selectedDevice.token.raw_token}</code>
                <span className="token-help-text">
                  (Dán vào biến <code>DEVICE_TOKEN</code> trong mã nguồn Arduino / Wokwi)
                </span>
              </div>
            ) : (
              <div className="token-empty-row">
                <span className="text-muted">
                  Token đang được quản lý bảo mật. Bấm <strong>Quản Lý Token</strong> để xem danh sách hoặc cấp mới.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. REAL-TIME MULTI-METRIC CARDS */}
      {selectedDevice ? (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">
                Số Đo Cảm Biến Thời Gian Thực • {selectedDevice.name} ({selectedDevice.device_code})
              </h2>
              <p className="section-desc">Dữ liệu telemetry mới nhất do ESP32 truyền về trạm điều hành</p>
            </div>
            <div className="section-status">
              <span className={`badge ${isDeviceOnline(selectedDevice) ? 'badge-online' : ''}`}>
                <span className={`status-dot ${isDeviceOnline(selectedDevice) ? 'dot-online' : 'dot-offline'}`} />
                {isDeviceOnline(selectedDevice) ? 'ESP32 Online' : 'Chờ kết nối'}
              </span>
            </div>
          </div>

          <MultiMetricCards latestData={latestData} device={selectedDevice} />

          {/* 5. RECENT 5 TELEMETRY RECORDS */}
          <div className="section-header" style={{ marginTop: '36px' }}>
            <div>
              <h2 className="section-title">Nhật Ký Dữ Liệu Gần Đây (5 bản ghi mới nhất)</h2>
              <p className="section-desc">Bản ghi lịch sử đầy đủ xem tại mục <strong>Nhật Ký Đo</strong> ở menu bên trái</p>
            </div>
          </div>

          <TelemetryLogTable historyData={recentLogs} />
        </>
      ) : (
        <div className="empty-state-card" style={{ marginTop: '24px' }}>
          <Cpu size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#fff' }}>Chưa có thiết bị nào trong dự án này</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '8px 0 16px' }}>
            Hãy đăng ký thiết bị ESP32 đầu tiên để bắt đầu nhận dữ liệu telemetry từ trạm vườn ươm.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenCreateDevice}
          >
            <Plus size={16} /> Đăng Ký Thiết Bị ESP32 Đầu Tiên
          </button>
        </div>
      )}
    </div>
  );
}
