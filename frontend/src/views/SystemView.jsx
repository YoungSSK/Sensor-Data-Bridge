import React, { useState } from 'react';
import { Server, User, Copy, Check, BookOpen } from 'lucide-react';
import { getAuthToken } from '../services/api';

export default function SystemView({ health, currentUser }) {
  const [copiedJwt, setCopiedJwt] = useState(false);
  const jwt = getAuthToken();

  const handleCopyJwt = () => {
    if (!jwt) return;
    navigator.clipboard.writeText(jwt);
    setCopiedJwt(true);
    setTimeout(() => setCopiedJwt(false), 2000);
  };

  const endpoints = [
    { method: 'POST', path: '/api/v1/telemetry', desc: 'Nhận gói tin telemetry đa chiều từ ESP32 (Yêu cầu Bearer Device Token)' },
    { method: 'GET', path: '/api/v1/devices/{id}/latest', desc: 'Lấy số đo mới nhất của thiết bị' },
    { method: 'GET', path: '/api/v1/devices/{id}/telemetry?limit=50', desc: 'Lấy lịch sử bản ghi telemetry của thiết bị' },
    { method: 'GET', path: '/api/v1/devices/{id}/tokens', desc: 'Xem danh sách và Device Token của thiết bị' },
    { method: 'POST', path: '/api/v1/devices/{id}/tokens', desc: 'Cấp mới thêm Device Token' },
    { method: 'GET', path: '/api/v1/projects', desc: 'Danh sách dự án của người dùng' },
    { method: 'POST', path: '/api/v1/projects', desc: 'Tạo mới dự án IoT' },
    { method: 'GET', path: '/api/v1/projects/{id}/devices', desc: 'Danh sách các thiết bị thuộc dự án' },
    { method: 'POST', path: '/api/v1/projects/{id}/devices', desc: 'Đăng ký thêm thiết bị ESP32 vào dự án' },
    { method: 'GET', path: '/api/v1/health', desc: 'Kiểm tra trạng thái máy chủ Backend và DB' },
    { method: 'POST', path: '/api/v1/auth/login', desc: 'Đăng nhập người dùng qua Email & Mật khẩu' },
    { method: 'POST', path: '/api/v1/auth/register', desc: 'Đăng ký tài khoản người dùng mới' },
  ];

  return (
    <div className="view-container">
      <div className="view-header-bar">
        <div>
          <h2 className="view-heading">Cài Đặt & Trạng Thái Hệ Thống</h2>
          <p className="view-subheading">
            Theo dõi tình trạng hạ tầng backend FastAPI, cơ sở dữ liệu Aiven MySQL và tài liệu API
          </p>
        </div>
      </div>

      {/* SYSTEM INFRASTRUCTURE STATUS */}
      <div className="system-grid-2">
        <div className="system-card">
          <h3 className="system-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="#3b82f6" /> Hạ Tầng Máy Chủ (Backend)
          </h3>
          <div className="system-info-list">
            <div className="info-item">
              <span className="info-key">Framework:</span>
              <span className="info-val">FastAPI (Python 3.12+)</span>
            </div>
            <div className="info-item">
              <span className="info-key">Trạng thái:</span>
              <span className="info-val">
                <span className={`badge ${health?.status === 'healthy' ? 'badge-online' : ''}`}>
                  ● {health?.status || 'offline'}
                </span>
              </span>
            </div>
            <div className="info-item">
              <span className="info-key">Cơ sở dữ liệu:</span>
              <span className="info-val">Aiven Cloud MySQL (SSL TLS 1.3)</span>
            </div>
            <div className="info-item">
              <span className="info-key">Hỗ trợ Telemetry:</span>
              <span className="info-val">Chuẩn TelemetryV1 & Idempotency chống trùng</span>
            </div>
          </div>
        </div>

        <div className="system-card">
          <h3 className="system-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#10b981" /> Tài Khoản Đang Đăng Nhập
          </h3>
          <div className="system-info-list">
            <div className="info-item">
              <span className="info-key">Họ và tên:</span>
              <span className="info-val">{currentUser?.full_name || 'Quản trị viên'}</span>
            </div>
            <div className="info-item">
              <span className="info-key">Email:</span>
              <span className="info-val" style={{ color: '#38bdf8' }}>{currentUser?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-key">User ID:</span>
              <span className="info-val">#{currentUser?.id || '—'}</span>
            </div>
            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span className="info-key">JWT Access Token:</span>
                <button
                  type="button"
                  className="btn-token-copy"
                  onClick={handleCopyJwt}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                >
                  {copiedJwt ? <Check size={12} /> : <Copy size={12} />}
                  {copiedJwt ? 'Đã Copy JWT!' : 'Copy JWT'}
                </button>
              </div>
              <code className="jwt-display" title={jwt}>
                {jwt ? `${jwt.slice(0, 36)}...${jwt.slice(-16)}` : 'Chưa có token'}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* REST API ENDPOINTS TABLE */}
      <div className="system-card" style={{ marginTop: '24px' }}>
        <h3 className="system-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="#f59e0b" /> Danh Sách API Endpoints (FastAPI)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Tài liệu tương tác Swagger UI đầy đủ có thể truy cập tại <code>http://127.0.0.1:8000/docs</code>
        </p>

        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Phương Thức</th>
                <th style={{ width: '280px' }}>Đường Dẫn Endpoint</th>
                <th>Mô Tả Chức Năng</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep, idx) => (
                <tr key={idx}>
                  <td>
                    <span className={`method-badge method-${ep.method.toLowerCase()}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td>
                    <code>{ep.path}</code>
                  </td>
                  <td style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                    {ep.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
