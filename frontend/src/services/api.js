const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const getHealth = async () => {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
};

export const getSensorReadings = async (limit = 50) => {
  const res = await fetch(`${API_BASE}/sensors/readings?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch readings');
  return res.json();
};

export const getReadingsBySensorId = async (sensorId) => {
  const res = await fetch(`${API_BASE}/sensors/readings/${sensorId}`);
  if (!res.ok) throw new Error(`Failed to fetch sensor ${sensorId}`);
  return res.json();
};

export const sendSensorReading = async (readingData) => {
  const res = await fetch(`${API_BASE}/sensors/readings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(readingData),
  });
  if (!res.ok) throw new Error('Failed to send sensor reading');
  return res.json();
};
