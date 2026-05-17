import React, { useState } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiKey,
  FiLock,
  FiMail,
  FiSend,
} from "react-icons/fi";
import {
  forgotPassword,
  resetPassword,
  verifyResetOtp,
} from "../../services/authService";
import { useLanguage } from "../../i18n/LanguageContext";
import AuthShell from "./AuthShell";

export default function ForgotPassword({ onBack }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessage = () => {
    setError("");
    setSuccess("");
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!email.trim()) {
      setError(t("auth.fillResetEmail"));
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email.trim());
      setSuccess(t("auth.otpSent"));
      setStep(2);
    } catch (err) {
      setError(err.message || t("auth.otpSendError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!otp.trim()) {
      setError(t("auth.fillOtp"));
      return;
    }

    if (otp.trim().length !== 6) {
      setError(t("auth.otpLength"));
      return;
    }

    try {
      setLoading(true);
      await verifyResetOtp(email.trim(), otp.trim());
      setSuccess(t("auth.otpVerified"));
      setStep(3);
    } catch (err) {
      setError(err.message || t("auth.otpError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!newPassword || !confirmPassword) {
      setError(t("auth.fillNewPasswords"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("auth.passwordMin"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setSuccess(t("auth.resetSuccess"));
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      setError(err.message || t("auth.resetError"));
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    if (step === 1) {
      return {
        title: t("auth.forgotTitle"),
        subtitle: t("auth.forgotSubtitle"),
      };
    }

    if (step === 2) {
      return {
        title: t("auth.otpTitle"),
        subtitle: t("auth.otpSubtitle", { email }),
      };
    }

    return {
      title: t("auth.resetTitle"),
      subtitle: t("auth.resetSubtitle"),
    };
  };

  const header = renderHeader();

  return (
    <AuthShell
      title={header.title}
      subtitle={header.subtitle}
      footer={
        <button
          type='button'
          onClick={onBack}
          className='inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700'
        >
          <FiArrowLeft />
          {t("auth.backToLogin")}
        </button>
      }
    >
      {error && (
        <div className='mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600'>
          {error}
        </div>
      )}

      {success && (
        <div className='mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600'>
          {success}
        </div>
      )}

      <div className='mb-6 grid grid-cols-3 gap-2'>
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className={`h-2 rounded-full transition-all ${
              item <= step
                ? "bg-gradient-to-r from-violet-500 to-pink-500"
                : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleSendOtp} className='space-y-5'>
          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700'>
              {t("common.email")}
            </span>

            <div className='relative'>
              <FiMail className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='email'
                placeholder={t("auth.enterEmail")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className='soft-input pl-11'
              />
            </div>
          </label>

          <button
            type='submit'
            disabled={loading}
            className='soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5'
          >
            {loading ? t("auth.sendingOtp") : t("auth.sendOtp")}
            {!loading && <FiSend />}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className='space-y-5'>
          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700'>
              {t("auth.otpLabel")}
            </span>

            <div className='relative'>
              <FiKey className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='text'
                inputMode='numeric'
                maxLength={6}
                placeholder={t("auth.otpPlaceholder")}
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setOtp(value);
                }}
                disabled={loading}
                className='soft-input pl-11 tracking-[0.35em]'
              />
            </div>
          </label>

          <button
            type='submit'
            disabled={loading}
            className='soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5'
          >
            {loading ? t("auth.verifyingOtp") : t("auth.verifyOtp")}
            {!loading && <FiCheckCircle />}
          </button>

          <button
            type='button'
            disabled={loading}
            onClick={handleSendOtp}
            className='w-full rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-600 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {t("auth.resendOtp")}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className='space-y-5'>
          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700'>
              {t("auth.newPassword")}
            </span>

            <div className='relative'>
              <FiLock className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='password'
                placeholder={t("auth.newPasswordPlaceholder")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className='soft-input pl-11'
              />
            </div>
          </label>

          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700'>
              {t("auth.repeatNewPassword")}
            </span>

            <div className='relative'>
              <FiLock className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='password'
                placeholder={t("auth.repeatNewPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className='soft-input pl-11'
              />
            </div>
          </label>

          <button
            type='submit'
            disabled={loading}
            className='soft-button gradient-strong h-12 w-full rounded-2xl text-sm font-bold hover:-translate-y-0.5'
          >
            {loading ? t("auth.resettingPassword") : t("auth.resetPassword")}
            {!loading && <FiCheckCircle />}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
