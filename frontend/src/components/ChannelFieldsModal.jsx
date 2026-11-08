import React, { useEffect, useState } from 'react';
import { AlertCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { updateChannel } from '../services/api';

const fieldOptions = Array.from({ length: 8 }, (_, index) => `field${index + 1}`);

export default function ChannelFieldsModal({ channel, isOpen, onClose, onSaved }) {
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !channel) return;
    setFields(channel.fields.map(({ key, name, unit }) => ({ key, name, unit: unit || '' })));
    setError('');
  }, [isOpen, channel?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !channel) return null;

  const updateField = (index, property, value) => {
    setFields((current) => current.map((field, fieldIndex) => (
      fieldIndex === index ? { ...field, [property]: value } : field
    )));
  };

  const addField = () => {
    setFields((current) => {
      const used = new Set(current.map((field) => field.key));
      const key = fieldOptions.find((option) => !used.has(option));
      return key ? [...current, { key, name: '', unit: '' }] : current;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = fields.map((field) => ({
      key: field.key,
      name: field.name.trim(),
      unit: field.unit.trim() || null,
    }));

    if (payload.some((field) => !field.name)) {
      setError('Mỗi field cần có tên hiển thị.');
      return;
    }
    if (new Set(payload.map((field) => field.key)).size !== payload.length) {
      setError('Không được dùng trùng key giữa các field.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateChannel(channel.id, { fields: payload });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="modal modal-channel" role="dialog" aria-modal="true" aria-labelledby="edit-channel-fields-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">CHANNEL ID {channel.id}</span>
            <h2 id="edit-channel-fields-title">Quản lý field</h2>
            <p>Thêm, sửa hoặc xóa field của {channel.name}.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="inline-alert error" role="alert">
            <AlertCircle size={17} /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field-editor-heading">
            <div>
              <h3>Field dữ liệu ({fields.length}/8)</h3>
              <p>Field được đánh số tự động từ field1 đến field8.</p>
            </div>
            <button type="button" className="btn-secondary btn-small" onClick={addField} disabled={saving || fields.length >= 8}>
              <Plus size={15} /> Thêm field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="small-empty">Chưa có field. Nhấn “Thêm field” để cấu hình dữ liệu mới.</div>
          ) : (
            <div className="field-editor-list">
              {fields.map((field, index) => (
                <div className="field-editor-row" key={index}>
                  <div className="field-key-control">
                    <span className="field-control-label">Field</span>
                    <span className="field-key-display">{field.key}</span>
                  </div>
                  <div className="field-name-control">
                    <label htmlFor={`edit-field-name-${index}`}>Tên hiển thị</label>
                    <input
                      id={`edit-field-name-${index}`}
                      className="input-control"
                      value={field.name}
                      onChange={(event) => updateField(index, 'name', event.target.value)}
                      maxLength={100}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="field-unit-control">
                    <label htmlFor={`edit-field-unit-${index}`}>Đơn vị</label>
                    <input
                      id={`edit-field-unit-${index}`}
                      className="input-control"
                      value={field.unit}
                      onChange={(event) => updateField(index, 'unit', event.target.value)}
                      maxLength={32}
                      disabled={saving}
                    />
                  </div>
                  <button
                    type="button"
                    className="icon-button danger-icon"
                    onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))}
                    disabled={saving}
                    aria-label={`Xóa ${field.key}`}
                    title="Xóa field"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="field-editor-note">Xóa field chỉ thay đổi cấu hình hiển thị; dữ liệu đã nhận vẫn được lưu. Khi thêm field, hãy cập nhật ESP32 để gửi đúng số field mới.</p>
          <div className="modal-actions">
            <button type="button" className="btn-tertiary" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
