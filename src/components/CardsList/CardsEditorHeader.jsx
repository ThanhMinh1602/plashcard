import React from 'react';
import { FiArrowLeft, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import { cn } from './constants';

export default function CardsEditorHeader({
  onBack,
  isEditingName,
  headerNameInputRef,
  draftPackageName,
  setDraftPackageName,
  handleHeaderNameKeyDown,
  saveHeaderName,
  cancelHeaderNameEdit,
  openNameEditor,
  packageName,
  isAutoSaving,
  handleSaveAll,
  savingAll,
  nameError,
  cardsCount,
  activeCanvasKey,
  error,
  saveMessage,
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Cụm bên trái: Back & Tên */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <FiArrowLeft size={18} />
          </button>

          <div className="flex min-w-0 flex-1 items-center">
            {isEditingName ? (
              <div className="flex w-full max-w-md items-center gap-1.5">
                <input
                  ref={headerNameInputRef}
                  value={draftPackageName}
                  onChange={(e) => setDraftPackageName(e.target.value)}
                  onKeyDown={handleHeaderNameKeyDown}
                  placeholder="Nhập tên gói..."
                  className="h-9 w-full min-w-[180px] rounded-lg border border-sky-200 bg-white px-3 text-base font-bold text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={saveHeaderName}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                >
                  <FiSave size={16} />
                </button>
                <button
                  type="button"
                  onClick={cancelHeaderNameEdit}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openNameEditor}
                className="group flex max-w-full items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-100"
              >
                <span
                  className={cn(
                    'truncate text-lg font-bold tracking-tight',
                    packageName.trim() ? 'text-slate-800' : 'text-slate-400 italic'
                  )}
                >
                  {packageName.trim() || 'Chưa đặt tên gói'}
                </span>
                <FiEdit2 size={14} className="shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 group-hover:text-sky-500" />
              </button>
            )}
          </div>
        </div>

        {/* Cụm bên phải: Thống kê, Trạng thái & Nút LƯU */}
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              <span className="font-bold text-slate-800">{cardsCount}</span> thẻ
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              {activeCanvasKey?.endsWith('-back') ? 'Mặt sau' : 'Mặt trước'}
            </span>
            <div className="h-4 w-px bg-slate-200" /> 
          </div>

          <div
            className={cn(
              'hidden sm:inline-flex h-9 items-center rounded-lg px-3 text-xs font-bold uppercase tracking-wider',
              isAutoSaving ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
            )}
          >
            {isAutoSaving ? 'Đang lưu...' : 'Đã lưu'}
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition',
              savingAll
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-gradient-to-r from-sky-400 via-blue-500 to-pink-400 text-white shadow-sm hover:-translate-y-0.5'
            )}
          >
            <FiSave size={16} />
            <span className="hidden sm:inline">{savingAll ? 'Đang lưu...' : 'Lưu tất cả'}</span>
          </button>
        </div>
      </div>

      {(nameError || error || saveMessage) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {nameError && <span className="text-rose-500 font-medium">{nameError}</span>}
          {error && <span className="text-rose-500 font-medium">{error}</span>}
          {saveMessage && <span className="text-emerald-600 font-medium">{saveMessage}</span>}
        </div>
      )}
    </div>
  );
}