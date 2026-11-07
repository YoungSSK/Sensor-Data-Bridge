import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import {
  createChannelApiKey,
  getChannelApiKeys,
  revokeChannelApiKey,
} from '../services/api';

// Keep a short-lived fallback for keys created in this tab. Active keys are
// also returned by the authenticated backend in encrypted-at-rest form.
const volatileSecrets = new Map();

const secretCacheKey = (channelId, keyId) => `${channelId}:${keyId}`;

async function copyToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Trình duyệt không cho phép sao chép. Hãy kiểm tra quyền clipboard.');
}

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

function KeyTable({ keys, onRevoke, visibleSecrets, onCopy, copiedKeyId }) {
  if (!keys.length) {
    return <div className="small-empty">Chưa có khóa loại này.</div>;
  }

  return (
    <div className="key-list">
      {keys.map((apiKey) => {
        const revoked = Boolean(apiKey.revoked_at);
        const fullKey = !revoked && (apiKey.raw_key || visibleSecrets?.[apiKey.id]);
        const canCopy = Boolean(fullKey);
        return (
          <div className="key-row" key={apiKey.id}>
            <div className="key-row-main">
              <strong>{apiKey.name}</strong>
              <code>{fullKey || apiKey.key_prefix}</code>
              {!fullKey && !revoked && (
                <span className="key-unavailable">Khóa cũ không thể xem đầy đủ. Hãy tạo khóa mới.</span>
              )}
            </div>
            <div className="key-row-meta">
              <span>{formatDate(apiKey.created_at)}</span>
              <span className={`status-chip ${revoked ? 'revoked' : 'active'}`}>
                {revoked ? 'Đã thu hồi' : 'Đang hoạt động'}
              </span>
            </div>
            <div className="key-row-actions">
              <button
                type="button"
                className="key-copy-button"
                onClick={() => onCopy(apiKey)}
                disabled={!canCopy}
                title={canCopy ? 'Sao chép API Key' : revoked ? 'API Key đã bị thu hồi' : 'Không thể khôi phục secret; hãy tạo key mới'}
                aria-label={canCopy ? `Sao chép ${apiKey.name}` : `Không thể sao chép ${apiKey.name}; secret không còn khả dụng`}
              >
                {copiedKeyId === apiKey.id ? <Check size={16} /> : <Copy size={16} />}
              </button>
              {!revoked && (
                <button type="button" className="btn-danger-ghost" onClick={() => onRevoke(apiKey)}>
                  <Trash2 size={15} /> Thu hồi
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ChannelApiKeysView({ channelId }) {
  const [keys, setKeys] = useState([]);
  const [type, setType] = useState('write');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState(null);
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [notice, setNotice] = useState('');
  const [pendingRevoke, setPendingRevoke] = useState(null);

  const loadKeys = async () => {
    setLoading(true);
    setError('');
    try {
      setKeys(await getChannelApiKeys(channelId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [channelId]);

  useEffect(() => {
    const availableSecrets = {};
    for (const apiKey of keys) {
      const cached = apiKey.raw_key || volatileSecrets.get(secretCacheKey(channelId, apiKey.id));
      if (cached && !apiKey.revoked_at) availableSecrets[apiKey.id] = cached;
    }
    setVisibleSecrets(availableSecrets);
  }, [channelId, keys]);

  useEffect(() => {
    if (!pendingRevoke) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPendingRevoke(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingRevoke]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await createChannelApiKey(channelId, {
        type,
        name: name.trim() || (type === 'write' ? 'ESP32 Write Key' : 'Ứng dụng đọc dữ liệu'),
      });
      const secretValue = created.raw_key || created.key;
      if (secretValue) {
        volatileSecrets.set(secretCacheKey(channelId, created.id), secretValue);
      }
      setVisibleSecrets((current) => ({
        ...current,
        [created.id]: secretValue,
      }));
      setSecret({
        id: created.id,
        type: created.type,
        value: secretValue,
      });
      setName('');
      setNotice(`${created.type === 'write' ? 'Write' : 'Read'} API Key đã được tạo.`);
      await loadKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    setError('');
    try {
      await revokeChannelApiKey(channelId, pendingRevoke.id);
      volatileSecrets.delete(secretCacheKey(channelId, pendingRevoke.id));
      setVisibleSecrets((current) => {
        const next = { ...current };
        delete next[pendingRevoke.id];
        return next;
      });
      setNotice(`Đã thu hồi “${pendingRevoke.name}”.`);
      setPendingRevoke(null);
      await loadKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const copySecret = async () => {
    if (!secret?.value) return;
    try {
      await copyToClipboard(secret.value);
      setCopied(true);
      setNotice('Đã sao chép API Key.');
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      setError(err.message);
    }
  };

  const copyKey = async (apiKey) => {
    const secretValue = apiKey.raw_key
      || visibleSecrets?.[apiKey.id]
      || volatileSecrets.get(secretCacheKey(channelId, apiKey.id));
    if (!secretValue) {
      setNotice('Không thể khôi phục secret của key này. Hãy tạo một key mới để sao chép.');
      return;
    }
    try {
      await copyToClipboard(secretValue);
      setCopiedKeyId(apiKey.id);
      setNotice(`Đã sao chép ${apiKey.type === 'write' ? 'Write' : 'Read'} API Key.`);
      window.setTimeout(() => setCopiedKeyId(null), 1800);
    } catch (err) {
      setError(err.message);
    }
  };

  const writeKeys = keys.filter((apiKey) => apiKey.type === 'write');
  const readKeys = keys.filter((apiKey) => apiKey.type === 'read');

  return (
    <section className="page-stack">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">QUYỀN TRUY CẬP</span>
          <h2>API Keys</h2>
          <p>Write key dành cho ESP32; Read key dành cho ứng dụng đọc dữ liệu.</p>
        </div>
        <button type="button" className="btn-tertiary btn-small" onClick={loadKeys} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Làm mới
        </button>
      </div>

      {notice && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={16} />
          <span>{notice}</span>
          <button type="button" className="toast-close" onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button>
        </div>
      )}

      {error && (
        <div className="inline-alert error" role="alert">
          <AlertCircle size={17} /> <span>{error}</span>
        </div>
      )}

      {secret && (
        <div className="secret-banner" role="status">
          <div className="secret-banner-icon"><ShieldCheck size={20} /></div>
          <div className="secret-banner-copy">
            <strong>Khóa mới đã được tạo — hãy lưu ngay</strong>
            <span>Secret được mã hóa trong backend và có thể sao chép lại khi key còn hoạt động.</span>
            <code>{secret.value}</code>
          </div>
          <button type="button" className="btn-primary btn-small" onClick={copySecret}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </button>
          <button type="button" className="icon-button" onClick={() => setSecret(null)} aria-label="Ẩn secret">
            ×
          </button>
        </div>
      )}

      <div className="key-create-card card">
        <div className="card-heading compact-heading">
          <div className="card-icon brand-icon"><Plus size={18} /></div>
          <div>
            <h3>Tạo API Key mới</h3>
            <p>Chọn đúng quyền tối thiểu cho thiết bị hoặc ứng dụng.</p>
          </div>
        </div>
        <form className="key-create-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="api-key-type">Loại khóa</label>
            <select id="api-key-type" className="input-control" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="write">Write API Key — ghi feed</option>
              <option value="read">Read API Key — đọc feed</option>
            </select>
          </div>
          <div className="form-group key-name-input">
            <label htmlFor="api-key-name">Tên khóa <span className="optional">Không bắt buộc</span></label>
            <input
              id="api-key-name"
              className="input-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={type === 'write' ? 'ESP32 vườn ươm' : 'Dashboard đọc dữ liệu'}
              maxLength={100}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            <KeyRound size={16} /> {saving ? 'Đang tạo...' : 'Tạo khóa'}
          </button>
        </form>
      </div>

      <div className="key-panels-grid">
        <div className="card key-panel">
          <div className="card-heading">
            <div className="card-icon write-icon"><KeyRound size={18} /></div>
            <div>
              <h3>Write API Keys</h3>
              <p>Dùng để gửi số đo vào Channel này.</p>
            </div>
          </div>
          {loading ? <div className="loading-line">Đang tải danh sách khóa...</div> : <KeyTable keys={writeKeys} onRevoke={setPendingRevoke} visibleSecrets={visibleSecrets} onCopy={copyKey} copiedKeyId={copiedKeyId} />}
        </div>

        <div className="card key-panel">
          <div className="card-heading">
            <div className="card-icon read-icon"><ShieldCheck size={18} /></div>
            <div>
              <h3>Read API Keys</h3>
              <p>Dùng để đọc số liệu từ Channel này.</p>
            </div>
          </div>
          {loading ? <div className="loading-line">Đang tải danh sách khóa...</div> : <KeyTable keys={readKeys} onRevoke={setPendingRevoke} visibleSecrets={visibleSecrets} onCopy={copyKey} copiedKeyId={copiedKeyId} />}
        </div>
      </div>

      {pendingRevoke && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPendingRevoke(null)}>
          <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="revoke-key-title">
            <div className="confirm-modal-icon"><AlertCircle size={23} /></div>
            <h2 id="revoke-key-title">Thu hồi API Key?</h2>
            <p>
              Khóa <strong>“{pendingRevoke.name}”</strong> sẽ mất quyền truy cập ngay. Thiết bị hoặc ứng dụng đang dùng khóa này sẽ không gửi/đọc được dữ liệu nữa.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-tertiary" onClick={() => setPendingRevoke(null)}>Hủy</button>
              <button type="button" className="btn-danger" onClick={handleRevoke}>Thu hồi khóa</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
