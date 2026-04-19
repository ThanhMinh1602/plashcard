import React, { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiRefreshCw,
  FiRotateCw,
} from 'react-icons/fi';
import './StudyScreen.css';

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY = 650;

function StudyCardFace({ src, side }) {
  return (
    <div className={`study-card-face study-card-face--${side}`}>
      {src ? (
        <img
          src={src}
          alt={side === 'front' ? 'Mặt trước flashcard' : 'Mặt sau flashcard'}
          className="study-card-image"
          draggable={false}
        />
      ) : (
        <div className="study-card-empty">
          {side === 'front' ? 'Mặt trước trống' : 'Mặt sau trống'}
        </div>
      )}
    </div>
  );
}

export default function StudyScreen({ packageItem, cards = [], onBack }) {
  const normalizedCards = useMemo(
    () =>
      (cards || []).map((card, index) => ({
        ...card,
        _studyKey: card.id || card.localId || `study-card-${index}`,
      })),
    [cards]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flyOutDirection, setFlyOutDirection] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const x = useMotionValue(0);
  const tilt = useTransform(x, [-240, 0, 240], [-12, 0, 12]);

  const currentCard = normalizedCards[currentIndex];
  const previewCards = normalizedCards.slice(currentIndex + 1, currentIndex + 3);
  const flyOutDistance =
    typeof window !== 'undefined' ? window.innerWidth * 1.15 : 1400;

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setFlyOutDirection(0);
    setIsCompleted(false);
    x.set(0);
  }, [packageItem?.id, normalizedCards.length, x]);

  useEffect(() => {
    x.set(0);
  }, [currentIndex, x]);

  useEffect(() => {
    if (!flyOutDirection) return;

    const timer = setTimeout(() => {
      const reachedEnd = currentIndex >= normalizedCards.length - 1;

      if (reachedEnd) {
        setIsCompleted(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }

      setIsFlipped(false);
      setFlyOutDirection(0);
      x.set(0);
    }, 260);

    return () => clearTimeout(timer);
  }, [flyOutDirection, currentIndex, normalizedCards.length, x]);

  const handleDragEnd = (_event, info) => {
    const passed =
      Math.abs(info.offset.x) > SWIPE_THRESHOLD ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY;

    if (!passed) return;

    const direction = info.offset.x > 0 || info.velocity.x > 0 ? 1 : -1;
    setFlyOutDirection(direction);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setFlyOutDirection(0);
    setIsCompleted(false);
    x.set(0);
  };

  const completedCount = isCompleted
    ? normalizedCards.length
    : Math.min(currentIndex + 1, normalizedCards.length);

  if (!normalizedCards.length) {
    return (
      <div className="study-screen">
        <div className="study-header">
          <button className="study-back-btn" onClick={onBack} type="button">
            <FiArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="study-header-meta">
            <h2>{packageItem?.name || 'Học thẻ'}</h2>
            <p>Gói này chưa có thẻ nào để học.</p>
          </div>
        </div>

        <div className="study-empty-wrap">
          <div className="study-complete-card">
            <h3>Chưa có thẻ để học</h3>
            <p>Hãy quay lại phần chỉnh sửa và tạo thẻ trước.</p>
            <div className="study-complete-actions">
              <button className="study-cta-btn primary" onClick={onBack} type="button">
                Quay lại danh sách gói
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="study-screen">
      <div className="study-header">
        <button className="study-back-btn" onClick={onBack} type="button">
          <FiArrowLeft size={18} />
          <span>Quay lại</span>
        </button>

        <div className="study-header-meta">
          <h2>{packageItem?.name || 'Học thẻ'}</h2>
          <p>Chạm để lật · Kéo ngang để chuyển thẻ</p>
        </div>

        <div className="study-progress-wrap">
          <span className="study-progress-text">
            {completedCount}/{normalizedCards.length}
          </span>
          <div className="study-progress-bar">
            <div
              className="study-progress-fill"
              style={{
                width: `${(completedCount / normalizedCards.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="study-stage">
        {isCompleted ? (
          <motion.div
            className="study-complete-card"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="study-complete-icon">
              <FiCheckCircle size={42} />
            </div>
            <h3>Hoàn thành rồi 🎉</h3>
            <p>Bạn đã học hết toàn bộ thẻ trong gói này.</p>

            <div className="study-complete-actions">
              <button className="study-cta-btn ghost" onClick={onBack} type="button">
                Quay lại danh sách
              </button>
              <button className="study-cta-btn primary" onClick={handleRestart} type="button">
                <FiRefreshCw size={16} />
                <span>Học lại từ đầu</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="study-card-stage">
            {[...previewCards]
              .reverse()
              .map((card, reverseIndex) => {
                const depth = previewCards.length - reverseIndex;
                const scale = 1 - depth * 0.04;
                const offsetY = depth * 14;
                const opacity = depth === 1 ? 0.2 : 0.12;

                return (
                  <motion.div
                    key={`${card._studyKey}-preview`}
                    className="study-card-preview"
                    animate={{
                      y: offsetY,
                      scale,
                      opacity,
                    }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  />
                );
              })}

            <motion.div
              key={currentCard._studyKey}
              className="study-card-motion-layer"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={
                flyOutDirection
                  ? {
                      x: flyOutDistance * flyOutDirection,
                      rotate: flyOutDirection * 18,
                      opacity: 0,
                      scale: 1,
                    }
                  : {
                      x: 0,
                      y: 0,
                      rotate: 0,
                      opacity: 1,
                      scale: 1,
                    }
              }
              transition={{
                type: 'spring',
                stiffness: flyOutDirection ? 240 : 360,
                damping: flyOutDirection ? 22 : 30,
                mass: 0.9,
              }}
            >
              <motion.div
                className="study-card-shell"
                drag="x"
                dragDirectionLock
                dragMomentum={false}
                dragSnapToOrigin
                style={{ x, rotate: tilt }}
                onDragEnd={handleDragEnd}
                onTap={() => {
                  if (!flyOutDirection) {
                    setIsFlipped((prev) => !prev);
                  }
                }}
                whileTap={{ scale: 0.995 }}
              >
                <motion.div
                  className="study-card-flip"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <StudyCardFace src={currentCard.front} side="front" />
                  <StudyCardFace src={currentCard.back} side="back" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className="study-footer-hint">
          <span>
            <FiRotateCw size={15} />
            <span>{isFlipped ? 'Đang xem mặt sau' : 'Đang xem mặt trước'}</span>
          </span>
        </div>
      )}
    </div>
  );
}