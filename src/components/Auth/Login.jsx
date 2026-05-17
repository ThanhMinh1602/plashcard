import React, { useState } from "react";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { loginWithEmail } from "../../services/authService";
import { useLanguage } from "../../i18n/LanguageContext";
import AuthShell from "./AuthShell";

export default function Login({ onSwitch, onForgot }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError(t("auth.fillEmailPassword"));
      setLoading(false);
      return;
    }

    try {
      await loginWithEmail(email.trim(), password);
    } catch (err) {
      setError(err.message || t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.welcome")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <p>
          {t("auth.noAccount")}
          <button
            type='button'
            onClick={onSwitch}
            className='ml-2 font-semibold text-sky-600 transition hover:text-pink-500'
          >
            {t("auth.register")}
          </button>
        </p>
      }
    >
      {error && <div className='status-error mb-5'>{error}</div>}

      <form onSubmit={handleLogin} className='space-y-5'>
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
          <div className='flex items-center justify-between'>
            <label
              htmlFor='password'
              className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'
            >
              {t("auth.password")}
            </label>

            <button
              type='button'
              onClick={onForgot}
              className='text-xs font-semibold text-sky-600 transition hover:text-pink-500'
            >
              {t("auth.forgotPassword")}
            </button>
          </div>

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

        <button
          type='submit'
          disabled={loading}
          className='soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5'
        >
          <span>{loading ? t("auth.loggingIn") : t("auth.login")}</span>
          {!loading && <FiArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
}
