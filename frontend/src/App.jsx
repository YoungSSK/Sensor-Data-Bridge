import React, { useEffect, useState } from 'react';
import { getHealth, getSensorReadings, sendSensorReading } from './services/api';
import SensorCard from './components/SensorCard';
import IngestModal from './components/IngestModal';

export default function App() {
  const [health, setHealth] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [healthData, readingsData] = await Promise.all([
        getHealth().catch(() => ({ status: 'offline' })),
        getSensorReadings(50).catch(() => []),
      ]);
      setHealth(healthData);
      setReadings(readingsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async (payload) => {
    try {
      await sendSensorReading(payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to send data: ' + err.message);
    }
  };

  return (
    <div className="container">
      <header>
        <div className="title-area">
          <h1>Sensor-Data-Bridge Dashboard</h1>
          <p>Real-time IoT Telemetry Monitor & Ingestion</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className={`badge ${health?.status === 'healthy' ? 'badge-online' : ''}`}>
            ● Backend: {health?.status || 'connecting...'}
          </span>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            + Simulate Reading
          </button>
        </div>
      </header>

      {error && (
        <div style={{ padding: '12px', background: '#451a1a', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠️ Error connecting to API: {error}
        </div>
      )}

      <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', color: '#cbd5e1' }}>Latest Sensor Nodes</h2>

      {readings.length === 0 ? (
        <div className="sensor-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#94a3b8' }}>No sensor telemetry received yet.</p>
          <button
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => setIsModalOpen(true)}
          >
            Send First Sample Reading
          </button>
        </div>
      ) : (
        <div className="grid">
          {readings.slice(-6).map((reading, idx) => (
            <SensorCard key={idx} reading={reading} />
          ))}
        </div>
      )}

      <h2 style={{ margin: '32px 0 16px', fontSize: '1.2rem', color: '#cbd5e1' }}>Recent Telemetry Log</h2>
      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Sensor ID</th>
              <th>Type</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {readings.slice().reverse().map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.timestamp).toLocaleString()}</td>
                <td><strong>{r.sensor_id}</strong></td>
                <td>{r.sensor_type}</td>
                <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{r.value}</td>
                <td>{r.unit}</td>
                <td>{r.metadata?.location || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <IngestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSimulate}
      />
    </div>
  );
}
