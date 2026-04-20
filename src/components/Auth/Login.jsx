import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FiArrowRight, FiLock, FiMail } from 'react-icons/fi';
import { auth } from '../../services/firebase';
import AuthShell from './AuthShell';

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
    } catch (err) {
      let errorMessage = 'Lỗi đăng nhập';

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Không tìm thấy tài khoản này';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Mật khẩu không đúng';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome"
      subtitle="Đăng nhập vào Flashcard"
      footer={
        <p>
          Chưa có tài khoản?
          <button
            type="button"
            onClick={onSwitch}
            className="ml-2 font-semibold text-sky-600 transition hover:text-pink-500"
          >
            Đăng ký
          </button>
        </p>
      }
    >
      {error && <div className="status-error mb-5">{error}</div>}

      <form onSubmit={handleLogin} className="space-y-5">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Mật khẩu
            </label>

            <button
              type="button"
              onClick={onForgot}
              className="text-xs font-semibold text-sky-600 transition hover:text-pink-500"
            >
              Quên mật khẩu?
            </button>
          </div>

          <div className="relative">
            <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          {!loading && <FiArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
}