import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiImage, FiTrash2, FiX } from "react-icons/fi";
import DrawingScreen from "../Drawing/DrawingScreen";
import { BACK_PAPER_COLOR, FRONT_PAPER_COLOR } from "./constants";
import usePenPress from "./hooks/usePenPress";
import {
  CARD_BACKGROUND_PAIRS,
  getCardBackgroundPair,
} from "../../utils/cardBackgrounds";

export default function FlashcardPairItem({
  item,
  index,
  activeCanvasKey,
  setActiveCanvasKey,
  setPairCardRef,
  setCanvasRef,
  toolbox,
  handleCanvasStatusChange,
  handleDeleteCardPair,
  onBackgroundPairChange,
  backgroundPairId,
}) {
  const bindPress = usePenPress();
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);

  const frontKey = `${item.localId}-front`;
  const backKey = `${item.localId}-back`;

  const drawingSize =
    toolbox.tool === "eraser"
      ? toolbox.eraserSize
      : toolbox.brushSizes[toolbox.brushType];
  const isEraser = toolbox.tool === "eraser";

  const drawingColor = isEraser
    ? "#ffffff"
    : toolbox.brushColors[toolbox.brushType];
  const backgroundPair = getCardBackgroundPair(
    backgroundPairId || item.backgroundPairId,
  );

  useEffect(() => {
    if (!showBackgroundModal) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowBackgroundModal(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showBackgroundModal]);

  const handleSelectBackgroundPair = (pairId) => {
    onBackgroundPairChange?.(pairId);
    setShowBackgroundModal(false);
  };

  return (
    <>
      <div ref={setPairCardRef(item.localId)} className='flashcard-pair-item relative'>
        <div className='flashcard-pair-header mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-3'>
            <div className='inline-flex h-11 min-w-[44px] items-center justify-center rounded-2xl bg-gradient-to-r from-sky-100 to-pink-100 px-3 text-sm font-black text-slate-700'>
              {index + 1}
            </div>

            <div>
              <div className='text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                Flashcard pair
              </div>

              <div className='text-sm font-semibold text-slate-600'>
                Tay: cuộn/zoom · Bút: viết
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              {...bindPress(() => setShowBackgroundModal(true))}
              data-allow-touch
              className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/85 px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white'
            >
              <FiImage size={16} />
              <span>{backgroundPair.label}</span>
              <span className='flex h-8 w-10 overflow-hidden rounded-lg bg-slate-100'>
                <img
                  src={backgroundPair.front}
                  alt=''
                  aria-hidden='true'
                  className='h-full w-1/2 object-cover'
                />
                <img
                  src={backgroundPair.back}
                  alt=''
                  aria-hidden='true'
                  className='h-full w-1/2 object-cover'
                />
              </span>
            </button>
            {/*

            Nền thẻ

          */}
            <button
              type='button'
              {...bindPress(() => handleDeleteCardPair(item.localId))}
              className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100'
            >
              <FiTrash2 size={16} />
              <span>Xóa cặp thẻ</span>
            </button>
          </div>
        </div>

        <div className='flashcard-pair-grid grid gap-4 md:grid-cols-2'>
          <div>
            <div
              onPointerDownCapture={() => setActiveCanvasKey(frontKey)}
              className='aspect-[9/16] w-full overflow-hidden rounded-[24px]'
            >
              <DrawingScreen
                ref={setCanvasRef(frontKey)}
                initialImage={item.frontBase || item.front}
                initialData={item.frontData}
                tool={toolbox.tool}
                brushType={toolbox.brushType}
                color={drawingColor}
                size={drawingSize}
                opacity={toolbox.opacity}
                backgroundColor={FRONT_PAPER_COLOR}
                backgroundImage={backgroundPair.front}
                inputMode='all'
                paperPattern='grid'
                paperGridSize={24}
                paperGridColor='rgba(14, 165, 233, 0.16)'
                paperBottomTintColor=''
                paperBottomTintRows={0}
                onStatusChange={handleCanvasStatusChange(frontKey)}
              />
            </div>
          </div>

          <div>
            <div
              onPointerDownCapture={() => setActiveCanvasKey(backKey)}
              className='aspect-[9/16] w-full overflow-hidden rounded-[24px]'
            >
              <DrawingScreen
                ref={setCanvasRef(backKey)}
                initialImage={item.backBase || item.back}
                initialData={item.backData}
                tool={toolbox.tool}
                brushType={toolbox.brushType}
                color={drawingColor}
                size={drawingSize}
                opacity={toolbox.opacity}
                backgroundColor={BACK_PAPER_COLOR}
                backgroundImage={backgroundPair.back}
                inputMode='all'
                paperPattern='grid'
                paperGridSize={24}
                paperGridColor='rgba(236, 72, 153, 0.15)'
                paperBottomTintColor='rgba(244, 114, 182, 0.18)'
                paperBottomTintRows={8}
                onStatusChange={handleCanvasStatusChange(backKey)}
              />
            </div>
          </div>
        </div>
      </div>
      {showBackgroundModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className='fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/45 px-3 py-6 backdrop-blur-sm'
            onClick={() => setShowBackgroundModal(false)}
            data-allow-touch
          >
            <div
              role='dialog'
              aria-modal='true'
              aria-labelledby={`background-modal-title-${item.localId}`}
              className='relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]'
              onClick={(e) => e.stopPropagation()}
              data-allow-touch
            >
              <div className='flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4'>
                <div>
                  <h3
                    id={`background-modal-title-${item.localId}`}
                    className='text-lg font-black text-slate-800'
                  >
                    Chọn nền cho package
                  </h3>
                  <p className='mt-1 text-sm font-medium text-slate-500'>
                    Tất cả thẻ trong package này sẽ dùng cùng một bộ nền.
                  </p>
                </div>

                <button
                  type='button'
                  className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900'
                  onClick={() => setShowBackgroundModal(false)}
                  aria-label='Đóng'
                >
                  <FiX size={18} />
                </button>
              </div>

              <div
                className='grid gap-4 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3'
                data-allow-touch
              >
                {CARD_BACKGROUND_PAIRS.map((pair) => {
                  const selected = pair.id === backgroundPair.id;

                  return (
                    <button
                      key={pair.id}
                      type='button'
                      className={`group relative rounded-2xl p-2 text-left transition ${
                        selected
                          ? "bg-sky-50 ring-2 ring-sky-400"
                          : "bg-slate-50 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
                      }`}
                      onClick={() => handleSelectBackgroundPair(pair.id)}
                    >
                      <div className='mb-2 flex items-center justify-between px-1'>
                        <span className='text-sm font-black text-slate-700'>
                          {pair.label}
                        </span>
                        {selected && (
                          <span className='inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white'>
                            <FiCheck size={15} />
                          </span>
                        )}
                      </div>

                      <div className='grid grid-cols-2 gap-2'>
                        <div className='overflow-hidden rounded-xl bg-white'>
                          <img
                            src={pair.front}
                            alt={`${pair.label} front`}
                            className='aspect-[9/16] w-full object-cover'
                          />
                        </div>
                        <div className='overflow-hidden rounded-xl bg-white'>
                          <img
                            src={pair.back}
                            alt={`${pair.label} back`}
                            className='aspect-[9/16] w-full object-cover'
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
