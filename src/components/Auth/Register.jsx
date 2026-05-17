import React, { useState } from "react";
import {
  FiArrowRight,
  FiCheckCircle,
  FiLock,
  FiMail,
  FiShield,
} from "react-icons/fi";
import { registerWithEmail } from "../../services/authService";
import { useLanguage } from "../../i18n/LanguageContext";
import AuthShell from "./AuthShell";

export default function Register({ onSwitch }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email || !password || !confirmPassword) {
      setError(t("auth.fillAll"));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordMin"));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      setLoading(false);
      return;
    }

    try {
      await registerWithEmail(email.trim(), password);
      setSuccess(t("auth.registerSuccess"));
      setTimeout(() => {
        onSwitch();
      }, 1500);
    } catch (err) {
      setError(err.message || t("auth.registerError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.start")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <p>
          {t("auth.hasAccount")}
          <button
            type='button'
            onClick={onSwitch}
            className='ml-2 font-semibold text-sky-600 transition hover:text-pink-500'
          >
            {t("auth.login")}
          </button>
        </p>
      }
    >
      {error && <div className='status-error mb-5'>{error}</div>}
      {success && <div className='status-success mb-5'>{success}</div>}

      <form onSubmit={handleRegister} className='space-y-5'>
        <div className='space-y-2'>
          <label
            htmlFor='email'
            className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'
          >
            Email
          </label>
          <div className='relative'>
            <FiMail
              className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
              size={16}
            />
            <input
              id='email'
              type='email'
              placeholder='your@email.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className='soft-input pl-11'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='password'
            className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'
          >
            {t("auth.password")}
          </label>
          <div className='relative'>
            <FiLock
              className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
              size={16}
            />
            <input
              id='password'
              type='password'
              placeholder='••••••••'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className='soft-input pl-11'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='confirm-password'
            className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'
          >
            {t("auth.confirmPassword")}
          </label>
          <div className='relative'>
            <FiShield
              className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
              size={16}
            />
            <input
              id='confirm-password'
              type='password'
              placeholder='••••••••'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className='soft-input pl-11'
            />
          </div>
        </div>

        <button
          type='submit'
          disabled={loading}
          className='soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5'
        >
          <span>{loading ? t("auth.registering") : t("auth.register")}</span>
          {!loading && <FiArrowRight size={16} />}
        </button>

        <div className='rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs leading-6 text-slate-600'>
          <div className='mb-1 flex items-center gap-2 font-semibold text-sky-700'>
            <FiCheckCircle size={14} />
            <span>{t("auth.apiAccountNote")}</span>
          </div>
          <p>{t("auth.mongoNote")}</p>
        </div>
      </form>
    </AuthShell>
  );
}
