const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Token helpers
export const getAuthToken = () => localStorage.getItem('sdb_auth_token');
export const setAuthToken = (token) => localStorage.setItem('sdb_auth_token', token);
export const clearAuthToken = () => localStorage.removeItem('sdb_auth_token');

export const getSavedUser = () => {
  try {
    const raw = localStorage.getItem('sdb_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const setSavedUser = (user) => localStorage.setItem('sdb_user', JSON.stringify(user));
export const clearSavedUser = () => localStorage.removeItem('sdb_user');

// Helper for authenticated requests
const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// =================== SYSTEM & HEALTH ===================
export const getHealth = async () => {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
};

// =================== AUTHENTICATION ===================
export const loginUser = async ({ email, password = null, full_name = null }) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: password || undefined, full_name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Đăng nhập không thành công');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  setSavedUser(data.user);
  return data;
};

export const registerUser = async ({ email, password, full_name = null }) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Đăng ký không thành công');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  setSavedUser(data.user);
  return data;
};

export const loginWithEmail = async (email, fullName = null, password = null) => {
  return loginUser({ email, password, full_name: fullName });
};

export const getMe = async () => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
};

// =================== PROJECTS ===================
export const getProjects = async () => {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
};

export const createProject = async ({ name, description }) => {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create project');
  }
  return res.json();
};

// =================== DEVICES ===================
export const getProjectDevices = async (projectId) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/devices`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load project devices');
  return res.json();
};

export const createProjectDevice = async (projectId, { device_code, name, interval_seconds = 30 }) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/devices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ device_code: device_code || undefined, name, interval_seconds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create device');
  }
  return res.json();
};

export const getDeviceLatest = async (deviceId) => {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/latest`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch latest telemetry');
  return res.json();
};

export const getDeviceTelemetryHistory = async (deviceId, limit = 50) => {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/telemetry?limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch telemetry history');
  return res.json();
};

export const getDeviceTokens = async (deviceId) => {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/tokens`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch device tokens');
  return res.json();
};

export const issueDeviceToken = async (deviceId, name = 'Token') => {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/tokens?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to issue device token');
  return res.json();
};

export const revokeDeviceToken = async (deviceId, tokenId) => {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/tokens/${tokenId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to revoke device token');
  return res.json();
};

// =================== TELEMETRY INGESTION (ESP32) ===================
export const sendTelemetryV1 = async (deviceToken, payload) => {
  const res = await fetch(`${API_BASE}/telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deviceToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Ingestion error: HTTP ${res.status}`);
  }
  return res.json();
};

// =================== LEGACY SINGLE READING ===================
export const getSensorReadings = async (limit = 50) => {
  const res = await fetch(`${API_BASE}/sensors/readings?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch legacy readings');
  return res.json();
};

export const sendSensorReading = async (readingData) => {
  const res = await fetch(`${API_BASE}/sensors/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(readingData),
  });
  if (!res.ok) throw new Error('Failed to send sensor reading');
  return res.json();
};
