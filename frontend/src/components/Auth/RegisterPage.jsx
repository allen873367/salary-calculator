import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('兩次密碼輸入不一致');
      return;
    }
    if (password.length < 4) {
      setError('密碼長度至少 4 碼');
      return;
    }
    try {
      await register(username, password);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === 'object') {
        const msgs = Object.values(detail).flat().join('；');
        setError(msgs || '註冊失敗');
      } else {
        setError(detail || '註冊失敗');
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="d1"></div>
        <div className="d2"></div>
        <h1>建立你的<br/>薪資帳戶</h1>
        <p>隨時隨地記錄<br/>每一筆打工收入</p>
        <div className="dots">
          <span></span>
          <span className="on"></span>
          <span></span>
        </div>
      </div>
      <div className="auth-form">
        <h2>註冊</h2>
        <p className="sub">建立新帳號開始使用</p>
        <form onSubmit={handleSubmit}>
          <div className="fg">
            <div className="form-group">
              <label>帳號</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="請輸入帳號" required autoFocus />
            </div>
          </div>
          <div className="fg">
            <div className="form-group">
              <label>密碼</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="請輸入密碼" required />
            </div>
          </div>
          <div className="fg">
            <div className="form-group">
              <label>確認密碼</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次輸入密碼" required />
            </div>
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 16 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 46, justifyContent: 'center', fontSize: '0.92rem' }}>
            註冊
          </button>
        </form>
        <div className="al">
          已經有帳號？ <Link to="/login">登入</Link>
        </div>
      </div>
    </div>
  );
}
