import React, { useState } from 'react';
import { FiArrowLeft, FiCheck, FiKey, FiLock } from 'react-icons/fi';
import { changePassword } from '../../services/authService';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ChangePassword({ onBack }) {
  const { t } = useLanguage();
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
      setError(t('auth.fillPasswords'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.newPasswordMin'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.newPasswordMismatch'));
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t('auth.changePasswordSuccess'));
    } catch (err) {
      setError(err.message || t('auth.changePasswordError'));
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
            <span>{t('common.back')}</span>
          </button>

          <div className='inline-flex h-11 items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/90 px-4 text-sm font-black text-sky-700 shadow-sm'>
            <FiKey size={16} />
            <span>{t('common.changePassword')}</span>
          </div>
        </div>

        <div className='relative'>
          <h1 className='animate-gradient-x bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] bg-clip-text text-3xl font-black tracking-tight text-transparent'>
            {t('auth.changePasswordTitle')}
          </h1>
          <p className='mt-2 text-sm leading-6 text-slate-500'>
            {t('auth.changePasswordSubtitle')}
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
            label={t('auth.currentPassword')}
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={loading}
          />

          <PasswordField
            id='new-password'
            label={t('auth.newPassword')}
            value={newPassword}
            onChange={setNewPassword}
            disabled={loading}
          />

          <PasswordField
            id='confirm-password'
            label={t('auth.confirmNewPassword')}
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={loading}
          />

          <button
            type='submit'
            disabled={loading}
            className='soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <span>{loading ? t('auth.resettingPassword') : t('common.changePassword')}</span>
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
