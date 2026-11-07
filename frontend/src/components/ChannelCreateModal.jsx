import React, { useEffect, useState } from 'react';
import { AlertCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { createChannel } from '../services/api';

const fieldOptions = Array.from({ length: 8 }, (_, index) => `field${index + 1}`);

const blankField = (index = 1) => ({
  key: `field${index}`,
  name: '',
  unit: '',
});

export default function ChannelCreateModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([blankField(1)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setFields([blankField(1)]);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateField = (index, key, value) => {
    setFields((current) => current.map((field, fieldIndex) => (
      fieldIndex === index ? { ...field, [key]: value } : field
    )));
  };

  const addField = () => {
    if (fields.length >= 8) return;
    const used = new Set(fields.map((field) => field.key));
    const nextKey = fieldOptions.find((key) => !used.has(key)) || `field${fields.length + 1}`;
    setFields((current) => [...current, { ...blankField(fields.length + 1), key: nextKey }]);
  };

  const removeField = (index) => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const cleanName = name.trim();
    const configuredFields = fields
      .filter((field) => field.name.trim())
      .map((field) => ({
        key: field.key,
        name: field.name.trim(),
        unit: field.unit.trim() || null,
      }));

    if (!cleanName) {
      setError('Vui lòng nhập tên Channel.');
      return;
    }
    if (configuredFields.length !== fields.length) {
      setError('Mỗi field đã thêm cần có tên hiển thị.');
      return;
    }
    if (new Set(configuredFields.map((field) => field.key)).size !== configuredFields.length) {
      setError('Không được dùng trùng key giữa các field.');
      return;
    }

    setLoading(true);
    try {
      const channel = await createChannel({
        name: cleanName,
        description: description.trim() || null,
        fields: configuredFields,
      });
      onCreated(channel);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal modal-channel" role="dialog" aria-modal="true" aria-labelledby="create-channel-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">CHANNEL MỚI</span>
            <h2 id="create-channel-title">Tạo Channel</h2>
            <p>Đặt tên và cấu hình các field mà ESP32 sẽ gửi lên.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="inline-alert error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="channel-name">Tên Channel</label>
            <input
              id="channel-name"
              className="input-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Vườn ươm cây ớt"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="channel-description">Mô tả <span className="optional">Không bắt buộc</span></label>
            <textarea
              id="channel-description"
              className="input-control textarea-control"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mục đích sử dụng của Channel"
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="field-editor-heading">
            <div>
              <h3>Field dữ liệu</h3>
              <p>Mỗi Channel hỗ trợ tối đa 8 field, từ field1 đến field8.</p>
            </div>
            <button type="button" className="btn-secondary btn-small" onClick={addField} disabled={fields.length >= 8}>
              <Plus size={15} /> Thêm field
            </button>
          </div>

          <div className="field-editor-list">
            {fields.map((field, index) => (
              <div className="field-editor-row" key={`${field.key}-${index}`}>
                <div className="field-key-control">
                  <label htmlFor={`field-key-${index}`}>Key</label>
                  <select
                    id={`field-key-${index}`}
                    className="input-control"
                    value={field.key}
                    onChange={(event) => updateField(index, 'key', event.target.value)}
                  >
                    {fieldOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="field-name-control">
                  <label htmlFor={`field-name-${index}`}>Tên hiển thị</label>
                  <input
                    id={`field-name-${index}`}
                    className="input-control"
                    value={field.name}
                    onChange={(event) => updateField(index, 'name', event.target.value)}
                    placeholder="Nhiệt độ không khí"
                    maxLength={100}
                  />
                </div>
                <div className="field-unit-control">
                  <label htmlFor={`field-unit-${index}`}>Đơn vị</label>
                  <input
                    id={`field-unit-${index}`}
                    className="input-control"
                    value={field.unit}
                    onChange={(event) => updateField(index, 'unit', event.target.value)}
                    placeholder="°C"
                    maxLength={32}
                  />
                </div>
                <button
                  type="button"
                  className="icon-button danger-icon"
                  onClick={() => removeField(index)}
                  disabled={fields.length === 1}
                  aria-label={`Xóa ${field.key}`}
                  title="Xóa field"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-tertiary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Save size={16} /> {loading ? 'Đang tạo...' : 'Tạo Channel'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
