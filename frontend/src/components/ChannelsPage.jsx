import React from 'react';
import { Activity, ArrowRight, Database, Plus, RadioTower } from 'lucide-react';
import { formatDate as formatUtcDate } from '../utils/date';

const formatDate = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  return formatUtcDate(value, { includeDate: true, dateStyle: 'medium' });
};

export default function ChannelsPage({ channels, loading, onOpenCreate, onOpenChannel }) {
  return (
    <section className="page-stack">
      <div className="section-heading-row page-title-row">
        <div>
          <span className="eyebrow">WORKSPACE</span>
          <h1>Channels</h1>
          <p>Quản lý các kênh dữ liệu cảm biến của bạn.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onOpenCreate}>
          <Plus size={17} /> Tạo Channel
        </button>
      </div>

      <div className="overview-strip">
        <div className="overview-strip-item">
          <div className="summary-icon blue"><RadioTower size={18} /></div>
          <div><span>Channel của bạn</span><strong className="numeric">{channels.length}</strong></div>
        </div>
        <div className="overview-strip-item">
          <div className="summary-icon green"><Database size={18} /></div>
          <div><span>Tổng bản ghi</span><strong className="numeric">{channels.reduce((total, channel) => total + (channel.entries || 0), 0)}</strong></div>
        </div>
        <div className="overview-strip-item">
          <div className="summary-icon purple"><Activity size={18} /></div>
          <div><span>Trạng thái</span><strong>{loading ? 'Đang tải' : 'Sẵn sàng'}</strong></div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state card"><div className="spinner" /> Đang tải Channel...</div>
      ) : channels.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><RadioTower size={30} /></div>
          <h2>Bạn chưa có Channel nào</h2>
          <p>Tạo Channel đầu tiên để cấu hình field và nhận số đo từ ESP32.</p>
          <button type="button" className="btn-primary" onClick={onOpenCreate}><Plus size={17} /> Tạo Channel đầu tiên</button>
        </div>
      ) : (
        <div className="channel-grid">
          {channels.map((channel) => (
            <article className="channel-card card" key={channel.id}>
              <div className="channel-card-topline">
                <span className="channel-status"><span className="status-dot idle" /> Private</span>
                <span className="channel-card-id numeric">ID {channel.id}</span>
              </div>
              <div className="channel-card-title-row">
                <div className="channel-card-icon"><RadioTower size={20} /></div>
                <h2>{channel.name}</h2>
              </div>
              <p className="channel-card-description">{channel.description || 'Chưa có mô tả cho Channel này.'}</p>
              <div className="channel-card-meta">
                <span>{channel.fields?.length || 0} field</span>
                <span>{channel.entries || 0} bản ghi</span>
              </div>
              <div className="channel-card-footer">
                <span className="muted-small">{formatDate(channel.latest_received_at)}</span>
                <button type="button" className="btn-secondary btn-small" onClick={() => onOpenChannel(channel.id)}>
                  Xem dữ liệu <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
