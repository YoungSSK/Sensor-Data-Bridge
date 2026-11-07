import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Cpu,
  LineChart,
  FlaskConical,
  Settings,
  LogOut,
  Plus,
  Radio,
} from 'lucide-react';

export default function Sidebar({
  activeNav,
  setActiveNav,
  projects = [],
  selectedProjectId,
  setSelectedProjectId,
  currentUser,
  onLogout,
  onOpenCreateProject,
  devicesCount = 0,
  health,
}) {
  const navItems = [
    { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard, desc: 'Thống kê & Giám sát trạm' },
    { id: 'projects', label: 'Quản Lý Dự Án', icon: FolderKanban, desc: 'Danh sách dự án IoT' },
    { id: 'devices', label: 'Thiết Bị & Token', icon: Cpu, desc: 'Trạm ESP32 & Device Token', badge: devicesCount },
    { id: 'telemetry', label: 'Nhật Ký Đo', icon: LineChart, desc: 'Lịch sử telemetry đa chiều' },
    { id: 'simulator', label: 'Mô Phỏng & Wokwi', icon: FlaskConical, desc: 'Giả lập & Code ESP32 mẫu' },
    { id: 'system', label: 'Cài Đặt & API', icon: Settings, desc: 'Trạng thái hệ thống' },
  ];

  return (
    <aside className="app-sidebar">
      {/* BRAND / LOGO */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Radio size={22} className="brand-lucide-icon" />
        </div>
        <div className="brand-info">
          <div className="brand-name">SensorBridge</div>
          <div className="brand-sub">Nền tảng IoT Giám sát</div>
        </div>
      </div>

      {/* PROJECT SELECTOR QUICK WIDGET */}
      <div className="sidebar-project-widget">
        <div className="project-widget-header">
          <span className="widget-label">DỰ ÁN HIỆN TẠI</span>
          <button
            type="button"
            className="btn-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            onClick={onOpenCreateProject}
            title="Tạo dự án mới"
          >
            <Plus size={12} /> Mới
          </button>
        </div>

        {projects.length > 0 ? (
          <select
            className="sidebar-project-select"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(parseInt(e.target.value, 10))}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.devices_count || 0} trạm)
              </option>
            ))}
          </select>
        ) : (
          <div className="no-project-hint">
            <span>Chưa có dự án nào</span>
            <button
              className="btn-sidebar-create"
              onClick={onOpenCreateProject}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={12} /> Tạo Dự Án
            </button>
          </div>
        )}
      </div>

      {/* NAVIGATION MENU */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">ĐIỀU HƯỚNG CHÍNH</div>
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="nav-icon">
                <IconComponent size={18} />
              </span>
              <div className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.desc}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* FOOTER: SYSTEM & USER PROFILE */}
      <div className="sidebar-footer">
        <div className="sidebar-system-status">
          <span className={`status-dot ${health?.status === 'healthy' ? 'dot-online' : 'dot-offline'}`} />
          <span className="status-text">
            {health?.status === 'healthy' ? 'FastAPI & DB Online' : 'Kết nối Backend...'}
          </span>
        </div>

        <div className="sidebar-user-card">
          <div className="user-avatar">
            {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{currentUser?.full_name || 'Quản trị viên'}</span>
            <span className="user-email" title={currentUser?.email}>
              {currentUser?.email || 'user@iot.local'}
            </span>
          </div>
          <button
            type="button"
            className="btn-logout"
            onClick={onLogout}
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
