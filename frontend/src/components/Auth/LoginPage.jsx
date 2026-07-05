import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || '登入失敗，請檢查帳號密碼');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="d1"></div>
        <div className="d2"></div>
        <h1>打工薪資<br/>計算器</h1>
        <p>記錄每一份辛苦<br/>輕鬆掌握收入</p>
        <div className="dots">
          <span className="on"></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div className="auth-form">
        <h2>登入</h2>
        <p className="sub">輸入帳號密碼繼續</p>
        <form onSubmit={handleSubmit}>
          <div className="fg">
            <div className="form-group">
              <label>帳號</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                required
                autoFocus
              />
            </div>
          </div>
          <div className="fg">
            <div className="form-group">
              <label>密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                required
              />
            </div>
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 16 }}>{error}</p>}
          <div className="forgot">忘記密碼？</div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 46, justifyContent: 'center', fontSize: '0.92rem' }}>
            登入
          </button>
        </form>
        <div className="al">
          還沒有帳號？ <Link to="/register">註冊</Link>
        </div>
      </div>
    </div>
  );
}
