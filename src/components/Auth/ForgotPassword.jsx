import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FiArrowLeft, FiMail, FiSend } from 'react-icons/fi';
import { auth } from '../../services/firebase';
import AuthShell from './AuthShell';

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
    } catch (err) {
      let errorMessage = 'Lỗi gửi email';

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Không tìm thấy tài khoản với email này';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Khôi phục"
      subtitle="Đặt lại mật khẩu của bạn"
      footer={
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-semibold text-sky-600 transition hover:text-pink-500"
        >
          <FiArrowLeft size={14} />
          <span>Quay lại đăng nhập</span>
        </button>
      }
    >
      {error && <div className="status-error mb-5">{error}</div>}
      {success && <div className="status-success mb-5">{success}</div>}

      <form onSubmit={handleReset} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Email
          </label>
          <div className="relative">
            <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="soft-input pl-11"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5"
        >
          <span>{loading ? 'Đang gửi...' : 'Gửi email reset'}</span>
          {!loading && <FiSend size={16} />}
        </button>
      </form>
    </AuthShell>
  );
}