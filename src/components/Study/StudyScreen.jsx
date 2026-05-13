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

// Cấu hình hằng số cho nền giấy (Khớp với bên Editor)
const FRONT_PAPER_COLOR = '#f0f9ff';
const BACK_PAPER_COLOR = '#fdf2f8';
const GRID_SIZE = 24;

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 500;
const MONKEY_LIST = [monkey1, monkey2, monkey3];

// Helper lấy thứ tự sắp xếp
function getCardCreatedOrder(card, fallbackIndex) {
  const value = card?.updatedAt || card?.createdAt || card?.created_at;

  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  
  return fallbackIndex;
}

// Component hiển thị mặt thẻ - Tự render nền lưới
function StudyCardFace({ src, side, onImageLoad }) {
  const isFront = side === 'front';
  const canvasRef = useRef(null);

  // Vẽ nền lưới trực tiếp tại máy, không tải từ Cloud
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Scale canvas theo kích thước hiển thị
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    // 1. Vẽ màu nền
    ctx.fillStyle = isFront ? FRONT_PAPER_COLOR : BACK_PAPER_COLOR;
    ctx.fillRect(0, 0, width, height);

    // 2. Vẽ lưới (Grid)
    ctx.beginPath();
    ctx.strokeStyle = isFront ? 'rgba(14, 165, 233, 0.16)' : 'rgba(236, 72, 153, 0.15)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += GRID_SIZE) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += GRID_SIZE) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();
  }, [isFront]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[32px] p-[6px] backface-hidden transition-all shadow-[0_24px_60px_rgba(15,23,42,0.18)] ${
        isFront
          ? 'bg-gradient-to-br from-sky-300 via-white to-blue-400'
          : 'bg-gradient-to-br from-pink-300 via-white to-fuchsia-400 [transform:rotateY(180deg)]'
      }`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[26px] bg-white">
        {/* Lớp nền render local */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        
        {/* Lớp ảnh nét vẽ trong suốt từ Firestore */}
        {src ? (
          <img
            src={src}
            alt={isFront ? 'Mặt trước' : 'Mặt sau'}
            className="relative z-10 block h-full w-full select-none object-contain"
            draggable={false}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (naturalWidth > 0) onImageLoad?.(src, naturalWidth / naturalHeight);
            }}
          />
        ) : (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-3">
            <div className="text-sm font-bold text-slate-300">Trống</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudyScreen({ packageItem, cards = [], onBack }) {
  // Logic gộp các Document đơn lẻ về lại thành Cặp (Pair) dựa trên pairId
  const normalizedCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];

    const pairsMap = {};
    cards.forEach((doc) => {
      const pId = doc.pairId || doc.id;
      if (!pairsMap[pId]) {
        pairsMap[pId] = { 
          id: pId, 
          localId: pId, 
          updatedAt: doc.updatedAt 
        };
      }

      // Gán nội dung vào đúng mặt của cặp
      if (doc.side === 'front') {
        pairsMap[pId].front = doc.content;
      } else if (doc.side === 'back') {
        pairsMap[pId].back = doc.content;
      }
    });

    return Object.values(pairsMap)
      .map((card, index) => ({
        ...card,
        _originalIndex: index,
        _createdOrder: getCardCreatedOrder(card, index),
        _studyKey: card.id,
      }))
      .sort((a, b) => a._createdOrder - b._createdOrder);
  }, [cards]);

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

  const flyOutDistance = typeof window !== 'undefined' ? window.innerWidth * 1.15 : 1400;
  const currentAspectRatio = imageRatios[currentCard?.front] || imageRatios[currentCard?.back] || 5 / 7;

  const handleImageLoad = (src, ratio) => {
    if (!src || !ratio) return;
    setImageRatios(prev => ({ ...prev, [src]: ratio }));
  };

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setFlyOutDirection(0);
    setIsCompleted(false);
    x.set(0);
  }, [packageItem?.id, normalizedCards.length, x]);

  useEffect(() => {
    if (!flyOutDirection) return;
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
      x.set(0);
    }, 260);
    return () => clearTimeout(timer);
  }, [flyOutDirection, normalizedCards.length, x]);

  const handleDragStart = () => { didDragRef.current = true; };

  const handleDragEnd = (_event, info) => {
    const passed = Math.abs(info.offset.x) > SWIPE_THRESHOLD || Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    if (!passed) { x.set(0); return; }
    const direction = info.offset.x > 0 ? 1 : -1;
    if (direction > 0 && currentIndex === 0) { x.set(0); return; }
    setFlyOutDirection(direction);
  };

  const handleCardClick = () => {
    if (didDragRef.current) { didDragRef.current = false; return; }
    setIsFlipped((prev) => !prev);
  };

  const completedCount = isCompleted ? normalizedCards.length : Math.min(currentIndex + 1, normalizedCards.length);

  // Khóa scroll trình duyệt khi đang học
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  if (!normalizedCards.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">Chưa có thẻ để học</h2>
          <button onClick={onBack} className="mt-4 rounded-xl bg-sky-500 px-6 py-2 text-white">Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-[#f8fbff] to-[#fff5fb] px-3 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header & Progress */}
        <div className="mb-4 flex items-center justify-between rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white">
            <FiArrowLeft size={18} />
          </button>
          <div className="flex-1 px-4">
            <h2 className="truncate text-lg font-black text-slate-800">{packageItem?.name}</h2>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
              <div 
                className="h-full rounded-full bg-sky-500 transition-all" 
                style={{ width: `${(completedCount / normalizedCards.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">{completedCount}/{normalizedCards.length}</span>
        </div>

        {/* Card Area */}
        <div className="flex min-h-[60vh] items-center justify-center">
          {isCompleted ? (
            <div className="text-center">
               <FiCheckCircle size={48} className="mx-auto text-emerald-500" />
               <h3 className="mt-4 text-2xl font-black">Hoàn thành rồi! 🎉</h3>
               <button onClick={() => setIsCompleted(false) || setCurrentIndex(0)} className="mt-6 rounded-xl bg-sky-500 px-8 py-3 text-white font-bold">Học lại</button>
            </div>
          ) : (
            <div className="relative w-full max-w-[360px]">
              {/* Preview stacks */}
              {previewCards.reverse().map((card, i) => (
                <div key={i} className="absolute inset-0 scale-95 translate-y-4 rounded-[32px] bg-white/40 border border-white/60 opacity-20" />
              ))}

              {/* Main Card */}
              <motion.div
                key={currentCard._studyKey}
                className="relative w-full cursor-grab active:cursor-grabbing"
                animate={flyOutDirection ? { x: flyOutDirection * flyOutDistance, opacity: 0 } : { x: 0, opacity: 1 }}
                drag="x"
                style={{ x, rotate: tilt, aspectRatio: currentAspectRatio }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={handleCardClick}
              >
                <motion.div
                  className="h-full w-full [transform-style:preserve-3d]"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <StudyCardFace src={currentCard.front} side="front" onImageLoad={handleImageLoad} />
                  <StudyCardFace src={currentCard.back} side="back" onImageLoad={handleImageLoad} />
                </motion.div>
              </motion.div>

              <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                <FiRotateCw size={14} />
                <span>Chạm để lật · Lướt để chuyển thẻ</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}