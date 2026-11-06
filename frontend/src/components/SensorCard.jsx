import React from 'react';

export default function SensorCard({ reading }) {
  const formattedTime = new Date(reading.timestamp).toLocaleTimeString();

  return (
    <div className="sensor-card">
      <div className="card-header">
        <span className="sensor-id">{reading.sensor_id}</span>
        <span className="sensor-type">{reading.sensor_type}</span>
      </div>
      <div className="sensor-value-area">
        <span className="value">{reading.value}</span>
        <span className="unit">{reading.unit}</span>
      </div>
      <div className="card-footer">
        <span>Updated: {formattedTime}</span>
        {reading.metadata?.location && <span>📍 {reading.metadata.location}</span>}
      </div>
    </div>
  );
}
