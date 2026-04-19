import React, { useState, useRef } from 'react';
import { addFlashcard, updateFlashcard } from '../../services/flashcardService';
import AdvancedCanvas from '../AdvancedCanvas/AdvancedCanvas';
import './EditCard.css';

export default function EditCard({ user, card, onBack, onCardSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  const canvasFrontRef = useRef(null);
  const canvasBackRef = useRef(null);

  const handleSaveCard = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const frontImage = canvasFrontRef.current?.toDataURL?.() || '';
      const backImage = canvasBackRef.current?.toDataURL?.() || '';

      if (!frontImage && !backImage) {
        throw new Error('Bạn chưa vẽ gì trên thẻ');
      }

      if (card?.id) {
        await updateFlashcard(user.uid, card.id, frontImage, backImage);
      } else {
        await addFlashcard(user.uid, frontImage, backImage);
      }

      onCardSaved?.();
      onBack?.();
    } catch (err) {
      console.error('Lỗi save card:', err);
      setError('Lỗi lưu thẻ: ' + (err.message || 'Không xác định'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-card-container">
      <div className="edit-card-header">
        <h2>{card?.id ? '✏️ Sửa Thẻ' : '✨ Thẻ Mới'}</h2>
        <button className="btn-back" onClick={onBack} disabled={loading}>
          ← Quay Lại
        </button>
      </div>

      {error && <div className="edit-card-error">{error}</div>}

      <div className="edit-card-content">
        <div className="flip-indicator">
          <span className={!isFlipped ? 'active' : ''}>📖 Mặt Trước</span>

          <button
            className="flip-toggle"
            onClick={() => setIsFlipped((prev) => !prev)}
            type="button"
          >
            {isFlipped ? '👈' : '👉'}
          </button>

          <span className={isFlipped ? 'active' : ''}>Mặt Sau 📖</span>
        </div>

        <div className="canvas-wrapper">
          <div className={`canvas-face ${!isFlipped ? 'active' : ''}`}>
            <AdvancedCanvas
              ref={canvasFrontRef}
              initialImage={card?.front || ''}
            />
          </div>

          <div className={`canvas-face ${isFlipped ? 'active' : ''}`}>
            <AdvancedCanvas
              ref={canvasBackRef}
              initialImage={card?.back || ''}
            />
          </div>
        </div>
      </div>

      <div className="edit-card-footer">
        <button className="btn-cancel" onClick={onBack} disabled={loading}>
          Hủy
        </button>
        <button className="btn-save" onClick={handleSaveCard} disabled={loading}>
          {loading ? 'Đang lưu...' : '💾 Lưu Thẻ'}
        </button>
      </div>
    </div>
  );
}