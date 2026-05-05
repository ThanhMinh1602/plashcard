import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiRefreshCw,
  FiRotateCw,
} from 'react-icons/fi';
import { Player } from '@lottiefiles/react-lottie-player';

import monkey1 from '../../assets/lottie/monkey1.json';
import monkey2 from '../../assets/lottie/monkey2.json';
import monkey3 from '../../assets/lottie/monkey3.json';

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 500;
const MONKEY_LIST = [monkey1, monkey2, monkey3];

function getCardCreatedOrder(card, fallbackIndex) {
  const value =
    card?.createdAt ||
    card?.created_at ||
    card?.createdTime ||
    card?.createdDate;

  if (value?.toMillis) {
    return value.toMillis();
  }

  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallbackIndex;
}

function StudyCardFace({ src, side, onImageLoad }) {
  const isFront = side === 'front';

  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[32px] p-[6px] backface-hidden transition-all shadow-[0_24px_60px_rgba(15,23,42,0.18)] ${
        isFront
          ? 'bg-gradient-to-br from-sky-300 via-white to-blue-400'
          : 'bg-gradient-to-br from-pink-300 via-white to-fuchsia-400 [transform:rotateY(180deg)]'
      }`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[26px] bg-white">
        {src ? (
          <img
            src={src}
            alt={isFront ? 'Mặt trước flashcard' : 'Mặt sau flashcard'}
            className="block h-full w-full select-none object-contain"
            draggable={false}
            decoding="async"
            loading="eager"
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;

              if (naturalWidth > 0 && naturalHeight > 0) {
                onImageLoad?.(src, naturalWidth / naturalHeight);
              }
            }}
            style={{
              imageRendering: 'auto',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-full bg-slate-100/50 shadow-inner" />
            <div className="text-sm font-bold text-slate-300">
              {isFront ? 'Mặt trước trống' : 'Mặt sau trống'}
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-white/70" />
      </div>
    </div>
  );
}

export default function StudyScreen({ packageItem, cards = [], onBack }) {
  const normalizedCards = useMemo(
    () =>
      (cards || [])
        .map((card, index) => ({
          ...card,
          _originalIndex: index,
          _createdOrder: getCardCreatedOrder(card, index),
          _studyKey: card.id || card.localId || `study-card-${index}`,
        }))
        .sort((a, b) => {
          if (a._createdOrder !== b._createdOrder) {
            return a._createdOrder - b._createdOrder;
          }

          return a._originalIndex - b._originalIndex;
        }),
    [cards]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flyOutDirection, setFlyOutDirection] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [imageRatios, setImageRatios] = useState({});

  const didDragRef = useRef(false);

  const x = useMotionValue(0);
  const tilt = useTransform(x, [-240, 0, 240], [-12, 0, 12]);

  const currentCard = normalizedCards[currentIndex];
  const previewCards = normalizedCards.slice(currentIndex + 1, currentIndex + 3);

  const flyOutDistance =
    typeof window !== 'undefined' ? window.innerWidth * 1.15 : 1400;

  const currentAspectRatio =
    imageRatios[currentCard?.front] ||
    imageRatios[currentCard?.back] ||
    5 / 7;

  const handleImageLoad = (src, ratio) => {
    if (!src || !Number.isFinite(ratio) || ratio <= 0) return;

    setImageRatios((prev) => {
      if (Math.abs((prev[src] || 0) - ratio) < 0.001) {
        return prev;
      }

      return {
        ...prev,
        [src]: ratio,
      };
    });
  };

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
      setCurrentIndex((prev) => {
        if (flyOutDirection < 0) {
          const nextIndex = prev + 1;

          if (nextIndex >= normalizedCards.length) {
            setIsCompleted(true);
            return prev;
          }

          return nextIndex;
        }

        return Math.max(prev - 1, 0);
      });

      setIsFlipped(false);
      setFlyOutDirection(0);
      x.set(0);
    }, 260);

    return () => clearTimeout(timer);
  }, [flyOutDirection, normalizedCards.length, x]);

  const handleDragStart = () => {
    didDragRef.current = true;
  };

  const handleDragEnd = (_event, info) => {
    const passed =
      Math.abs(info.offset.x) > SWIPE_THRESHOLD ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY;

    if (!passed) {
      x.set(0);
      return;
    }

    let direction = 0;

    if (Math.abs(info.offset.x) > 8) {
      direction = info.offset.x > 0 ? 1 : -1;
    } else {
      direction = info.velocity.x > 0 ? 1 : -1;
    }

    if (direction > 0 && currentIndex === 0) {
      x.set(0);
      return;
    }

    setFlyOutDirection(direction);
  };

  const handleCardClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    setIsFlipped((prev) => !prev);
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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, []);

  if (!normalizedCards.length) {
    return (
      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,168,212,0.28),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)] px-4 py-6 sm:px-6 md:min-h-screen">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 grid gap-4 rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl md:grid-cols-[auto_1fr] md:items-center md:rounded-[28px]">
            <button
              className="soft-button h-11 w-11 rounded-2xl border border-white/70 bg-white/90 p-0 text-slate-700"
              onClick={onBack}
              type="button"
              title="Quay lại"
              aria-label="Quay lại"
            >
              <FiArrowLeft size={18} />
            </button>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">
                {packageItem?.name || 'Học thẻ'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Gói này chưa có thẻ nào để học.
              </p>
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
                <button
                  className="soft-button gradient-strong h-12 w-full rounded-2xl"
                  onClick={onBack}
                  type="button"
                >
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
    <div
      className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,168,212,0.28),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)] px-3 py-4 sm:px-6 sm:py-6 md:h-screen"
      style={{ overscrollBehavior: 'none' }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 grid gap-4 rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl sm:mb-6 md:grid-cols-[auto_1fr_auto] md:items-center md:rounded-[28px]">
          <button
            className="soft-button h-11 w-11 rounded-2xl border border-white/70 bg-white/90 p-0 text-slate-700"
            onClick={onBack}
            type="button"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black tracking-tight text-slate-800 sm:text-2xl">
                {packageItem?.name || 'Học thẻ'}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {MONKEY_LIST.map((anim, i) => (
                <div key={i} className="h-9 w-9">
                  <Player
                    autoplay
                    loop
                    src={anim}
                    className="h-full w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-[220px]">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              <span>Tiến độ</span>
              <span>
                {completedCount}/{normalizedCards.length}
              </span>
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

        <div className="flex min-h-[calc(100dvh-170px)] items-center justify-center pb-6 sm:min-h-[calc(100dvh-180px)] md:min-h-[calc(100vh-180px)]">
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
                <button
                  className="soft-button h-11 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-slate-700"
                  onClick={onBack}
                  type="button"
                >
                  Quay lại danh sách
                </button>

                <button
                  className="soft-button gradient-strong h-11 rounded-2xl px-5"
                  onClick={handleRestart}
                  type="button"
                >
                  <FiRefreshCw size={16} />
                  <span>Học lại từ đầu</span>
                </button>
              </div>
            </motion.div>
          ) : (
          <div className="relative w-full max-w-[320px] sm:max-w-[360px] md:max-w-[400px]">
              {[...previewCards].reverse().map((card, reverseIndex) => {
                const depth = previewCards.length - reverseIndex;
                const scale = 1 - depth * 0.04;
                const offsetY = depth * 14;
                const opacity = depth === 1 ? 0.2 : 0.12;

                return (
                  <motion.div
                    key={`${card._studyKey}-preview`}
                    className="absolute inset-0 rounded-[32px] border border-white/60 bg-white/55 shadow-[0_16px_36px_rgba(148,163,184,0.12)]"
                    animate={{
                      y: offsetY,
                      scale,
                      opacity,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 28,
                    }}
                  />
                );
              })}

              <motion.div
                key={currentCard._studyKey}
                className="relative w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
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
                style={{
                  x,
                  rotate: tilt,
                  touchAction: 'none',
                  aspectRatio: currentAspectRatio,
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={handleCardClick}
              >
                <motion.div
                  className="relative h-full w-full [transform-style:preserve-3d]"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <StudyCardFace
                    src={currentCard.front}
                    side="front"
                    onImageLoad={handleImageLoad}
                  />
                  <StudyCardFace
                    src={currentCard.back}
                    side="back"
                    onImageLoad={handleImageLoad}
                  />
                </motion.div>
              </motion.div>

              <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-500 sm:text-sm">
                <FiRotateCw size={16} className="shrink-0" />
                <span>
                  Chạm để lật thẻ · Lướt trái để đi tới · Lướt phải để trở về
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}