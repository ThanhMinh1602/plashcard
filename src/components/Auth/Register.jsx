import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FiArrowRight, FiCheckCircle, FiLock, FiMail, FiShield } from 'react-icons/fi';
import { auth } from '../../services/firebase';
import { saveUserToFirestore } from '../../services/flashcardService';
import AuthShell from './AuthShell';

export default function Register({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(userCredential.user.uid, email);
      setSuccess('Đăng ký thành công! Chuyển hướng...');

      setTimeout(() => {
        onSwitch();
      }, 1500);
    } catch (err) {
      let errorMessage = 'Lỗi đăng ký';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email này đã được sử dụng';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Bắt đầu"
      subtitle="Tạo tài khoản Flashcard"
      footer={
        <p>
          Đã có tài khoản?
          <button
            type="button"
            onClick={onSwitch}
            className="ml-2 font-semibold text-sky-600 transition hover:text-pink-500"
          >
            Đăng nhập
          </button>
        </p>
      }
    >
      {error && <div className="status-error mb-5">{error}</div>}
      {success && <div className="status-success mb-5">{success}</div>}

      <form onSubmit={handleRegister} className="space-y-5">
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
          <label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Mật khẩu
          </label>
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

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <FiShield className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          <span>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</span>
          {!loading && <FiArrowRight size={16} />}
        </button>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs leading-6 text-slate-600">
          <div className="mb-1 flex items-center gap-2 font-semibold text-sky-700">
            <FiCheckCircle size={14} />
            <span>Tài khoản mới sẽ được tạo bằng Firebase Auth</span>
          </div>
          <p>Email cũng được lưu vào Firestore như logic gốc của app.</p>
        </div>
      </form>
    </AuthShell>
  );
}