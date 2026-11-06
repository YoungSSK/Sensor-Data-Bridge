import React, { useState } from 'react';

export default function IngestModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    sensor_id: 'ESP32_LIVING_ROOM',
    sensor_type: 'temperature',
    value: 26.5,
    unit: '°C',
    location: 'Zone A',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      sensor_id: formData.sensor_id,
      sensor_type: formData.sensor_type,
      value: parseFloat(formData.value),
      unit: formData.unit,
      metadata: { location: formData.location },
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 style={{ marginBottom: '16px' }}>Simulate IoT Data</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Sensor ID</label>
            <input
              type="text"
              value={formData.sensor_id}
              onChange={(e) => setFormData({ ...formData, sensor_id: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Sensor Type</label>
            <input
              type="text"
              value={formData.sensor_type}
              onChange={(e) => setFormData({ ...formData, sensor_type: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Value</label>
            <input
              type="number"
              step="0.1"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Unit</label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Send Telemetry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
