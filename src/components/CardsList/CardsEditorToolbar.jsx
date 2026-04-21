import React from 'react';
import { FiDownload, FiUpload, FiCornerUpLeft, FiCornerUpRight, FiPlus } from 'react-icons/fi';
import { BRUSH_TYPES, TOOL_LIST, cn } from './constants';

export default function CardsEditorToolbar({
  activeCanvasRef,
  activeStatus,
  toolbox,
  setToolbox,
  handleImportClick,
  handleAddCardPair,
  canAddCard,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/50 px-3 py-2.5 shadow-sm">
      <div className="flex w-full flex-col gap-3 overflow-x-auto pb-1">

        {/* HÀNG 1: Thêm thẻ + Undo/Redo + Bút + Import/Export */}
        <div className="flex min-w-max items-center gap-3">

          {/* 1. Undo / Redo */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-1.5">
            <button
              type="button"
              title="Undo"
              className={cn(
                'inline-flex h-9 w-10 items-center justify-center rounded-lg transition',
                !activeCanvasRef || !activeStatus.canUndo
                  ? 'cursor-not-allowed text-slate-300'
                  : 'bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100'
              )}
              onClick={() => activeCanvasRef?.undo?.()}
              disabled={!activeCanvasRef || !activeStatus.canUndo}
            >
              <FiCornerUpLeft size={18} />
            </button>

            <button
              type="button"
              title="Redo"
              className={cn(
                'inline-flex h-9 w-10 items-center justify-center rounded-lg transition',
                !activeCanvasRef || !activeStatus.canRedo
                  ? 'cursor-not-allowed text-slate-300'
                  : 'bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100'
              )}
              onClick={() => activeCanvasRef?.redo?.()}
              disabled={!activeCanvasRef || !activeStatus.canRedo}
            >
              <FiCornerUpRight size={18} />
            </button>
          </div>

          {/* 2. Các loại Bút & Tẩy */}
          <div className="flex items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50/50 p-1.5">
            {BRUSH_TYPES.map((item) => {
              const Icon = item.icon;
              const active = toolbox.brushType === item.id && toolbox.tool !== 'eraser';

              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  className={cn(
                    'inline-flex min-h-[40px] min-w-[64px] flex-col items-center justify-center rounded-lg px-2 py-1 text-[10px] font-bold transition',
                    active
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:-translate-y-0.5 hover:bg-slate-50'
                  )}
                  onClick={() =>
                    setToolbox((prev) => ({
                      ...prev,
                      brushType: item.id,
                      tool: 'brush'
                    }))
                  }
                >
                  <Icon size={14} className="mb-0.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="mx-1 h-6 w-px bg-sky-200/60" />

            {TOOL_LIST.filter(item => item.id !== 'brush' && item.id !== 'draw').map((item) => {
              const Icon = item.icon;
              const active = toolbox.tool === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  className={cn(
                    'inline-flex min-h-[40px] min-w-[64px] flex-col items-center justify-center rounded-lg px-2 py-1 text-[10px] font-bold transition',
                    active
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:-translate-y-0.5 hover:bg-slate-50'
                  )}
                  onClick={() => setToolbox((prev) => ({ ...prev, tool: item.id }))}
                >
                  <Icon size={14} className="mb-0.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Import / Export */}
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900"
            onClick={handleImportClick}
          >
            <FiUpload size={14} />
            <span>Import</span>
          </button>
          {/* Nút Thêm Thẻ */}
          <button
            type="button"
            onClick={handleAddCardPair}
            disabled={!canAddCard}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition',
              canAddCard
                ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
            )}
          >
            <FiPlus size={18} />
            <span>Thêm thẻ</span>
          </button>
        </div>

        {/* HÀNG 2: Color, Size, Opacity */}
        <div className="flex w-full min-w-max items-center gap-3">

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Color
            </label>
            <input
              type="color"
              value={toolbox.color}
              onChange={(e) =>
                setToolbox((prev) => ({ ...prev, color: e.target.value }))
              }
              className="color-picker-soft h-7 w-7 cursor-pointer rounded bg-transparent"
            />
          </div>

          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Size
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={toolbox.size}
              onChange={(e) =>
                setToolbox((prev) => ({ ...prev, size: Number(e.target.value) }))
              }
              className="range-soft w-full min-w-[100px]"
            />
            <span className="w-[28px] text-right text-xs font-bold text-slate-600">
              {toolbox.size}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Opacity
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={toolbox.opacity}
              onChange={(e) =>
                setToolbox((prev) => ({ ...prev, opacity: Number(e.target.value) }))
              }
              className="range-soft w-28"
            />
            <span className="w-[36px] text-right text-xs font-bold text-slate-600">
              {Math.round(toolbox.opacity * 100)}%
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}