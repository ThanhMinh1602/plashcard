import React, { useState } from 'react';
import { FiArrowLeft, FiCheck, FiKey, FiLock } from 'react-icons/fi';
import { changePassword } from '../../services/authService';

export default function ChangePassword({ onBack }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ mật khẩu');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Đổi mật khẩu thành công');
    } catch (err) {
      setError(err.message || 'Lỗi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='mx-auto w-full max-w-3xl px-4 pt-10 pb-8 sm:px-6 lg:px-8'>
      <div className='relative w-full overflow-hidden rounded-[34px] border border-white/70 bg-white/80 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-8'>
        <div className='pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-pink-200/40 blur-3xl' />

        <div className='relative mb-7 flex flex-wrap items-center justify-between gap-3'>
          <button
            type='button'
            onClick={onBack}
            className='inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-100 bg-white/90 px-4 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-800'
          >
            <FiArrowLeft size={16} />
            <span>Quay lại</span>
          </button>

          <div className='inline-flex h-11 items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/90 px-4 text-sm font-black text-sky-700 shadow-sm'>
            <FiKey size={16} />
            <span>Đổi mật khẩu</span>
          </div>
        </div>

        <div className='relative'>
          <h1 className='animate-gradient-x bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] bg-clip-text text-3xl font-black tracking-tight text-transparent'>
            Cập nhật mật khẩu
          </h1>
          <p className='mt-2 text-sm leading-6 text-slate-500'>
            Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới để
            đổi mật khẩu tài khoản.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='relative mt-7 space-y-5'>
          {error && <div className='status-error'>{error}</div>}
          {success && (
            <div className='rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700'>
              {success}
            </div>
          )}

          <PasswordField
            id='current-password'
            label='Mật khẩu cũ'
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={loading}
          />

          <PasswordField
            id='new-password'
            label='Mật khẩu mới'
            value={newPassword}
            onChange={setNewPassword}
            disabled={loading}
          />

          <PasswordField
            id='confirm-password'
            label='Xác nhận mật khẩu mới'
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={loading}
          />

          <button
            type='submit'
            disabled={loading}
            className='soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <span>{loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}</span>
            {!loading && <FiCheck size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, disabled }) {
  return (
    <div className='space-y-2'>
      <label
        htmlFor={id}
        className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'
      >
        {label}
      </label>

      <div className='relative'>
        <FiLock
          className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
          size={16}
        />

        <input
          id={id}
          type='password'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className='soft-input pl-11'
        />
      </div>
    </div>
  );
}
