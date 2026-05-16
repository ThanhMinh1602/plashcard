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
import AuthShell from "./AuthShell";

export default function ForgotPassword({ onBack }) {
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
      setError("Vui lòng nhập email của bạn");
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email.trim());
      setSuccess("Đã gửi mã OTP đến Gmail của bạn. Vui lòng kiểm tra hộp thư.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Không thể gửi OTP. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!otp.trim()) {
      setError("Vui lòng nhập mã OTP");
      return;
    }

    if (otp.trim().length !== 6) {
      setError("Mã OTP phải gồm 6 chữ số");
      return;
    }

    try {
      setLoading(true);
      await verifyResetOtp(email.trim(), otp.trim());
      setSuccess("Xác thực OTP thành công. Hãy nhập mật khẩu mới.");
      setStep(3);
    } catch (err) {
      setError(err.message || "OTP không đúng hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ mật khẩu mới");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setSuccess("Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.");
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      setError(err.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    if (step === 1) {
      return {
        title: "Quên mật khẩu?",
        subtitle: "Nhập email tài khoản để nhận mã OTP khôi phục mật khẩu.",
      };
    }

    if (step === 2) {
      return {
        title: "Nhập mã OTP",
        subtitle: `Mã xác thực đã được gửi đến ${email}`,
      };
    }

    return {
      title: "Tạo mật khẩu mới",
      subtitle: "Nhập mật khẩu mới để hoàn tất quá trình khôi phục.",
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
          Quay lại đăng nhập
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
              Email
            </span>

            <div className='relative'>
              <FiMail className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='email'
                placeholder='Nhập email của bạn'
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
            {loading ? "Đang gửi OTP..." : "Gửi mã OTP"}
            {!loading && <FiSend />}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className='space-y-5'>
          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700'>
              Mã OTP
            </span>

            <div className='relative'>
              <FiKey className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='text'
                inputMode='numeric'
                maxLength={6}
                placeholder='Nhập 6 chữ số'
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
            {loading ? "Đang xác thực..." : "Xác thực OTP"}
            {!loading && <FiCheckCircle />}
          </button>

          <button
            type='button'
            disabled={loading}
            onClick={handleSendOtp}
            className='w-full rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-600 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60'
          >
            Gửi lại mã OTP
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className='space-y-5'>
          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700'>
              Mật khẩu mới
            </span>

            <div className='relative'>
              <FiLock className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='password'
                placeholder='Nhập mật khẩu mới'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className='soft-input pl-11'
              />
            </div>
          </label>

          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700'>
              Nhập lại mật khẩu
            </span>

            <div className='relative'>
              <FiLock className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' />
              <input
                type='password'
                placeholder='Nhập lại mật khẩu mới'
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
            {loading ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
            {!loading && <FiCheckCircle />}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
