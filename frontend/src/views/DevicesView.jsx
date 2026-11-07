import React, { useState } from 'react';
import {
  Plus,
  Cpu,
  Copy,
  Check,
  Settings2,
  BarChart3,
  Send,
  Lightbulb,
} from 'lucide-react';

export default function DevicesView({
  project,
  devices = [],
  selectedDeviceId,
  onSelectDevice,
  onOpenCreateDevice,
  onOpenTokenModal,
  onOpenSimulate,
  onNavigateToOverview,
}) {
  const [copiedId, setCopiedId] = useState(null);

  const isDeviceOnline = (dev) => {
    if (!dev?.last_seen_at) return false;
    const diffMs = Date.now() - new Date(dev.last_seen_at).getTime();
    return diffMs < 120000;
  };

  const handleCopy = (token, devId) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedId(devId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="view-container">
      {/* HEADER SECTION */}
      <div className="view-header-bar">
        <div>
          <h2 className="view-heading">
            Thiết Bị & Device Token • {project?.name || 'Chưa chọn dự án'}
          </h2>
          <p className="view-subheading">
            Quản lý các trạm vi điều khiển ESP32 và khóa bí mật (Device Token) dùng cho nạp code và xác thực
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onOpenCreateDevice}
        >
          <Plus size={16} /> Đăng Ký Trạm Mới
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="empty-state-card">
          <Cpu size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#fff' }}>Chưa có thiết bị nào trong dự án này</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '8px 0 16px' }}>
            Nhấn vào nút bên dưới để tạo thiết bị ESP32 đầu tiên và nhận Device Token.
          </p>
          <button type="button" className="btn-primary" onClick={onOpenCreateDevice}>
            <Plus size={16} /> Đăng Ký Trạm ESP32 Đầu Tiên
          </button>
        </div>
      ) : (
        <>
          {/* DEVICES & TOKENS TABLE */}
          <div className="table-section">
            <table className="devices-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Trạng Thái</th>
                  <th>Mã Trạm (Code)</th>
                  <th>Tên Trạm</th>
                  <th>Chu Kỳ</th>
                  <th>Lần Cuối Online</th>
                  <th style={{ minWidth: '320px' }}>Device Token (Xác Thực ESP32)</th>
                  <th style={{ width: '190px', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const online = isDeviceOnline(d);
                  const isCurrentSelected = d.id === selectedDeviceId;
                  const rawToken = d.token?.raw_token;

                  return (
                    <tr
                      key={d.id}
                      className={isCurrentSelected ? 'row-selected' : ''}
                    >
                      {/* Trạng thái */}
                      <td>
                        <span className={`badge ${online ? 'badge-online' : ''}`}>
                          <span className={`status-dot ${online ? 'dot-online' : 'dot-offline'}`} />
                          {online ? 'Online' : 'Offline'}
                        </span>
                      </td>

                      {/* Mã trạm */}
                      <td>
                        <strong className="code-text" style={{ fontSize: '0.95rem' }}>
                          {d.device_code}
                        </strong>
                      </td>

                      {/* Tên trạm */}
                      <td>
                        <span style={{ fontWeight: '500' }}>{d.name}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Rev: v{d.metrics_revision}
                        </div>
                      </td>

                      {/* Chu kỳ */}
                      <td>
                        <span className="interval-badge">{d.interval_seconds}s</span>
                      </td>

                      {/* Lần cuối online */}
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : 'Chưa từng online'}
                      </td>

                      {/* Device Token */}
                      <td>
                        {rawToken ? (
                          <div className="token-table-cell">
                            <code className="token-inline" title={rawToken}>
                              {rawToken}
                            </code>
                            <div className="token-inline-actions">
                              <button
                                type="button"
                                className="btn-token-copy"
                                onClick={() => handleCopy(rawToken, d.id)}
                                title="Sao chép Device Token vào clipboard"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                {copiedId === d.id ? <Check size={12} /> : <Copy size={12} />}
                                {copiedId === d.id ? 'Đã Copy!' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                className="btn-token-manage"
                                onClick={() => onOpenTokenModal(d)}
                                title="Xem lịch sử và quản lý cấp mới token"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Settings2 size={12} /> Quản lý
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="token-table-cell">
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Bảo mật (Đã mã hóa)
                            </span>
                            <button
                              type="button"
                              className="btn-token-manage"
                              onClick={() => onOpenTokenModal(d)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Settings2 size={12} /> Cấp / Đổi Token
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-secondary btn-xs"
                            onClick={() => {
                              onSelectDevice(d.id);
                              onNavigateToOverview();
                            }}
                            title="Xem bảng số đo thời gian thực"
                          >
                            <BarChart3 size={12} /> Giám Sát
                          </button>
                          <button
                            type="button"
                            className="btn-primary btn-xs"
                            onClick={() => {
                              onSelectDevice(d.id);
                              onOpenSimulate(d);
                            }}
                            title="Gửi gói tin giả lập từ thiết bị này"
                          >
                            <Send size={12} /> Gửi Đo
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOKEN GUIDE CARD */}
          <div className="guide-card" style={{ marginTop: '28px' }}>
            <h3 className="guide-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={18} color="#eab308" />
              Cách Sử Dụng Device Token Cho ESP32 & Wokwi
            </h3>
            <p className="guide-text">
              Mỗi thiết bị ESP32 cần một <code>Device Token</code> duy nhất. Khi gửi bản tin telemetry tới API <code>POST /api/v1/telemetry</code>, ESP32 phải đính kèm token vào Header:
            </p>
            <div className="guide-code-block">
              <code>Authorization: Bearer &lt;DEVICE_TOKEN&gt;</code>
            </div>
            <p className="guide-text" style={{ marginTop: '8px' }}>
              Bạn có thể sao chép token trực tiếp từ bảng trên bằng nút <strong>Copy</strong> và dán vào file code <code>firmware.ino</code> hoặc chuyển sang tab <strong>Mô Phỏng & Wokwi</strong> ở menu bên trái để lấy code mẫu có sẵn token!
            </p>
          </div>
        </>
      )}
    </div>
  );
}
