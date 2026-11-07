import React, { useState } from 'react';
import { FolderPlus, Plus, AlertCircle, X } from 'lucide-react';
import { createProject } from '../services/api';

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }) {
  const [name, setName] = useState('Pepper Nursery');
  const [description, setDescription] = useState('Hệ thống giám sát môi trường vườn ươm cây ớt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createProject({ name, description });
      onProjectCreated(res);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#fff', margin: 0 }}>
            <FolderPlus size={20} color="#38bdf8" /> Tạo Dự Án Mới
          </h2>
          <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên Dự Án</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pepper Nursery"
              required
            />
          </div>

          <div className="form-group">
            <label>Mô Tả Dự Án</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu của dự án..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} />
              {loading ? 'Đang tạo...' : 'Tạo Dự Án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
