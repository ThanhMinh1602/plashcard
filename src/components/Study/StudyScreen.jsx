import React, { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiRefreshCw,
  FiRotateCw,
} from 'react-icons/fi';

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY = 650;

function StudyCardFace({ src, side }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-[30px] border shadow-[0_22px_46px_rgba(15,23,42,0.14)] backface-hidden ${
        side === 'front'
          ? 'border-sky-100 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(224,242,254,0.92))]'
          : 'border-pink-100 bg-[linear-gradient(180deg,rgba(253,242,248,0.96),rgba(252,231,243,0.92))] [transform:rotateY(180deg)]'
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={side === 'front' ? 'Mặt trước flashcard' : 'Mặt sau flashcard'}
          className="h-full w-full object-contain select-none"
          draggable={false}
        />
      ) : (
        <div className="text-sm font-bold text-slate-400">
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,168,212,0.28),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)] px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 grid gap-4 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl md:grid-cols-[auto_1fr] md:items-center">
            <button className="soft-button h-11 rounded-2xl border border-white/70 bg-white/90 px-4 text-slate-700" onClick={onBack} type="button">
              <FiArrowLeft size={18} />
              <span>Quay lại</span>
            </button>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">
                {packageItem?.name || 'Học thẻ'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Gói này chưa có thẻ nào để học.</p>
            </div>
          </div>

          <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
            <div className="soft-card w-full px-6 py-8 text-center">
              <h3 className="text-2xl font-black tracking-tight text-slate-800">
                Chưa có thẻ để học
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Hãy quay lại phần chỉnh sửa và tạo thẻ trước.
              </p>

              <div className="mt-6">
                <button className="soft-button gradient-strong h-12 w-full rounded-2xl" onClick={onBack} type="button">
                  Quay lại danh sách gói
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,168,212,0.28),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 grid gap-4 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl md:grid-cols-[auto_1fr_auto] md:items-center">
          <button className="soft-button h-11 rounded-2xl border border-white/70 bg-white/90 px-4 text-slate-700" onClick={onBack} type="button">
            <FiArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black tracking-tight text-slate-800">
              {packageItem?.name || 'Học thẻ'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chạm để lật · Kéo ngang để chuyển thẻ
            </p>
          </div>

          <div className="w-full md:w-[220px]">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <span>Tiến độ</span>
              <span>{completedCount}/{normalizedCards.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-pink-400 transition-all duration-300"
                style={{
                  width: `${(completedCount / normalizedCards.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-[calc(100vh-180px)] items-center justify-center">
          {isCompleted ? (
            <motion.div
              className="soft-card w-full max-w-md px-6 py-8 text-center"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <FiCheckCircle size={38} />
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-800">
                Hoàn thành rồi 🎉
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Bạn đã học hết toàn bộ thẻ trong gói này.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <button className="soft-button h-11 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-slate-700" onClick={onBack} type="button">
                  Quay lại danh sách
                </button>
                <button className="soft-button gradient-strong h-11 rounded-2xl px-5" onClick={handleRestart} type="button">
                  <FiRefreshCw size={16} />
                  <span>Học lại từ đầu</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="relative w-full max-w-[430px]">
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
                      className="absolute inset-0 rounded-[30px] border border-white/60 bg-white/55 shadow-[0_16px_36px_rgba(148,163,184,0.12)]"
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
                className="relative aspect-[5/7] w-full cursor-grab active:cursor-grabbing"
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={
                  flyOutDirection
                    ? {
                        x: flyOutDirection * flyOutDistance,
                        rotate: flyOutDirection * 18,
                        opacity: 0,
                      }
                    : {
                        x: 0,
                        y: 0,
                        scale: 1,
                        opacity: 1,
                      }
                }
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                style={{ x, rotate: tilt }}
                onDragEnd={handleDragEnd}
                onClick={() => setIsFlipped((prev) => !prev)}
              >
                <motion.div
                  className="relative h-full w-full [transform-style:preserve-3d]"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <StudyCardFace src={currentCard.front} side="front" />
                  <StudyCardFace src={currentCard.back} side="back" />
                </motion.div>
              </motion.div>

              <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                <FiRotateCw size={16} />
                <span>Chạm để lật thẻ · Kéo trái/phải để sang thẻ tiếp theo</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}