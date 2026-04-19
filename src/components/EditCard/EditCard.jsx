import React, { useRef, useState } from 'react';
import { addFlashcard, updateFlashcard } from '../../services/flashcardService';
import AdvancedCanvas from '../AdvancedCanvas/AdvancedCanvas';
import './EditCard.css';

export default function EditCard({ user, card, onBack, onCardSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  const frontRef = useRef(null);
  const backRef = useRef(null);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const front = frontRef.current?.toDataURL?.() || '';
      const back = backRef.current?.toDataURL?.() || '';

      if (card?.id) {
        await updateFlashcard(user.uid, card.id, front, back);
      } else {
        await addFlashcard(user.uid, front, back);
      }

      onCardSaved?.();
      onBack?.();
    } catch (err) {
      console.error(err);
      setError(`Lỗi lưu thẻ: ${err.message || 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-card-page">
      <div className="edit-card-top">
        <div className="edit-card-top-left">
          <button className="edit-page-btn" onClick={onBack} disabled={loading}>
            ← Quay lại
          </button>
          <h2>{card?.id ? 'Sửa Flashcard' : 'Tạo Flashcard'}</h2>
        </div>

        <div className="edit-card-top-right">
          <button
            className={`face-btn ${!isFlipped ? 'active' : ''}`}
            onClick={() => setIsFlipped(false)}
            type="button"
          >
            Mặt trước
          </button>
          <button
            className={`face-btn ${isFlipped ? 'active' : ''}`}
            onClick={() => setIsFlipped(true)}
            type="button"
          >
            Mặt sau
          </button>
          <button className="edit-page-btn primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Đang lưu...' : '💾 Lưu thẻ'}
          </button>
        </div>
      </div>

      {error && <div className="edit-card-error">{error}</div>}

      <div className="edit-card-editor-area">
        <div className={`editor-face ${!isFlipped ? 'active' : ''}`}>
          <AdvancedCanvas ref={frontRef} initialImage={card?.front || ''} />
        </div>

        <div className={`editor-face ${isFlipped ? 'active' : ''}`}>
          <AdvancedCanvas ref={backRef} initialImage={card?.back || ''} />
        </div>
      </div>
    </div>
  );
}