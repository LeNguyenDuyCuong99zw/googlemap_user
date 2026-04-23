/**
 * pages/LoginPage.jsx — Trang đăng nhập / đăng ký
 * 
 * Features:
 * - Toggle giữa Login và Register form
 * - Đăng nhập bằng Google (1 click)
 * - Đăng nhập / đăng ký bằng Email + Password
 * - Hiển thị lỗi Firebase (translated to Vietnamese)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Map Firebase error code → thông báo tiếng Việt
const FIREBASE_ERRORS = {
  'auth/user-not-found':       'Email không tồn tại',
  'auth/wrong-password':       'Mật khẩu không đúng',
  'auth/email-already-in-use': 'Email đã được sử dụng',
  'auth/weak-password':        'Mật khẩu phải ít nhất 6 ký tự',
  'auth/invalid-email':        'Email không hợp lệ',
  'auth/popup-closed-by-user': 'Đã đóng cửa sổ đăng nhập Google',
  'auth/network-request-failed': 'Lỗi mạng, vui lòng thử lại',
};

function getErrorMsg(err) {
  const code = err?.code;
  return FIREBASE_ERRORS[code] || err?.message || 'Đã có lỗi xảy ra';
}

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();

  const startApp = () => {
    setShowSplash(true);
    setTimeout(() => {
      navigate('/map');
    }, 10000);
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
      startApp();
    } catch (err) {
      setErrorMsg(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      if (isRegister) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      startApp();
    } catch (err) {
      setErrorMsg(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return (
      <div className="auth-page" style={{ background: '#000' }}>
        <div style={{ width: 400, height: 400 }}>
          <DotLottieReact
            src="https://lottie.host/dc20438e-419a-4665-b6d3-2b80f3fc0467/7HYbyxfZnV.lottie"
            loop
            autoplay
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0' }}>
          <div style={{ width: 80, height: 80 }}>
            <DotLottieReact
              src="https://lottie.host/a10d6761-269f-4700-bdbc-6c7693050caf/SilgbdxVrh.lottie"
              loop
              autoplay
            />
          </div>
          <h1 className="auth-card__title" style={{ margin: 0 }}>MAPVIT</h1>
        </div>
        <p className="auth-card__subtitle" style={{ textAlign: 'center', marginTop: '8px' }}>
          {isRegister ? 'Tạo tài khoản miễn phí' : 'Chào mừng trở lại!'}
        </p>

        {/* Google Login */}
        <button
          id="btn-google-login"
          className="btn btn-outline btn-full"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ marginBottom: 4 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.7 5.4 2.9 13.3l7.8 6.1C12.6 13.1 17.9 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
            <path fill="#FBBC05" d="M10.7 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.5 13.3A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.2-6.1z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.6l-7.5-5.8c-2.1 1.4-4.7 2.2-7.7 2.2-6.1 0-11.3-3.6-13.3-8.8l-8.2 6.1C6.7 42.6 14.6 48 24 48z"/>
          </svg>
          Tiếp tục với Google
        </button>

        <div className="auth-divider">hoặc</div>

        {/* Email Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="input-group">
              <label className="input-label" htmlFor="input-name">Họ và tên</label>
              <input
                id="input-name"
                className="input"
                type="text"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={e => setName(e.target.value)}
                required={isRegister}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="input-email">Email</label>
            <input
              id="input-email"
              className="input"
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="input-password">Mật khẩu</label>
            <input
              id="input-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {errorMsg && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#ef4444',
              fontSize: 13,
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            id="btn-submit-auth"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading
              ? <span className="spinner" style={{ borderTopColor: '#fff' }} />
              : isRegister ? 'Đăng ký' : 'Đăng nhập'
            }
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <a onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); }}>
            {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
          </a>
        </p>
      </div>
    </div>
  );
}
