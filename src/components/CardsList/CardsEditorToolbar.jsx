import React from 'react';
import {
  FiUpload,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiPlus,
} from 'react-icons/fi';
import { Player } from '@lottiefiles/react-lottie-player';
import { BRUSH_TYPES, TOOL_LIST, cn } from './constants';
import usePenPress from './hooks/usePenPress';

import monkey1 from '../../assets/lottie/monkey1.json';
import monkey2 from '../../assets/lottie/monkey2.json';
import monkey3 from '../../assets/lottie/monkey3.json';

const MONKEY_LIST = [monkey1, monkey2, monkey3];

export default function CardsEditorToolbar({
  activeCanvasRef,
  activeStatus,
  toolbox,
  setToolbox,
  handleImportClick,
  handleAddCardPair,
  canAddCard,
}) {
  const bindPress = usePenPress();

  const isEraser = toolbox.tool === 'eraser';
  const currentSize = isEraser ? toolbox.eraserSize || 20 : toolbox.size;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/50 px-3 py-1.5 shadow-sm">
      <div className="flex w-full flex-col gap-2 overflow-x-auto pb-0.5">
        <div className="flex min-w-max items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
            <button
              type="button"
              title="Undo"
              {...bindPress(
                () => activeCanvasRef?.undo?.(),
                !activeCanvasRef || !activeStatus.canUndo
              )}
              disabled={!activeCanvasRef || !activeStatus.canUndo}
              className={cn(
                'inline-flex h-7 w-8 items-center justify-center rounded-lg transition touch-none',
                !activeCanvasRef || !activeStatus.canUndo
                  ? 'cursor-not-allowed text-slate-300'
                  : 'bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100'
              )}
            >
              <FiCornerUpLeft size={16} />
            </button>

            <button
              type="button"
              title="Redo"
              {...bindPress(
                () => activeCanvasRef?.redo?.(),
                !activeCanvasRef || !activeStatus.canRedo
              )}
              disabled={!activeCanvasRef || !activeStatus.canRedo}
              className={cn(
                'inline-flex h-7 w-8 items-center justify-center rounded-lg transition touch-none',
                !activeCanvasRef || !activeStatus.canRedo
                  ? 'cursor-not-allowed text-slate-300'
                  : 'bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100'
              )}
            >
              <FiCornerUpRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-sky-100 bg-sky-50/50 p-1">
            {BRUSH_TYPES.map((item) => {
              const Icon = item.icon;
              const active =
                toolbox.brushType === item.id && toolbox.tool !== 'eraser';

              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  {...bindPress(() =>
                    setToolbox((prev) => ({
                      ...prev,
                      brushType: item.id,
                      tool: 'brush',
                    }))
                  )}
                  className={cn(
                    'inline-flex min-h-[32px] min-w-[56px] flex-col items-center justify-center rounded-lg px-1.5 py-0.5 text-[9px] font-bold transition touch-none',
                    active
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:-translate-y-0.5 hover:bg-slate-50'
                  )}
                >
                  <Icon size={12} className="mb-0.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="mx-1 h-5 w-px bg-sky-200/60" />

            {TOOL_LIST.filter(
              (item) => item.id !== 'brush' && item.id !== 'draw'
            ).map((item) => {
              const Icon = item.icon;
              const active = toolbox.tool === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  {...bindPress(() =>
                    setToolbox((prev) => ({
                      ...prev,
                      tool: item.id,
                    }))
                  )}
                  className={cn(
                    'inline-flex min-h-[32px] min-w-[56px] flex-col items-center justify-center rounded-lg px-1.5 py-0.5 text-[9px] font-bold transition touch-none',
                    active
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:-translate-y-0.5 hover:bg-slate-50'
                  )}
                >
                  <Icon size={12} className="mb-0.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 👇 3 con khỉ chạy liên tục cùng lúc */}
          <div className="flex items-center gap-1 shrink-0">
            {MONKEY_LIST.map((anim, i) => (
              <div
                key={i}
                className="h-9 w-9 transition-all duration-300"
              >
                <Player
                  autoplay
                  loop
                  src={anim}
                  className="h-full w-full"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            {...bindPress(handleImportClick)}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 touch-none"
          >
            <FiUpload size={13} />
            <span>Import</span>
          </button>

          <button
            type="button"
            disabled={!canAddCard}
            {...bindPress(handleAddCardPair, !canAddCard)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition touch-none',
              canAddCard
                ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
            )}
          >
            <FiPlus size={16} />
            <span>Thêm thẻ</span>
          </button>
        </div>

        <div className="flex w-full min-w-max items-center gap-2">
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Color
            </label>

            <input
              type="color"
              value={toolbox.color}
              onChange={(e) =>
                setToolbox((prev) => ({
                  ...prev,
                  color: e.target.value,
                }))
              }
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === 'pen') {
                  e.currentTarget.click();
                }
              }}
              disabled={isEraser}
              className={cn(
                'color-picker-soft h-5 w-5 rounded bg-transparent touch-none',
                isEraser ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
              )}
            />
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Size
            </label>

            <input
              type="range"
              min="1"
              max="100"
              value={currentSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setToolbox((prev) =>
                  isEraser
                    ? { ...prev, eraserSize: val }
                    : { ...prev, size: val }
                );
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === 'pen') {
                  e.currentTarget.setPointerCapture(e.pointerId);
                }
              }}
              onPointerMove={(e) => {
                if (e.pointerType === 'pen' && e.buttons > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = Math.max(
                    0,
                    Math.min(1, (e.clientX - rect.left) / rect.width)
                  );
                  const val = Math.round(1 + percent * 99);
                  setToolbox((prev) =>
                    isEraser
                      ? { ...prev, eraserSize: val }
                      : { ...prev, size: val }
                  );
                }
              }}
              className="range-soft w-full min-w-[80px] touch-none"
            />

            <span className="w-[24px] text-right text-[11px] font-bold text-slate-600">
              {currentSize}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Opacity
            </label>

            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={toolbox.opacity}
              onChange={(e) =>
                setToolbox((prev) => ({
                  ...prev,
                  opacity: Number(e.target.value),
                }))
              }
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === 'pen') {
                  e.currentTarget.setPointerCapture(e.pointerId);
                }
              }}
              onPointerMove={(e) => {
                if (e.pointerType === 'pen' && e.buttons > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = Math.max(
                    0,
                    Math.min(1, (e.clientX - rect.left) / rect.width)
                  );
                  const val = 0.1 + percent * 0.9;
                  const rounded = Math.round(val * 20) / 20;
                  setToolbox((prev) => ({
                    ...prev,
                    opacity: rounded,
                  }));
                }
              }}
              disabled={isEraser}
              className={cn(
                'range-soft w-24 touch-none',
                isEraser && 'cursor-not-allowed opacity-30'
              )}
            />
            <span className="w-[32px] text-right text-[11px] font-bold text-slate-600">
              {Math.round(toolbox.opacity * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}