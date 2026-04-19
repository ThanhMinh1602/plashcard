import React, { useEffect, useRef, useState } from 'react';
import {
  getFlashcards,
  deleteFlashcard,
  updatePackage,
} from '../../services/flashcardService';
import './CardsList.css';

export default function CardsList({
  user,
  packageItem,
  onBack,
  onAddCard,
  onEditCard,
  onPackageUpdated,
}) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [packageName, setPackageName] = useState(packageItem?.name || '');
  const [packageDescription, setPackageDescription] = useState(
    packageItem?.description || ''
  );

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [packageTouched, setPackageTouched] = useState(false);
  const [nameError, setNameError] = useState('');

  const initialSyncDoneRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const nameInputRef = useRef(null);

  const canAddCard = packageName.trim().length > 0;

  useEffect(() => {
    setPackageName(packageItem?.name || '');
    setPackageDescription(packageItem?.description || '');
    setNameError('');
    setPackageTouched(false);
    initialSyncDoneRef.current = false;

    const raf = requestAnimationFrame(() => {
      initialSyncDoneRef.current = true;
    });

    return () => cancelAnimationFrame(raf);
  }, [packageItem?.id]);

  useEffect(() => {
    loadCards();
  }, [user, packageItem?.id]);

  useEffect(() => {
    if (!user || !packageItem?.id) return;
    if (!initialSyncDoneRef.current) return;
    if (!packageTouched) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setIsAutoSaving(true);

        await updatePackage(
          user.uid,
          packageItem.id,
          packageName,
          packageDescription
        );

        onPackageUpdated?.({
          ...packageItem,
          name: packageName,
          description: packageDescription,
        });

        if (packageName.trim()) {
          setNameError('');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi tự động lưu thông tin gói');
      } finally {
        setIsAutoSaving(false);
      }
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    packageName,
    packageDescription,
    packageTouched,
    user,
    packageItem,
    onPackageUpdated,
  ]);

  const loadCards = async () => {
    if (!user || !packageItem?.id) return;

    try {
      setLoading(true);
      setError('');
      const userCards = await getFlashcards(user.uid, packageItem.id);
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
      await deleteFlashcard(user.uid, packageItem.id, cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err) {
      console.error('Lỗi xóa card:', err);
      alert('Lỗi xóa card');
    }
  };

  const handleAddCardClick = () => {
    if (!canAddCard) {
      setNameError('Bạn phải nhập tên gói trước khi tạo card');
      nameInputRef.current?.focus();
      return;
    }

    onAddCard?.();
  };

  const handleNameChange = (e) => {
    setPackageName(e.target.value);
    setPackageTouched(true);

    if (e.target.value.trim()) {
      setNameError('');
    }
  };

  const handleDescriptionChange = (e) => {
    setPackageDescription(e.target.value);
    setPackageTouched(true);
  };

  return (
    <div className="cards-list-container">
      <div className="cards-package-panel">
        <div className="cards-package-top">
          <button className="edit-page-btn" onClick={onBack}>
            ← Quay lại gói
          </button>

          <div className="cards-package-status">
            {isAutoSaving ? (
              <span className="autosave-badge saving">Đang lưu...</span>
            ) : (
              <span className="autosave-badge saved">Đã lưu tự động</span>
            )}
          </div>

          <div className="cards-package-actions">
            <button
              className="btn-add-card"
              onClick={handleAddCardClick}
              disabled={!canAddCard}
              title={
                canAddCard
                  ? 'Tạo flashcard mới'
                  : 'Nhập tên gói trước khi tạo flashcard'
              }
            >
              ➕ Thêm thẻ mới
            </button>
          </div>
        </div>

        <div className="cards-package-form">
          <div className="cards-package-field">
            <label>
              Tên gói <span className="required-mark">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={packageName}
              onChange={handleNameChange}
              placeholder="Ví dụ: Từ vựng IELTS, Sinh học 12..."
            />
            {nameError && <div className="field-error">{nameError}</div>}
          </div>

          <div className="cards-package-field">
            <label>Mô tả</label>
            <textarea
              rows={3}
              value={packageDescription}
              onChange={handleDescriptionChange}
              placeholder="Nhập mô tả cho gói"
            />
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : cards.length === 0 ? (
        <div className="empty-state">
          <p>📭 Gói này chưa có thẻ nào</p>
          <p>
            {canAddCard
              ? 'Nhấn "Thêm thẻ mới" để bắt đầu'
              : 'Hãy nhập tên gói trước khi tạo thẻ'}
          </p>
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