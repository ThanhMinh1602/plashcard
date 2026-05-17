import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiRefreshCw,
  FiRotateCw,
} from 'react-icons/fi';

import { getCardBackgroundPair } from '../../utils/cardBackgrounds';
import { useLanguage } from '../../i18n/LanguageContext';

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 500;
const CARD_ASPECT_RATIO = 9 / 16;

function shuffleCards(cards) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function getCardCreatedOrder(card, fallbackIndex) {
  const value = card?.updatedAt || card?.createdAt || card?.created_at;

  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;

  return fallbackIndex;
}

function StudyCardFace({ src, side, backgroundPairId }) {
  const { t } = useLanguage();
  const isFront = side === 'front';
  const backgroundPair = getCardBackgroundPair(backgroundPairId);
  const backgroundSrc = isFront ? backgroundPair.front : backgroundPair.back;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px]">
      <div className="relative h-full w-full overflow-hidden">
        <img
          src={backgroundSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full select-none object-fill"
          draggable={false}
        />

        {src && (
          <img
            src={src}
            alt={isFront ? t('study.front') : t('study.back')}
            className="relative z-10 block h-full w-full select-none object-fill"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}

const faceVariants = {
  initial: (direction) => ({
    opacity: 0,
    scaleX: 0.18,
    scale: 0.96,
    rotate: direction === 'back' ? 1.5 : -1.5,
    filter: 'blur(8px)',
  }),
  animate: {
    opacity: 1,
    scaleX: 1,
    scale: 1,
    rotate: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 32,
      mass: 0.85,
    },
  },
  exit: (direction) => ({
    opacity: 0,
    scaleX: 0.18,
    scale: 0.96,
    rotate: direction === 'back' ? -1.5 : 1.5,
    filter: 'blur(8px)',
    transition: {
      duration: 0.16,
      ease: 'easeInOut',
    },
  }),
};

export default function StudyScreen({ packageItem, cards = [], onBack }) {
  const { t } = useLanguage();
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const normalizedCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];

    const pairsMap = {};

    cards.forEach((doc) => {
      const pId = doc.pairId || doc.id;

      if (!pairsMap[pId]) {
        pairsMap[pId] = {
          id: pId,
          localId: pId,
          updatedAt: doc.updatedAt,
          createdAt: doc.createdAt,
          created_at: doc.created_at,
        };
      }

      if (doc.side === 'front') {
        pairsMap[pId].front = doc.content;
      } else if (doc.side === 'back') {
        pairsMap[pId].back = doc.content;
      }

      if (doc.backgroundPairId) {
        pairsMap[pId].backgroundPairId = doc.backgroundPairId;
      }

      if (doc.updatedAt) pairsMap[pId].updatedAt = doc.updatedAt;
      if (doc.createdAt) pairsMap[pId].createdAt = doc.createdAt;
      if (doc.created_at) pairsMap[pId].created_at = doc.created_at;
    });

    const sortedCards = Object.values(pairsMap)
      .map((card, index) => ({
        ...card,
        _originalIndex: index,
        _createdOrder: getCardCreatedOrder(card, index),
        _studyKey: card.id,
      }))
      .sort((a, b) => a._createdOrder - b._createdOrder);

    return shuffleCards(sortedCards);
  }, [cards, shuffleSeed]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flyOutDirection, setFlyOutDirection] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const didDragRef = useRef(false);
  const isChangingCardRef = useRef(false);

  const x = useMotionValue(0);
  const tilt = useTransform(x, [-240, 0, 240], [-13, 0, 13]);

  const currentCard = normalizedCards[currentIndex];

  const flyOutDistance =
    typeof window !== 'undefined' ? window.innerWidth * 1.15 : 1400;

  const currentSide = isFlipped ? 'back' : 'front';
  const currentSrc = isFlipped ? currentCard?.back : currentCard?.front;

  const resetStudyState = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setFlyOutDirection(0);
    setIsCompleted(false);
    didDragRef.current = false;
    isChangingCardRef.current = false;
    x.set(0);
  };

  useEffect(() => {
    resetStudyState();
  }, [packageItem?.id, normalizedCards.length]);

  useEffect(() => {
    if (!flyOutDirection) return undefined;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => {
        if (flyOutDirection < 0) {
          if (prev + 1 >= normalizedCards.length) {
            setIsCompleted(true);
            return prev;
          }

          return prev + 1;
        }

        return Math.max(prev - 1, 0);
      });

      setIsFlipped(false);
      setFlyOutDirection(0);
      didDragRef.current = false;
      isChangingCardRef.current = false;
      x.set(0);
    }, 260);

    return () => clearTimeout(timer);
  }, [flyOutDirection, normalizedCards.length, x]);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = oldOverflow || 'auto';
    };
  }, []);

  const handleDragStart = () => {
    didDragRef.current = true;
  };

  const handleDragEnd = (_event, info) => {
    if (isChangingCardRef.current || isCompleted) {
      didDragRef.current = false;
      x.set(0);
      return;
    }

    const passed =
      Math.abs(info.offset.x) > SWIPE_THRESHOLD ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY;

    if (!passed) {
      didDragRef.current = false;
      x.set(0);
      return;
    }

    const direction = info.offset.x > 0 ? 1 : -1;

    if (direction > 0 && currentIndex === 0) {
      didDragRef.current = false;
      x.set(0);
      return;
    }

    isChangingCardRef.current = true;
    setFlyOutDirection(direction);
  };

  const handleCardClick = () => {
    if (isChangingCardRef.current || flyOutDirection || isCompleted) return;

    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    x.set(0);
    setIsFlipped((prev) => !prev);
  };

  const handleRestart = () => {
    setShuffleSeed((prev) => prev + 1);
    resetStudyState();
  };

  const completedCount = isCompleted
    ? normalizedCards.length
    : Math.min(currentIndex + 1, normalizedCards.length);

  if (!normalizedCards.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">
            {t('study.noCards')}
          </h2>

          <button
            onClick={onBack}
            className="mt-4 rounded-xl bg-sky-500 px-6 py-2 text-white"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard && !isCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">
            {t('study.currentMissing')}
          </h2>

          <button
            onClick={handleRestart}
            className="mt-4 rounded-xl bg-sky-500 px-6 py-2 text-white"
          >
            {t('study.restart')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-gradient-to-b from-[#f8fbff] via-[#fdf7ff] to-[#fff5fb] px-3 py-4 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-pink-200/50 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-4 flex items-center justify-between rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition hover:scale-105 active:scale-95"
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="flex-1 px-4">
            <h2 className="truncate text-lg font-black text-slate-800">
              {packageItem?.name}
            </h2>

            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-pink-400"
                initial={false}
                animate={{
                  width: `${(completedCount / normalizedCards.length) * 100}%`,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 28,
                }}
              />
            </div>
          </div>

          <span className="text-xs font-bold text-slate-500">
            {completedCount}/{normalizedCards.length}
          </span>
        </div>

        <div className="flex min-h-[60vh] items-center justify-center">
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                className="text-center"
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 28,
                }}
              >
                <FiCheckCircle size={48} className="mx-auto text-emerald-500" />

                <h3 className="mt-4 text-2xl font-black text-slate-800">
                  {t('study.completed')}
                </h3>

                <button
                  onClick={handleRestart}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-8 py-3 font-bold text-white shadow-lg shadow-sky-200 transition hover:scale-105 active:scale-95"
                >
                  <FiRefreshCw size={18} />
                  {t('study.restart')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="study-area"
                className="relative w-full max-w-[360px]"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.22 }}
              >
                <motion.div
                  key={currentCard._studyKey}
                  className="relative w-full cursor-grab active:cursor-grabbing"
                  animate={
                    flyOutDirection
                      ? {
                          x: flyOutDirection * flyOutDistance,
                          opacity: 0,
                          scale: 0.94,
                          rotate: flyOutDirection * 16,
                        }
                      : {
                          x: 0,
                          opacity: 1,
                          scale: 1,
                          rotate: 0,
                        }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 26,
                  }}
                  drag="x"
                  dragElastic={0.18}
                  dragConstraints={{ left: 0, right: 0 }}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    x,
                    rotate: tilt,
                    aspectRatio: CARD_ASPECT_RATIO,
                  }}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={handleCardClick}
                >
                  <AnimatePresence mode="wait" custom={currentSide}>
                    <motion.div
                      key={`${currentCard._studyKey}-${currentSide}`}
                      custom={currentSide}
                      variants={faceVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="relative h-full w-full origin-center"
                    >
                      <StudyCardFace
                        src={currentSrc}
                        side={currentSide}
                        backgroundPairId={
                          packageItem?.backgroundPairId ||
                          currentCard.backgroundPairId
                        }
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-400"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <FiRotateCw size={14} />
                  <span>{t('study.hint')}</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
