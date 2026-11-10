import React, { useMemo } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { formatDate, parseUtcDate } from '../utils/date';

const palette = ['#007AFF', '#30A46C', '#AF52DE', '#FF9500', '#5AC8FA', '#FF2D55', '#8E8E93', '#BF5AF2'];

const formatValue = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value));
};

export default function ChannelChart({ field, feeds = [], colorIndex = 0, onViewHistory }) {
  const chart = useMemo(() => {
    const points = feeds
      .map((feed) => ({
        timestamp: parseUtcDate(feed.received_at)?.getTime() || 0,
        receivedAt: feed.received_at,
        value: feed.values?.[field.key],
      }))
      .filter((point) => Number.isFinite(point.timestamp) && point.value !== null && point.value !== undefined && Number.isFinite(Number(point.value)))
      .map((point) => ({ ...point, value: Number(point.value) }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (!points.length) return { points, path: '', min: 0, max: 0, latest: null };
    const rawValues = points.map((point) => point.value);
    const rawMin = Math.min(...rawValues);
    const rawMax = Math.max(...rawValues);
    const padding = rawMin === rawMax ? Math.max(Math.abs(rawMin) * 0.08, 1) : (rawMax - rawMin) * 0.12;
    const min = rawMin - padding;
    const max = rawMax + padding;
    const width = 640;
    const height = 230;
    const left = 44;
    const right = 16;
    const top = 18;
    const bottom = 28;
    const x = (index) => left + (points.length === 1 ? (width - left - right) / 2 : (index / (points.length - 1)) * (width - left - right));
    const y = (value) => top + ((max - value) / (max - min || 1)) * (height - top - bottom);
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`).join(' ');
    return { points, path, min, max, x, y, width, height, left, right, top, bottom, latest: points[points.length - 1] };
  }, [feeds, field.key]);

  const color = palette[colorIndex % palette.length];

  return (
    <article
      className={`chart-card card ${onViewHistory ? 'interactive-card' : ''}`}
      onClick={() => onViewHistory && onViewHistory(field.key)}
      title={onViewHistory ? `Nhấp để xem lịch sử đo chi tiết của ${field.name}` : undefined}
    >
      <div className="chart-card-heading">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h3>{field.name}</h3>
            {onViewHistory && (
              <ChevronRight size={16} className="card-navigate-arrow" />
            )}
          </div>
          <span className="chart-field-meta">{field.key}{field.unit ? ` · ${field.unit}` : ''}</span>
        </div>
        <div className="chart-latest-value" style={{ color }}>
          {chart.latest ? `${formatValue(chart.latest.value)}${field.unit ? ` ${field.unit}` : ''}` : '—'}
        </div>
      </div>

      {!chart.points.length ? (
        <div className="chart-empty">
          <Activity size={24} />
          <strong>Chưa có dữ liệu để hiển thị</strong>
          <span>Biểu đồ sẽ xuất hiện khi Channel nhận được {field.key}.</span>
        </div>
      ) : (
        <>
          <div className="chart-canvas-wrap">
            <svg className="sensor-chart" viewBox="0 0 640 230" role="img" aria-label={`Biểu đồ ${field.name}`}>
              {[0, 0.5, 1].map((ratio) => {
                const y = chart.top + ratio * (chart.height - chart.top - chart.bottom);
                const value = chart.max - ratio * (chart.max - chart.min);
                return (
                  <g key={ratio}>
                    <line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} className="chart-grid-line" />
                    <text x="4" y={y + 4} className="chart-axis-label">{formatValue(value)}</text>
                  </g>
                );
              })}
              <path d={chart.path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {chart.points.map((point, index) => (
                <circle key={`${point.timestamp}-${index}`} cx={chart.x(index)} cy={chart.y(point.value)} r="2.75" fill="var(--color-surface)" stroke={color} strokeWidth="2">
                  <title>{`${formatValue(point.value)}${field.unit ? ` ${field.unit}` : ''} · ${formatDate(point.receivedAt, true)}`}</title>
                </circle>
              ))}
              <text x={chart.left} y={chart.height - 4} className="chart-axis-label">{formatDate(chart.points[0].receivedAt)}</text>
              <text x={chart.width - chart.right} y={chart.height - 4} textAnchor="end" className="chart-axis-label">{formatDate(chart.points[chart.points.length - 1].receivedAt)}</text>
            </svg>
          </div>
          <div className="chart-card-footer">
            <span>{chart.points.length} điểm đo hợp lệ</span>
            {chart.latest && (
              <span>Cập nhật {formatDate(chart.latest.receivedAt, true)}</span>
            )}
          </div>
          <details className="chart-data-details" onClick={(e) => e.stopPropagation()}>
            <summary>Xem bảng dữ liệu</summary>
            <div className="chart-table-wrap">
              <table>
                <thead>
                  <tr><th>Thời gian</th><th>Giá trị</th></tr>
                </thead>
                <tbody>
                  {[...chart.points].reverse().slice(0, 5).map((point) => (
                    <tr key={`${point.timestamp}-${point.value}`}>
                      <td>{formatDate(point.receivedAt, true)}</td>
                      <td className="numeric">{formatValue(point.value)}{field.unit ? ` ${field.unit}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </article>
  );
}
