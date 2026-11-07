import React from 'react';
import { Folder, Plus, Send } from 'lucide-react';

export default function Topbar({
  activeNav,
  selectedProject,
  onOpenCreateDevice,
  onOpenSimulate,
  health,
}) {
  const titles = {
    overview: { title: 'Tổng Quan Giám Sát', breadcrumb: 'Trang Chủ / Giám Sát Thời Gian Thực' },
    projects: { title: 'Quản Lý Dự Án', breadcrumb: 'Cấu Hình / Danh Sách Dự Án IoT' },
    devices: { title: 'Thiết Bị & Device Token', breadcrumb: 'Quản Trị / Trạm ESP32 & Khóa Xác Thực' },
    telemetry: { title: 'Nhật Ký Dữ Liệu Đo', breadcrumb: 'Dữ Liệu / Lịch Sử Bản Tin Telemetry V1' },
    simulator: { title: 'Mô Phỏng & Nạp Code ESP32', breadcrumb: 'Công Cụ / Giả Lập & Code Wokwi' },
    system: { title: 'Cài Đặt & Kết Nối Hệ Thống', breadcrumb: 'Hệ Thống / Trạng Thái API & Tài Khoản' },
  };

  const currentMeta = titles[activeNav] || titles.overview;

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <span className="topbar-breadcrumb">{currentMeta.breadcrumb}</span>
        <h1 className="topbar-title">{currentMeta.title}</h1>
      </div>

      <div className="topbar-right">
        {/* ACTIVE PROJECT BADGE */}
        {selectedProject && (
          <div className="topbar-project-tag">
            <Folder size={14} className="tag-icon" />
            <span className="tag-name">{selectedProject.name}</span>
          </div>
        )}

        {/* HEALTH STATUS BADGE */}
        <span className={`badge ${health?.status === 'healthy' ? 'badge-online' : ''}`}>
          <span className={`status-dot ${health?.status === 'healthy' ? 'dot-online' : 'dot-offline'}`} />
          {health?.status === 'healthy' ? 'Hệ thống sẵn sàng' : 'Mất kết nối'}
        </span>

        {/* QUICK ACTION BUTTONS */}
        {selectedProject && (
          <div className="topbar-actions">
            <button
              type="button"
              className="btn-secondary topbar-btn"
              onClick={onOpenCreateDevice}
              title="Thêm trạm ESP32 mới vào dự án này"
            >
              <Plus size={14} /> Thêm Trạm
            </button>
            <button
              type="button"
              className="btn-primary topbar-btn"
              onClick={onOpenSimulate}
              title="Gửi gói tin telemetry giả lập"
            >
              <Send size={14} /> Gửi Đo Test
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
