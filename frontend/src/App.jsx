import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  LineChart,
  KeyRound,
  LogOut,
  Plus,
  RadioTower,
  RefreshCw,
  Settings,
} from 'lucide-react';
import {
  clearAuthToken,
  clearSavedUser,
  getAuthToken,
  getChannels,
  getChannelPrivateShow,
  getHealth,
  getSavedUser,
} from './services/api';
import LoginView from './components/LoginView';
import ChannelCreateModal from './components/ChannelCreateModal';
import ChannelsPage from './components/ChannelsPage';
import ChannelPrivateView from './components/ChannelPrivateView';
import ChannelApiKeysView from './components/ChannelApiKeysView';

const parseRoute = (path = window.location.pathname) => {
  const match = path.match(/^\/channels\/(\d+)\/(private_show|api_keys)\/?$/);
  if (match) return { kind: 'channel', channelId: Number(match[1]), tab: match[2] };
  return { kind: 'channels' };
};

const formatDate = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

function Brand() {
  return (
    <div className="app-brand">
      <div className="app-brand-mark"><RadioTower size={21} /></div>
      <div>
        <strong>Sensor Data Bridge</strong>
        <span>IoT workspace</span>
      </div>
    </div>
  );
}

function AppSidebar({ channels, route, currentUser, health, onNavigate, onCreate, onLogout }) {
  return (
    <aside className="app-sidebar">
      <Brand />

      <nav className="sidebar-main-nav" aria-label="Điều hướng chính">
        <button
          type="button"
          className={`sidebar-link ${route.kind === 'channels' ? 'active' : ''}`}
          onClick={() => onNavigate('/channels')}
        >
          <RadioTower size={18} />
          <span>Channels</span>
          <span className="sidebar-count">{channels.length}</span>
        </button>
      </nav>

      <div className="sidebar-channel-section">
        <div className="sidebar-section-heading">
          <span>CHANNEL CỦA BẠN</span>
          <button type="button" className="sidebar-add-button" onClick={onCreate} aria-label="Tạo Channel">
            <Plus size={16} />
          </button>
        </div>
        <div className="sidebar-channel-list">
          {channels.length === 0 ? (
            <p className="sidebar-empty">Chưa có Channel</p>
          ) : channels.map((channel) => {
            const active = route.kind === 'channel' && route.channelId === channel.id;
            return (
              <button
                type="button"
                key={channel.id}
                className={`sidebar-channel-link ${active ? 'active' : ''}`}
                onClick={() => onNavigate(`/channels/${channel.id}/private_show`)}
              >
                <span className="sidebar-channel-dot" />
                <span className="sidebar-channel-copy">
                  <strong>{channel.name}</strong>
                  <small>ID {channel.id}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-health">
          <span className={`status-dot ${health?.status === 'healthy' ? 'online' : 'idle'}`} />
          <span>{health?.status === 'healthy' ? 'Backend đang hoạt động' : 'Đang kết nối backend'}</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{currentUser?.email?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="sidebar-user-copy">
            <strong>{currentUser?.full_name || 'Tài khoản của bạn'}</strong>
            <span title={currentUser?.email}>{currentUser?.email}</span>
          </div>
          <button type="button" className="icon-button" onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function AppHeader({ route, channel, health, onNavigate, onCreate, onRefresh }) {
  const isChannel = route.kind === 'channel' && channel;
  return (
    <header className="app-topbar">
      <div className="topbar-heading">
        <span className="breadcrumb">{isChannel ? `Channels / ${channel.name}` : 'Workspace'}</span>
        <h1>{isChannel ? channel.name : 'Channels'}</h1>
        {isChannel && <span className="header-channel-id">Channel ID: {channel.id}</span>}
      </div>
      <div className="topbar-actions">
        <span className="connection-badge">
          <span className={`status-dot ${health?.status === 'healthy' ? 'online' : 'idle'}`} />
          {health?.status === 'healthy' ? 'Đã kết nối' : 'Chưa kết nối'}
        </span>
        {isChannel && (
          <>
            <button type="button" className={`tab-button ${route.tab === 'private_show' ? 'active' : ''}`} onClick={() => onNavigate(`/channels/${channel.id}/private_show`)}>
              <LineChart size={16} /> Private View
            </button>
            <button type="button" className={`tab-button ${route.tab === 'api_keys' ? 'active' : ''}`} onClick={() => onNavigate(`/channels/${channel.id}/api_keys`)}>
              <KeyRound size={16} /> API Keys
            </button>
            {route.tab === 'private_show' && (
              <button type="button" className="icon-button topbar-refresh" onClick={onRefresh} aria-label="Làm mới dữ liệu">
                <RefreshCw size={17} />
              </button>
            )}
          </>
        )}
        {!isChannel && (
          <button type="button" className="btn-primary btn-small" onClick={onCreate}>
            <Plus size={16} /> Tạo Channel
          </button>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getSavedUser());
  const [authToken, setAuthTokenState] = useState(getAuthToken());
  const [route, setRoute] = useState(parseRoute());
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [privateData, setPrivateData] = useState(null);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === route.channelId),
    [channels, route.channelId],
  );

  const navigate = (path, replace = false) => {
    if (replace) window.history.replaceState({}, '', path);
    else window.history.pushState({}, '', path);
    setRoute(parseRoute(path));
    setError('');
  };

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setHealth(await getHealth());
      } catch {
        setHealth({ status: 'offline' });
      }
    };
    checkHealth();
    const interval = window.setInterval(checkHealth, 20000);
    return () => window.clearInterval(interval);
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    clearSavedUser();
    setAuthTokenState(null);
    setCurrentUser(null);
    setChannels([]);
    setPrivateData(null);
    navigate('/channels', true);
  };

  const loadChannels = async () => {
    if (!authToken) return;
    setChannelsLoading(true);
    setError('');
    try {
      const data = await getChannels();
      setChannels(data);
      if (route.kind === 'channel' && !data.some((channel) => channel.id === route.channelId)) {
        navigate('/channels', true);
      }
    } catch (err) {
      if (err.status === 401) handleLogout();
      else setError(err.message);
    } finally {
      setChannelsLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) loadChannels();
  }, [authToken]);

  const loadPrivateData = async (channelId) => {
    if (!channelId || !authToken) return;
    setPrivateLoading(true);
    try {
      setPrivateData(await getChannelPrivateShow(channelId, 100));
    } catch (err) {
      if (err.status === 401) handleLogout();
      else setError(err.message);
    } finally {
      setPrivateLoading(false);
    }
  };

  useEffect(() => {
    if (route.kind !== 'channel' || route.tab !== 'private_show' || !selectedChannel) {
      setPrivateData(null);
      return undefined;
    }
    loadPrivateData(selectedChannel.id);
    const interval = window.setInterval(() => loadPrivateData(selectedChannel.id), 20000);
    return () => window.clearInterval(interval);
  }, [route.kind, route.tab, route.channelId, selectedChannel?.id, authToken]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setAuthTokenState(getAuthToken());
    navigate('/channels', true);
  };

  const handleChannelCreated = (channel) => {
    setChannels((current) => [channel, ...current.filter((item) => item.id !== channel.id)]);
    setIsCreateOpen(false);
    setNotice('Đã tạo Channel thành công.');
    navigate(`/channels/${channel.id}/private_show`);
  };

  if (!authToken) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-card-container">
          <div className="login-brand-lockup">
            <div className="app-brand-mark"><RadioTower size={22} /></div>
            <strong>Sensor Data Bridge</strong>
          </div>
          <div className="login-heading">
            <span className="eyebrow">SENSOR DATA BRIDGE</span>
            <h1>Quản lý dữ liệu cảm biến, thật đơn giản.</h1>
            <p>Tạo Channel, kết nối ESP32 và theo dõi số đo theo thời gian.</p>
          </div>
          <LoginView onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppSidebar
        channels={channels}
        route={route}
        currentUser={currentUser}
        health={health}
        onNavigate={navigate}
        onCreate={() => setIsCreateOpen(true)}
        onLogout={handleLogout}
      />
      <div className="app-main">
        <AppHeader
          route={route}
          channel={selectedChannel}
          health={health}
          onNavigate={navigate}
          onCreate={() => setIsCreateOpen(true)}
          onRefresh={() => selectedChannel && loadPrivateData(selectedChannel.id)}
        />
        <main className="app-content">
          {error && (
            <div className="inline-alert error page-alert" role="alert">
              <Activity size={17} /> <span>{error}</span>
              <button type="button" className="btn-link" onClick={() => setError('')}>Đóng</button>
            </div>
          )}
          {notice && (
            <div className="toast page-toast" role="status" aria-live="polite">
              <Activity size={16} />
              <span>{notice}</span>
              <button type="button" className="toast-close" onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button>
            </div>
          )}

          {route.kind === 'channels' && (
            <ChannelsPage
              channels={channels}
              loading={channelsLoading}
              onOpenCreate={() => setIsCreateOpen(true)}
              onOpenChannel={(channelId) => navigate(`/channels/${channelId}/private_show`)}
            />
          )}

          {route.kind === 'channel' && !selectedChannel && channelsLoading && (
            <div className="loading-state card"><div className="spinner" /> Đang tải Channel...</div>
          )}

          {route.kind === 'channel' && !selectedChannel && !channelsLoading && (
            <div className="empty-state card">
              <Settings size={30} />
              <h2>Không tìm thấy Channel</h2>
              <p>Channel này không tồn tại hoặc bạn không có quyền truy cập.</p>
              <button type="button" className="btn-primary" onClick={() => navigate('/channels')}>Về danh sách Channel</button>
            </div>
          )}

          {route.kind === 'channel' && selectedChannel && route.tab === 'private_show' && (
            <ChannelPrivateView
              channel={selectedChannel}
              data={privateData}
              loading={privateLoading}
              onRefresh={() => loadPrivateData(selectedChannel.id)}
              onOpenKeys={() => navigate(`/channels/${selectedChannel.id}/api_keys`)}
            />
          )}

          {route.kind === 'channel' && selectedChannel && route.tab === 'api_keys' && (
            <ChannelApiKeysView channelId={selectedChannel.id} />
          )}
        </main>
      </div>
      <ChannelCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleChannelCreated}
      />
    </div>
  );
}
