import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }

    if (mode === 'register') {
      if (!password || password.length < 6) {
        setError('Mật khẩu đăng ký phải có ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
        return;
      }

      setLoading(true);
      try {
        const data = await registerUser({
          email: cleanEmail,
          password,
          full_name: fullName.trim() || undefined,
        });
        setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển hướng vào Dashboard...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 600);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        const data = await loginUser({
          email: cleanEmail,
          password: password || undefined,
          full_name: fullName.trim() || undefined,
        });
        onLoginSuccess(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* TAB TOGGLE: LOGIN / REGISTER */}
        <div className="auth-nav-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('login')}
          >
            <LogIn size={16} /> Đăng Nhập
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('register')}
          >
            <UserPlus size={16} /> Đăng Ký Mới
          </button>
        </div>

        <div className="auth-header-text">
          <h2>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</h2>
          <p className="login-desc">
            {mode === 'login'
              ? 'Đăng nhập để quản lý dự án vườn ươm, trạm ESP32 và nhật ký telemetry.'
              : 'Đăng ký tài khoản với bất kỳ email cá nhân nào (Gmail, Yahoo, Outlook...) để bắt đầu.'}
          </p>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Họ và Tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label>Địa Chỉ Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vidu@gmail.com hoặc email bất kỳ"
              required
              autoComplete="email"
            />
            <span className="input-hint">
              Chấp nhận mọi loại email (Gmail, Outlook, Yahoo, v.v., không bắt buộc mail trường .edu).
            </span>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Mật Khẩu</label>
              <button
                type="button"
                className="btn-link"
                style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? 'Ẩn' : 'Hiện mật khẩu'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu của bạn'}
              required={mode === 'register'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>Xác Nhận Mật Khẩu</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu ở trên"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '10px' }}
            disabled={loading}
          >
            {loading ? (
              'Đang xử lý...'
            ) : mode === 'login' ? (
              <>
                Đăng Nhập Vào Hệ Thống <ArrowRight size={16} />
              </>
            ) : (
              <>
                Hoàn Tất Đăng Ký <CheckCircle2 size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-toggle">
          {mode === 'login' ? (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                className="btn-link"
                style={{ fontWeight: '600' }}
                onClick={() => handleSwitchMode('register')}
              >
                Đăng ký ngay tại đây
              </button>
            </span>
          ) : (
            <span>
              Đã có tài khoản rồi?{' '}
              <button
                type="button"
                className="btn-link"
                style={{ fontWeight: '600' }}
                onClick={() => handleSwitchMode('login')}
              >
                Đăng nhập tại đây
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
