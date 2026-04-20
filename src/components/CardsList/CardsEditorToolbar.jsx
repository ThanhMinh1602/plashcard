import React from 'react';
import { FiDownload, FiUpload } from 'react-icons/fi';
import { BRUSH_TYPES, TOOL_LIST, cn } from './constants';

export default function CardsEditorToolbar({
  activeCanvasRef,
  activeStatus,
  isBrushTool,
  toolbox,
  setToolbox,
  handleImportClick,
}) {
  return (
    <div className="sticky top-[148px] z-30 mt-4 overflow-x-auto rounded-[28px] border border-white/70 bg-white/80 px-3 py-3 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl md:top-[164px]">
      <div className="flex min-w-max items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
          <button
            type="button"
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold transition',
              !activeCanvasRef || !activeStatus.canUndo
                ? 'cursor-not-allowed bg-white text-slate-300'
                : 'bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-100'
            )}
            onClick={() => activeCanvasRef?.undo?.()}
            disabled={!activeCanvasRef || !activeStatus.canUndo}
          >
            <span aria-hidden="true">↶</span>
            <span>Undo</span>
          </button>

          <button
            type="button"
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold transition',
              !activeCanvasRef || !activeStatus.canRedo
                ? 'cursor-not-allowed bg-white text-slate-300'
                : 'bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-100'
            )}
            onClick={() => activeCanvasRef?.redo?.()}
            disabled={!activeCanvasRef || !activeStatus.canRedo}
          >
            <span aria-hidden="true">↷</span>
            <span>Redo</span>
          </button>
        </div>

        {isBrushTool && (
          <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/80 p-2">
            {BRUSH_TYPES.map((item) => {
              const Icon = item.icon;
              const active = toolbox.brushType === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  className={cn(
                    'inline-flex min-h-[46px] min-w-[72px] flex-col items-center justify-center rounded-2xl px-3 py-2 text-[11px] font-bold transition',
                    active
                      ? 'bg-gradient-to-r from-sky-400 via-blue-500 to-pink-400 text-white shadow-[0_14px_30px_rgba(96,165,250,0.3)]'
                      : 'bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50'
                  )}
                  onClick={() =>
                    setToolbox((prev) => ({ ...prev, brushType: item.id }))
                  }
                >
                  <Icon size={16} />
                  <small>{item.label}</small>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-pink-100 bg-pink-50/80 p-2">
          {TOOL_LIST.map((item) => {
            const Icon = item.icon;
            const active = toolbox.tool === item.id;

            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                className={cn(
                  'inline-flex min-h-[46px] min-w-[72px] flex-col items-center justify-center rounded-2xl px-3 py-2 text-[11px] font-bold transition',
                  active
                    ? 'bg-gradient-to-r from-sky-400 via-blue-500 to-pink-400 text-white shadow-[0_14px_30px_rgba(96,165,250,0.3)]'
                    : 'bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50'
                )}
                onClick={() => setToolbox((prev) => ({ ...prev, tool: item.id }))}
              >
                <Icon size={16} />
                <small>{item.label}</small>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-2">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
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
            className="color-picker-soft"
          />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-2">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Size
          </label>
          <input
            type="range"
            min="1"
            max="32"
            value={toolbox.size}
            onChange={(e) =>
              setToolbox((prev) => ({
                ...prev,
                size: Number(e.target.value),
              }))
            }
            className="range-soft w-28"
          />
          <span className="min-w-[24px] text-xs font-bold text-slate-600">
            {toolbox.size}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-2">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
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
            className="range-soft w-28"
          />
          <span className="min-w-[40px] text-xs font-bold text-slate-600">
            {Math.round(toolbox.opacity * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
            onClick={handleImportClick}
          >
            <FiUpload size={16} />
            <span>Import</span>
          </button>

          <button
            type="button"
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition',
              activeCanvasRef
                ? 'bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-100'
                : 'cursor-not-allowed bg-white text-slate-300'
            )}
            onClick={() => activeCanvasRef?.exportImage?.()}
            disabled={!activeCanvasRef}
          >
            <FiDownload size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}