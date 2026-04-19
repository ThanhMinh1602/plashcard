import React, { useState, useEffect } from 'react';
import { getFlashcards, deleteFlashcard } from '../../services/flashcardService';
import './CardsList.css';

export default function CardsList({ user, onAddCard, onEditCard }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCards();
  }, [user]);

  const loadCards = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError('');
      const userCards = await getFlashcards(user.uid);
      setCards(userCards);
    } catch (err) {
      console.error('Lỗi load cards:', err);
      setError('Lỗi tải cards');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa card này?')) return;

    try {
      await deleteFlashcard(user.uid, cardId);
      setCards(cards.filter((c) => c.id !== cardId));
    } catch (err) {
      console.error('Lỗi xóa card:', err);
      alert('Lỗi xóa card');
    }
  };

  return (
    <div className="cards-list-container">
      <div className="cards-list-header">
        <h2>Thẻ ghi chú của bạn</h2>
        <button className="btn-add-card" onClick={onAddCard}>
          ➕ Thêm Thẻ Mới
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : cards.length === 0 ? (
        <div className="empty-state">
          <p>📭 Bạn chưa có thẻ nào</p>
          <p>Nhấn "Thêm Thẻ Mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="cards-grid">
          {cards.map((card) => (
            <div key={card.id} className="card-item">
              <div className="card-preview" onClick={() => onEditCard(card)}>
                <div className="card-front">
                  {card.front ? (
                    <img
                      src={card.front}
                      alt="Flashcard preview"
                      className="card-thumbnail"
                    />
                  ) : (
                    <p className="card-content">Mặt trước trống</p>
                  )}
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-edit"
                  onClick={() => onEditCard(card)}
                  title="Edit"
                >
                  ✏️ Sửa
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteCard(card.id)}
                  title="Delete"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}