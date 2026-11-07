import React from 'react';
import { FolderKanban, Plus, Cpu, Calendar } from 'lucide-react';

export default function ProjectsView({
  projects = [],
  selectedProjectId,
  onSelectProject,
  onOpenCreateProject,
  onNavigateToDevices,
}) {
  return (
    <div className="view-container">
      {/* HEADER SECTION */}
      <div className="view-header-bar">
        <div>
          <h2 className="view-heading">Danh Sách Dự Án IoT</h2>
          <p className="view-subheading">
            Quản lý các cụm dự án vườn ươm, khu vực canh tác và các trạm cảm biến liên kết
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onOpenCreateProject}
        >
          <Plus size={16} /> Tạo Dự Án Mới
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state-card">
          <FolderKanban size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#fff' }}>Chưa có dự án nào</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '8px 0 16px' }}>
            Tạo một dự án IoT mới để bắt đầu quản lý các trạm cảm biến ESP32.
          </p>
          <button type="button" className="btn-primary" onClick={onOpenCreateProject}>
            <Plus size={16} /> Tạo Dự Án Mới
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((proj) => {
            const isSelected = proj.id === selectedProjectId;
            return (
              <div
                key={proj.id}
                className={`project-card ${isSelected ? 'project-card-active' : ''}`}
              >
                <div className="project-card-header">
                  <div className="project-card-title-group">
                    <span className="project-badge">ID #{proj.id}</span>
                    <h3 className="project-title">{proj.name}</h3>
                  </div>
                  {isSelected && (
                    <span className="active-pill">Đang Làm Việc</span>
                  )}
                </div>

                <p className="project-desc">
                  {proj.description || 'Không có mô tả chi tiết cho dự án này.'}
                </p>

                <div className="project-meta-row">
                  <div className="meta-item">
                    <span className="meta-label">Trạm ESP32:</span>
                    <span className="meta-value highlight-num" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Cpu size={14} color="#38bdf8" /> {proj.devices_count || 0} thiết bị
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Ngày tạo:</span>
                    <span className="meta-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} color="#94a3b8" />
                      {proj.created_at ? new Date(proj.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="project-card-actions">
                  {!isSelected ? (
                    <button
                      type="button"
                      className="btn-primary btn-sm btn-block"
                      onClick={() => onSelectProject(proj.id)}
                    >
                      Chọn Dự Án Này
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary btn-sm btn-block"
                      onClick={onNavigateToDevices}
                    >
                      <Cpu size={14} /> Quản Lý Thiết Bị ({proj.devices_count || 0})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
