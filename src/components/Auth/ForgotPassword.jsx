import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import './Auth.css';

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email) {
      setError('Vui lòng nhập email của bạn');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Đã gửi email khôi phục mật khẩu! Kiểm tra hộp thư của bạn.');
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error) {
      let errorMessage = 'Lỗi gửi email';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Không tìm thấy tài khoản với email này';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
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
          <h1 className="auth-title">🔑 Khôi phục</h1>
          <p className="auth-subtitle">Đặt lại mật khẩu của bạn</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleReset} className="auth-form">
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

          <button type="submit" className="auth-button primary" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi email reset'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link" onClick={onBack}>
            ← Quay lại đăng nhập
          </p>
        </div>
      </div>
    </div>
  );
}