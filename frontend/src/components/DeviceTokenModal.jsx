import React, { useEffect, useState } from 'react';
import { KeyRound, Copy, Check, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { getDeviceTokens, issueDeviceToken, revokeDeviceToken } from '../services/api';

export default function DeviceTokenModal({ isOpen, onClose, device, onTokensUpdated }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState(null);
  const [error, setError] = useState(null);

  const fetchTokens = async () => {
    if (!device?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceTokens(device.id);
      setTokens(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && device?.id) {
      fetchTokens();
      setNewlyCreatedToken(null);
    }
  }, [isOpen, device?.id]);

  if (!isOpen || !device) return null;

  const handleCopy = (tokenStr) => {
    navigator.clipboard.writeText(tokenStr);
    setCopiedToken(tokenStr);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleGenerateNew = async () => {
    if (!confirm('Bạn có chắc chắn muốn cấp thêm một Device Token mới cho trạm này?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await issueDeviceToken(device.id, `Token-${new Date().toLocaleDateString()}`);
      setNewlyCreatedToken(res.raw_token);
      await fetchTokens();
      if (onTokensUpdated) onTokensUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (tokenId) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi token này? Thiết bị dùng token này sẽ không thể gửi dữ liệu nữa.')) return;
    try {
      await revokeDeviceToken(device.id, tokenId);
      await fetchTokens();
      if (onTokensUpdated) onTokensUpdated();
    } catch (err) {
      alert('Thu hồi thất bại: ' + err.message);
    }
  };

  const activeToken = tokens.find((t) => !t.revoked_at && t.raw_token);
  const displayToken = newlyCreatedToken || activeToken?.raw_token || device.token?.raw_token;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="#38bdf8" /> Device Token • {device.device_code}
          </h2>
          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Device Token được sử dụng để xác thực trong Header <code>Authorization: Bearer &lt;TOKEN&gt;</code> khi ESP32 gửi dữ liệu telemetry.
        </p>

        {error && (
          <div className="alert-error" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {displayToken ? (
          <div className="token-box" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: '600' }}>
                TOKEN HOẠT ĐỘNG (Dùng cho ESP32 / Wokwi):
              </span>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => handleCopy(displayToken)}
              >
                {copiedToken === displayToken ? <Check size={13} /> : <Copy size={13} />}
                {copiedToken === displayToken ? 'Đã Copy!' : 'Sao Chép Token'}
              </button>
            </div>
            <div className="token-display">
              <code style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{displayToken}</code>
            </div>

            <div style={{ marginTop: '12px', background: '#0b1120', padding: '10px', borderRadius: '6px', fontSize: '0.8rem' }}>
              <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Mã nguồn Arduino C++ / Wokwi:</div>
              <pre style={{ color: '#38bdf8', margin: 0, overflowX: 'auto' }}>
{`const char* DEVICE_TOKEN = "${displayToken}";`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="alert-error" style={{ marginBottom: '16px' }}>
            Trạm này chưa có token được hiển thị. Bấm nút "Cấp Token Mới" bên dưới để tạo token.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 10px' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#cbd5e1' }}>Danh sách khóa của trạm ({tokens.length})</h3>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            onClick={handleGenerateNew}
            disabled={loading}
          >
            <Plus size={13} /> Cấp Token Mới
          </button>
        </div>

        <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#090d16', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
          {tokens.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chưa có token nào.
            </div>
          ) : (
            tokens.map((t) => {
              const isRevoked = !!t.revoked_at;
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom: '1px solid #1e293b',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <code style={{ color: isRevoked ? '#64748b' : '#38bdf8' }}>{t.token_prefix}...</code>
                      <span className={`time-pill ${isRevoked ? 'pill-unsynced' : 'pill-synced'}`} style={{ fontSize: '0.7rem' }}>
                        {isRevoked ? 'Đã thu hồi' : 'Đang hoạt động'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Tạo: {new Date(t.created_at).toLocaleDateString()}
                      {t.last_used_at && ` • Dùng lúc: ${new Date(t.last_used_at).toLocaleTimeString()}`}
                    </div>
                  </div>

                  {!isRevoked && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {t.raw_token && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          onClick={() => handleCopy(t.raw_token)}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        onClick={() => handleRevoke(t.id)}
                      >
                        <Trash2 size={12} /> Thu hồi
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
