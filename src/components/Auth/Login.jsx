import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import './Auth.css';

export default function Login({ onSwitch, onForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      let errorMessage = 'Lỗi đăng nhập';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Không tìm thấy tài khoản này';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mật khẩu không đúng';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">✨ Welcome</h1>
          <p className="auth-subtitle">Đăng nhập vào Flashcard</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              placeholder="your@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input 
              id="password"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              disabled={loading}
              className="form-input"
            />
          </div>

          <button type="submit" className="auth-button primary" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link" onClick={onForgot}>
            Quên mật khẩu?
          </p>
          <p>
            Chưa có tài khoản? 
            <span className="auth-link" onClick={onSwitch}>Đăng ký</span>
          </p>
        </div>
      </div>
    </div>
  );
}