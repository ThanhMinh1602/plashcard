import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiLogOut, FiTrash2, FiX } from 'react-icons/fi';

const ICON_MAP = {
  danger: FiTrash2,
  warning: FiAlertTriangle,
  logout: FiLogOut,
};

const TONE_MAP = {
  danger: {
    iconWrap: 'bg-rose-50 text-rose-600',
    confirmBtn: 'bg-rose-500 text-white hover:bg-rose-600',
  },
  warning: {
    iconWrap: 'bg-amber-50 text-amber-600',
    confirmBtn: 'bg-amber-500 text-white hover:bg-amber-600',
  },
  logout: {
    iconWrap: 'bg-sky-50 text-sky-600',
    confirmBtn: 'bg-sky-500 text-white hover:bg-sky-600',
  },
};

export default function ConfirmModal({
  open,
  title = 'Xác nhận',
  message = 'Bạn có chắc không?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}) {
  const Icon = ICON_MAP[variant] || FiAlertTriangle;
  const tone = TONE_MAP[variant] || TONE_MAP.warning;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, loading, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-open="true"
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onClose}
          disabled={loading}
          aria-label="Đóng"
        >
          <FiX size={18} />
        </button>

        <div className="mb-4 flex justify-center">
          <div className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${tone.iconWrap}`}>
            <Icon size={24} />
          </div>
        </div>

        <div className="text-center">
          <h3 id="confirm-modal-title" className="text-xl font-black tracking-tight text-slate-800">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.confirmBtn}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}