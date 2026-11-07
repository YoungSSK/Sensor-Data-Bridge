import React, { useState } from 'react';
import { Cpu, Plus, KeyRound, Copy, Check, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { createProjectDevice } from '../services/api';

export default function CreateDeviceModal({ isOpen, onClose, projectId, onDeviceCreated }) {
  const [name, setName] = useState('Trạm Ớt Vườn 1');
  const [deviceCode, setDeviceCode] = useState('ESP32_PEPPER_01');
  const [intervalSec, setIntervalSec] = useState(30);
  const [loading, setLoading] = useState(false);
  const [createdToken, setCreatedToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createProjectDevice(projectId, {
        name,
        device_code: deviceCode.trim() || undefined,
        interval_seconds: parseInt(intervalSec, 10),
      });
      if (res.token && res.token.raw_token) {
        setCreatedToken({
          rawToken: res.token.raw_token,
          code: res.device_code,
        });
      }
      onDeviceCreated(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdToken?.rawToken) {
      navigator.clipboard.writeText(createdToken.rawToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleFinish = () => {
    setCreatedToken(null);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '520px' }}>
        {!createdToken ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#fff', margin: 0 }}>
                <Cpu size={20} color="#38bdf8" /> Đăng Ký Thiết Bị Mới
              </h2>
              <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={onClose}>
                <X size={14} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Thêm trạm ESP32 vào dự án. Hệ thống sẽ tự động tạo một khóa bí mật (Device Token) riêng cho trạm.
            </p>

            {error && (
              <div className="alert-error" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên Thiết Bị</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Trạm Ớt Vườn 1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mã Trạm (Device Code)</label>
                <input
                  type="text"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  placeholder="ESP32_PEPPER_01"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Để trống nếu muốn hệ thống tự động sinh ngẫu nhiên.
                </small>
              </div>

              <div className="form-group">
                <label>Chu kỳ gửi dữ liệu dự kiến (giây)</label>
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(e.target.value)}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} />
                  {loading ? 'Đang tạo...' : 'Tạo Thiết Bị & Cấp Khóa'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <h2 style={{ marginTop: '8px', color: 'var(--success)' }}>Tạo Thiết Bị Thành Công!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Trạm <strong>{createdToken.code}</strong> đã sẵn sàng. Hãy lưu lại Device Token bên dưới để nạp vào ESP32.
              </p>
            </div>

            <div className="token-box">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <KeyRound size={13} color="#38bdf8" /> DEVICE TOKEN (Chỉ hiển thị một lần):
              </div>
              <div className="token-display">
                <code>{createdToken.rawToken}</code>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={handleCopy}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Đã Copy!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: '#090d16', padding: '12px', borderRadius: '8px', fontSize: '0.8rem' }}>
              <div style={{ color: '#38bdf8', fontWeight: '600', marginBottom: '6px' }}>Cấu hình Arduino / ESP32:</div>
              <pre style={{ color: '#cbd5e1', overflowX: 'auto', margin: 0 }}>
{`const char* DEVICE_TOKEN = "${createdToken.rawToken}";`}
              </pre>
            </div>

            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={handleFinish}>
                Đã Lưu Xong, Vào Bảng Điều Khiển
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
