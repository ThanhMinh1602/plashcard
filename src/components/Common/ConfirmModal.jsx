import React, { useEffect } from 'react';
import { FiAlertTriangle, FiLogOut, FiTrash2, FiX } from 'react-icons/fi';
import './ConfirmModal.css';

const ICON_MAP = {
  danger: FiTrash2,
  warning: FiAlertTriangle,
  logout: FiLogOut,
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

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose?.();
    }
  };

  return (
    <div className="confirm-modal-backdrop" onMouseDown={handleBackdropClick}>
      <div
        className={`confirm-modal confirm-modal--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <button
          type="button"
          className="confirm-modal-close"
          onClick={onClose}
          disabled={loading}
          aria-label="Đóng"
        >
          <FiX size={18} />
        </button>

        <div className="confirm-modal-icon-wrap">
          <div className="confirm-modal-icon">
            <Icon size={22} />
          </div>
        </div>

        <div className="confirm-modal-content">
          <h3 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h3>
          <p className="confirm-modal-message">{message}</p>
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-btn confirm-modal-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`confirm-modal-btn confirm-modal-btn--${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}