import React from 'react';
import { Activity, Clock3, Database, RefreshCw, Settings2, Table } from 'lucide-react';
import ChannelChart from './ChannelChart';
import { formatDate as formatUtcDate } from '../utils/date';

const formatDate = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  return formatUtcDate(value, { includeDate: true, dateStyle: 'medium' });
};

export default function ChannelPrivateView({ channel, data, loading, onRefresh, onOpenKeys, onOpenFeeds, onManageFields }) {
  const currentChannel = data?.channel || channel;
  const fields = data?.fields || currentChannel?.fields || [];
  const feeds = data?.feeds || [];
  const latestFeed = feeds[feeds.length - 1];

  return (
    <section className="page-stack">
      <div className="channel-hero card">
        <div>
          <span className="eyebrow">PRIVATE VIEW</span>
          <h2>{currentChannel?.name}</h2>
          <p>{currentChannel?.description || 'Theo dõi dữ liệu cảm biến theo thời gian thực.'}</p>
        </div>
        <div className="channel-id-block">
          <span>CHANNEL ID</span>
          <strong className="numeric">{currentChannel?.id}</strong>
        </div>
      </div>

      <div className="channel-toolbar">
        <div className="toolbar-status">
          <span className={`status-dot ${latestFeed ? 'online' : 'idle'}`} />
          <span>{latestFeed ? `Nhận dữ liệu gần nhất ${formatDate(latestFeed.received_at)}` : 'Chưa nhận dữ liệu mới'}</span>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn-secondary btn-small" onClick={onOpenFeeds}>
            <Table size={15} /> Lịch sử dữ liệu
          </button>
          <button type="button" className="btn-secondary btn-small" onClick={onManageFields}>
            <Settings2 size={15} /> Quản lý field
          </button>
          <button type="button" className="btn-tertiary btn-small" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Làm mới
          </button>
          <button type="button" className="btn-secondary btn-small" onClick={onOpenKeys}>
            <Settings2 size={15} /> Quản lý API Keys
          </button>
        </div>
      </div>

      <div className="metric-summary-grid">
        <div className="metric-summary card">
          <div className="summary-icon blue"><Database size={18} /></div>
          <div><span>Tổng số bản ghi</span><strong className="numeric">{data?.entries ?? currentChannel?.entries ?? 0}</strong></div>
        </div>
        <div className="metric-summary card">
          <div className="summary-icon green"><Activity size={18} /></div>
          <div><span>Số field cấu hình</span><strong className="numeric">{fields.length}</strong></div>
        </div>
        <div className="metric-summary card">
          <div className="summary-icon orange"><Clock3 size={18} /></div>
          <div><span>Cập nhật gần nhất</span><strong>{formatDate(data?.latest_received_at || currentChannel?.latest_received_at)}</strong></div>
        </div>
      </div>

      {loading && !data ? (
        <div className="loading-state card"><div className="spinner" /> Đang tải dữ liệu biểu đồ...</div>
      ) : fields.length === 0 ? (
        <div className="empty-state card">
          <Activity size={30} />
          <h3>Channel chưa có field</h3>
          <p>Hãy cấu hình field trước khi gửi số đo từ ESP32.</p>
          <button type="button" className="btn-primary" onClick={onManageFields}>Thêm field</button>
        </div>
      ) : (
        <div className="chart-grid">
          {fields.map((field, index) => (
            <ChannelChart
              key={field.id || field.key}
              field={field}
              feeds={feeds}
              colorIndex={index}
              onViewHistory={onOpenFeeds}
            />
          ))}
        </div>
      )}
    </section>
  );
}
