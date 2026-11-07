import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import {
  clearAuthToken,
  clearSavedUser,
  getAuthToken,
  getDeviceLatest,
  getDeviceTelemetryHistory,
  getHealth,
  getProjectDevices,
  getProjects,
  getSavedUser,
} from './services/api';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginView from './components/LoginView';
import OverviewView from './views/OverviewView';
import ProjectsView from './views/ProjectsView';
import DevicesView from './views/DevicesView';
import TelemetryView from './views/TelemetryView';
import SimulatorView from './views/SimulatorView';
import SystemView from './views/SystemView';

import CreateProjectModal from './components/CreateProjectModal';
import CreateDeviceModal from './components/CreateDeviceModal';
import DeviceTokenModal from './components/DeviceTokenModal';
import SimulateTelemetryModal from './components/SimulateTelemetryModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getSavedUser());
  const [authToken, setAuthTokenState] = useState(getAuthToken());

  // Active navigation tab
  const [activeNav, setActiveNav] = useState('overview'); // 'overview' | 'projects' | 'devices' | 'telemetry' | 'simulator' | 'system'

  // System & Projects
  const [health, setHealth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Telemetry Data for selected device
  const [latestData, setLatestData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [telemetryLimit, setTelemetryLimit] = useState(50);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [modalTargetDevice, setModalTargetDevice] = useState(null);

  const [error, setError] = useState(null);

  // 1. Health check poll
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await getHealth().catch(() => ({ status: 'offline' }));
        setHealth(data);
      } catch {
        setHealth({ status: 'offline' });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Projects when logged in
  const fetchProjects = async () => {
    if (!authToken) return;
    try {
      setError(null);
      const projs = await getProjects();
      setProjects(projs);
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('expired')) {
        handleLogout();
      } else {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchProjects();
    }
  }, [authToken]);

  // 3. Fetch Devices when project changes
  const fetchDevices = async (projId) => {
    if (!projId || !authToken) return;
    try {
      const devList = await getProjectDevices(projId);
      setDevices(devList);
      if (devList.length > 0) {
        setSelectedDeviceId((prev) => (devList.some((d) => d.id === prev) ? prev : devList[0].id));
      } else {
        setSelectedDeviceId(null);
        setLatestData(null);
        setHistoryData(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchDevices(selectedProjectId);
    }
  }, [selectedProjectId, authToken]);

  // 4. Fetch Telemetry for selected device (Poll every 5s)
  const fetchDeviceData = async (devId) => {
    if (!devId || !authToken) return;
    try {
      const [latest, hist] = await Promise.all([
        getDeviceLatest(devId).catch(() => null),
        getDeviceTelemetryHistory(devId, telemetryLimit).catch(() => null),
      ]);
      setLatestData(latest);
      setHistoryData(hist);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedDeviceId) {
      fetchDeviceData(selectedDeviceId);
      const interval = setInterval(() => fetchDeviceData(selectedDeviceId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedDeviceId, telemetryLimit, authToken]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setAuthTokenState(getAuthToken());
  };

  const handleLogout = () => {
    clearAuthToken();
    clearSavedUser();
    setCurrentUser(null);
    setAuthTokenState(null);
    setProjects([]);
    setDevices([]);
    setSelectedProjectId(null);
    setSelectedDeviceId(null);
  };

  const handleProjectCreated = (newProj) => {
    setProjects((prev) => [newProj, ...prev]);
    setSelectedProjectId(newProj.id);
  };

  const handleDeviceCreated = (newDev) => {
    setDevices((prev) => [newDev, ...prev]);
    setSelectedDeviceId(newDev.id);
  };

  const handleOpenTokenModal = (dev) => {
    setModalTargetDevice(dev || selectedDevice);
    setIsTokenModalOpen(true);
  };

  const handleOpenSimulateModal = (dev) => {
    if (dev?.id) setSelectedDeviceId(dev.id);
    setIsSimulateModalOpen(true);
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // If user is not logged in, show Login view
  if (!authToken) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-card-container">
          <header className="login-header">
            <div className="brand-icon-wrapper" style={{ margin: '0 auto 12px' }}>
              <Radio size={32} color="#38bdf8" />
            </div>
            <h1>SensorBridge IoT</h1>
            <p>Nền tảng Giám sát & Cầu nối Dữ liệu Cảm biến ESP32</p>
            <span className={`badge ${health?.status === 'healthy' ? 'badge-online' : ''}`} style={{ marginTop: '10px' }}>
              ● Backend: {health?.status || 'đang kiểm tra...'}
            </span>
          </header>

          <LoginView onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenCreateProject={() => setIsProjectModalOpen(true)}
        devicesCount={devices.length}
        health={health}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="dashboard-main">
        {/* TOPBAR */}
        <Topbar
          activeNav={activeNav}
          selectedProject={selectedProject}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          setSelectedDeviceId={setSelectedDeviceId}
          onOpenCreateDevice={() => setIsDeviceModalOpen(true)}
          onOpenSimulate={() => handleOpenSimulateModal(selectedDevice)}
          health={health}
        />

        {/* CONTENT AREA */}
        <main className="dashboard-content">
          {error && (
            <div className="alert-error" style={{ marginBottom: '20px' }}>
              ⚠️ {error}
            </div>
          )}

          {activeNav === 'overview' && (
            <OverviewView
              project={selectedProject}
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              setSelectedDeviceId={setSelectedDeviceId}
              latestData={latestData}
              historyData={historyData}
              onOpenCreateDevice={() => setIsDeviceModalOpen(true)}
              onOpenSimulate={() => handleOpenSimulateModal(selectedDevice)}
              onOpenTokenModal={handleOpenTokenModal}
            />
          )}

          {activeNav === 'projects' && (
            <ProjectsView
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                setActiveNav('overview');
              }}
              onOpenCreateProject={() => setIsProjectModalOpen(true)}
              onNavigateToDevices={() => setActiveNav('devices')}
            />
          )}

          {activeNav === 'devices' && (
            <DevicesView
              project={selectedProject}
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              onOpenCreateDevice={() => setIsDeviceModalOpen(true)}
              onOpenTokenModal={handleOpenTokenModal}
              onOpenSimulate={(d) => handleOpenSimulateModal(d)}
              onNavigateToOverview={() => setActiveNav('overview')}
            />
          )}

          {activeNav === 'telemetry' && (
            <TelemetryView
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              historyData={historyData}
              onRefresh={() => selectedDeviceId && fetchDeviceData(selectedDeviceId)}
              limit={telemetryLimit}
              onChangeLimit={(newLim) => setTelemetryLimit(newLim)}
              onOpenSimulate={() => handleOpenSimulateModal(selectedDevice)}
            />
          )}

          {activeNav === 'simulator' && (
            <SimulatorView
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              onIngestSuccess={() => selectedDeviceId && fetchDeviceData(selectedDeviceId)}
            />
          )}

          {activeNav === 'system' && (
            <SystemView
              health={health}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <CreateDeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        projectId={selectedProjectId}
        onDeviceCreated={handleDeviceCreated}
      />

      <DeviceTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => {
          setIsTokenModalOpen(false);
          setModalTargetDevice(null);
        }}
        device={modalTargetDevice || selectedDevice}
        onTokensUpdated={() => selectedProjectId && fetchDevices(selectedProjectId)}
      />

      <SimulateTelemetryModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        device={selectedDevice}
        onIngestSuccess={() => selectedDeviceId && fetchDeviceData(selectedDeviceId)}
      />
    </div>
  );
}
