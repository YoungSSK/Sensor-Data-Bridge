import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Filter,
  Layers,
  RefreshCw,
  RotateCcw,
  Table as TableIcon,
} from 'lucide-react';
import { getChannelFeeds } from '../services/api';
import { formatDate as formatUtcDate, parseUtcDate } from '../utils/date';

const formatDate = (value, includeSeconds = true) => {
  return formatUtcDate(value, { includeDate: true, includeSeconds });
};

const formatValue = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value));
};

export default function ChannelFeedsPage({ channel, initialFieldKey = 'all' }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFieldKey, setSelectedFieldKey] = useState(initialFieldKey || 'all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [historyResult, setHistoryResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fields = channel?.fields || [];

  // Update selected field if initialFieldKey changes from navigation
  useEffect(() => {
    if (initialFieldKey) {
      setSelectedFieldKey(initialFieldKey);
      setPage(1);
    }
  }, [initialFieldKey]);

  const loadData = async (targetPage = 1, start = startDate, end = endDate) => {
    if (!channel?.id) return;
    setLoading(true);
    setError('');
    try {
      // Fetch feeds with reasonable batch size
      const data = await getChannelFeeds(channel.id, {
        page: targetPage,
        pageSize: 100, // Load batch for instant field switching
        startAt: start || null,
        endAt: end || null,
        order: 'desc',
      });
      setHistoryResult(data);
      setPage(targetPage);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, startDate, endDate);
  }, [channel?.id]);

  const handleApplyFilter = (e) => {
    e?.preventDefault();
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    setPage(1);
    loadData(1, startDate, endDate);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setSelectedFieldKey('all');
    setPage(1);
    loadData(1, '', '');
  };

  // Active field info if a specific field is chosen
  const activeField = useMemo(() => {
    if (selectedFieldKey === 'all') return null;
    return fields.find((f) => f.key === selectedFieldKey) || null;
  }, [fields, selectedFieldKey]);

  // Filter feeds based on selected field
  const filteredFeeds = useMemo(() => {
    const raw = historyResult?.feeds || [];
    if (selectedFieldKey === 'all') return raw;
    // Only keep records where this field has a valid, non-null numeric measurement
    return raw.filter((feed) => {
      const val = feed.values?.[selectedFieldKey];
      return val !== null && val !== undefined && Number.isFinite(Number(val));
    });
  }, [historyResult?.feeds, selectedFieldKey]);

  // Specific stats for the selected field
  const fieldStats = useMemo(() => {
    if (selectedFieldKey === 'all' || !activeField || !filteredFeeds.length) return null;
    const values = filteredFeeds.map((f) => Number(f.values[selectedFieldKey]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const latest = values[0];
    return { latest, min, max, avg, count: values.length };
  }, [filteredFeeds, selectedFieldKey, activeField]);

  // Pagination calculation based on filtered dataset
  const totalEntries = filteredFeeds.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFeeds = filteredFeeds.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalEntries);

  const handlePageChange = (targetPage) => {
    if (targetPage < 1 || targetPage > totalPages) return;
    setPage(targetPage);
  };

  // Export CSV
  const handleExportCSV = async () => {
    if (!channel?.id) return;
    setExporting(true);
    try {
      let records = filteredFeeds;
      if (!records.length) {
        alert('Không có bản ghi nào phù hợp để xuất CSV.');
        return;
      }

      const activeFields = selectedFieldKey === 'all'
        ? fields
        : [activeField].filter(Boolean);

      const headers = ['Mã bản ghi (ID)', 'Thời gian ghi nhận', ...activeFields.map((f) => `${f.name} (${f.unit || f.key})`)];

      const rows = records.map((feed) => {
        const timeStr = formatDate(feed.received_at, true);
        const fieldVals = activeFields.map((f) => {
          const val = feed.values?.[f.key];
          return val !== null && val !== undefined ? String(val) : '';
        });
        return [feed.id, `"${timeStr}"`, ...fieldVals].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const nameTag = selectedFieldKey === 'all' ? 'all_fields' : selectedFieldKey;
      link.setAttribute('download', `channel_${channel.id}_${nameTag}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="page-stack">
      {/* Top Hero Section */}
      <div className="channel-hero card">
        <div>
          <span className="eyebrow">DEDICATED EXPLORER</span>
          <h2>Lịch sử dữ liệu đo</h2>
          <p>
            Tra cứu chi tiết theo từng cảm biến hoặc xem toàn bộ, hỗ trợ lọc theo ngày giờ và xuất file CSV.
          </p>
        </div>
        <div className="channel-id-block">
          <span>CHANNEL ID</span>
          <strong className="numeric">{channel?.id}</strong>
        </div>
      </div>

      {/* Field Selector Pills Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Layers size={16} color="var(--color-primary)" />
          <strong style={{ fontSize: '13px' }}>Chọn Field cảm biến để xem lịch sử riêng biệt:</strong>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            className={`pill-button ${selectedFieldKey === 'all' ? 'active' : ''}`}
            onClick={() => {
              setSelectedFieldKey('all');
              setPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: selectedFieldKey === 'all' ? 'var(--color-brand)' : 'var(--color-surface-secondary)',
              color: selectedFieldKey === 'all' ? '#fff' : 'var(--color-text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Tất cả cảm biến ({fields.length})
          </button>

          {fields.map((f) => {
            const isActive = selectedFieldKey === f.key;
            return (
              <button
                key={f.key}
                type="button"
                className={`pill-button ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFieldKey(f.key);
                  setPage(1);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid var(--color-border)',
                  background: isActive ? 'var(--color-brand)' : 'var(--color-surface-secondary)',
                  color: isActive ? '#fff' : 'var(--color-text)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{f.name}</span>
                <small style={{ opacity: 0.8 }}>({f.unit || f.key})</small>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Statistics when 1 Field is chosen */}
      {fieldStats && activeField && (
        <div className="metric-summary-grid">
          <div className="metric-summary card">
            <div className="summary-icon blue"><Activity size={18} /></div>
            <div>
              <span>Số đo mới nhất ({activeField.name})</span>
              <strong className="numeric">{formatValue(fieldStats.latest)} {activeField.unit || ''}</strong>
            </div>
          </div>
          <div className="metric-summary card">
            <div className="summary-icon green"><ArrowUpRight size={18} /></div>
            <div>
              <span>Cao nhất (Max)</span>
              <strong className="numeric">{formatValue(fieldStats.max)} {activeField.unit || ''}</strong>
            </div>
          </div>
          <div className="metric-summary card">
            <div className="summary-icon orange"><ArrowDownRight size={18} /></div>
            <div>
              <span>Thấp nhất (Min)</span>
              <strong className="numeric">{formatValue(fieldStats.min)} {activeField.unit || ''}</strong>
            </div>
          </div>
          <div className="metric-summary card">
            <div className="summary-icon purple"><Database size={18} /></div>
            <div>
              <span>Trung bình (Avg) / Tổng mẫu</span>
              <strong className="numeric">{formatValue(fieldStats.avg)} {activeField.unit || ''} ({fieldStats.count} lần)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Date Filter & Control Bar */}
      <div className="channel-toolbar card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', width: '100%' }}>
          <div className="filter-group">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
              Từ ngày giờ:
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div className="filter-group">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
              Đến ngày giờ:
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button type="submit" className="btn-primary btn-small" disabled={loading}>
              <Filter size={15} /> Lọc dữ liệu
            </button>
            {(startDate || endDate) && (
              <button type="button" className="btn-secondary btn-small" onClick={handleResetFilter} disabled={loading}>
                <RotateCcw size={15} /> Đặt lại
              </button>
            )}
            <button
              type="button"
              className="btn-tertiary btn-small"
              onClick={() => loadData(1, startDate, endDate)}
              disabled={loading}
              title="Làm mới"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={handleExportCSV}
              disabled={exporting || totalEntries === 0}
              title="Tải file CSV mở trên Excel"
            >
              <Download size={15} /> {exporting ? 'Đang xuất...' : `Xuất CSV ${activeField ? `(${activeField.name})` : ''}`}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="inline-alert error card" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableIcon size={18} color="var(--color-primary)" />
            <strong>
              {activeField
                ? `Nhật ký số đo: ${activeField.name} (${totalEntries} bản ghi)`
                : `Bảng dữ liệu đo tổng hợp (${totalEntries} bản ghi)`}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Số dòng mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-surface, #1e293b)',
                color: 'var(--color-text-primary, #ffffff)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <option value={10} style={{ background: '#1e293b', color: '#ffffff' }}>10 dòng</option>
              <option value={20} style={{ background: '#1e293b', color: '#ffffff' }}>20 dòng</option>
              <option value={50} style={{ background: '#1e293b', color: '#ffffff' }}>50 dòng</option>
              <option value={100} style={{ background: '#1e293b', color: '#ffffff' }}>100 dòng</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-secondary, #27272a)' }}>
                <th style={{ width: '80px', textAlign: 'center', padding: '12px 10px', fontSize: '12px', borderBottom: '1px solid var(--color-border)' }}>Mã ID</th>
                <th style={{ width: '180px', padding: '12px 14px', fontSize: '12px', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>Thời gian nhận</th>
                
                {/* When 1 Field is chosen: Balanced, rich layout */}
                {activeField ? (
                  <>
                    <th style={{ width: '170px', padding: '12px 14px', fontSize: '12px', borderBottom: '1px solid var(--color-border)' }}>
                      Giá trị đo ({activeField.unit || activeField.key})
                    </th>
                    <th style={{ width: '160px', padding: '12px 14px', fontSize: '12px', borderBottom: '1px solid var(--color-border)' }}>
                      Biến thiên (So lần trước)
                    </th>
                    <th style={{ minWidth: '180px', padding: '12px 14px', fontSize: '12px', borderBottom: '1px solid var(--color-border)' }}>
                      Mức đo trực quan
                    </th>
                    <th style={{ width: '120px', textAlign: 'center', padding: '12px 14px', fontSize: '12px', borderBottom: '1px solid var(--color-border)' }}>
                      Trạng thái
                    </th>
                  </>
                ) : (
                  /* When 'all' is chosen: Show all columns */
                  fields.map((f) => (
                    <th
                      key={f.key}
                      style={{
                        padding: '12px 10px',
                        fontSize: '12px',
                        borderBottom: '1px solid var(--color-border)',
                        textAlign: 'right',
                      }}
                    >
                      <span style={{ display: 'inline-block', maxWidth: '140px', lineHeight: '1.25' }}>
                        {f.name} {f.unit ? `(${f.unit})` : ''}
                      </span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeField ? 6 : 2 + fields.length} style={{ textAlign: 'center', padding: '40px' }}>
                    <RefreshCw size={22} className="spin" style={{ display: 'inline', marginRight: '8px' }} />
                    Đang tải dữ liệu số đo...
                  </td>
                </tr>
              ) : pagedFeeds.length === 0 ? (
                <tr>
                  <td colSpan={activeField ? 6 : 2 + fields.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                    <Database size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p>Không có bản ghi nào phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                pagedFeeds.map((feed, index) => {
                  const val = activeField ? feed.values?.[activeField.key] : null;
                  const hasVal = val !== null && val !== undefined && Number.isFinite(Number(val));

                  // Calculate change compared to immediately previous chronological measurement
                  let delta = null;
                  if (activeField && hasVal && index + 1 < pagedFeeds.length) {
                    const prevVal = pagedFeeds[index + 1]?.values?.[activeField.key];
                    if (prevVal !== null && prevVal !== undefined && Number.isFinite(Number(prevVal))) {
                      delta = Number(val) - Number(prevVal);
                    }
                  }

                  // Calculate visual progress bar percentage
                  let barWidth = 50;
                  if (activeField && hasVal && fieldStats) {
                    const range = (fieldStats.max - fieldStats.min) || 1;
                    barWidth = Math.max(4, Math.min(100, ((Number(val) - fieldStats.min) / range) * 100));
                  }

                  return (
                    <tr key={feed.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px' }}>
                        <code>#{feed.id}</code>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatDate(feed.received_at, true)}
                      </td>

                      {/* Single Field Data Row: Balanced layout */}
                      {activeField ? (
                        <>
                          <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                            <strong style={{ color: 'var(--color-brand)', fontSize: '14px' }}>
                              {hasVal ? `${formatValue(val)} ${activeField.unit || ''}` : '—'}
                            </strong>
                          </td>

                          <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                            {delta === null ? (
                              <span style={{ color: 'var(--color-text-secondary)' }}>— (Mốc đầu)</span>
                            ) : delta > 0 ? (
                              <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <ArrowUpRight size={14} /> +{formatValue(delta)}
                              </span>
                            ) : delta < 0 ? (
                              <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <ArrowDownRight size={14} /> {formatValue(delta)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)' }}>0.0 (Ổn định)</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  flex: 1,
                                  height: '8px',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${barWidth}%`,
                                    height: '100%',
                                    background: 'var(--color-brand)',
                                    borderRadius: '4px',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', minWidth: '36px', textAlign: 'right' }}>
                                {barWidth.toFixed(0)}%
                              </span>
                            </div>
                          </td>

                          <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: hasVal ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: hasVal ? '#10b981' : '#ef4444',
                              }}
                            >
                              {hasVal ? 'Hợp lệ' : 'Lỗi đo'}
                            </span>
                          </td>
                        </>
                      ) : (
                        /* All Fields Data Row */
                        fields.map((f) => {
                          const fVal = feed.values?.[f.key];
                          const fHasVal = fVal !== null && fVal !== undefined && Number.isFinite(Number(fVal));
                          return (
                            <td key={f.key} style={{ textAlign: 'right', padding: '10px 10px', fontSize: '12px' }}>
                              {fHasVal ? (
                                <strong>
                                  {formatValue(fVal)} {f.unit || ''}
                                </strong>
                              ) : (
                                <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {totalEntries > 0
              ? `Hiển thị ${startIndex}–${endIndex} trong tổng số ${totalEntries.toLocaleString('vi-VN')} bản ghi ${activeField ? `(${activeField.name})` : ''}`
              : 'Chưa có bản ghi nào'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(1)}
              title="Về trang đầu"
            >
              <ChevronFirst size={15} />
            </button>
            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft size={15} /> Trước
            </button>

            <span style={{ padding: '0 8px', fontSize: '13px', fontWeight: 600 }}>
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={currentPage >= totalPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Sau <ChevronRight size={15} />
            </button>
            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={currentPage >= totalPages || loading}
              onClick={() => handlePageChange(totalPages)}
              title="Đến trang cuối"
            >
              <ChevronLast size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
