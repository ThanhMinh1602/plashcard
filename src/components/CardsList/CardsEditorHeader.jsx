import React from 'react';
import { FiArrowLeft, FiEdit2, FiPlus, FiSave, FiX } from 'react-icons/fi';
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
  handleAddCardPair,
  canAddCard,
  handleSaveAll,
  savingAll,
  packageDescription,
  handleDescriptionChange,
  nameError,
  cardsCount,
  activeCanvasKey,
  error,
  saveMessage,
}) {
  return (
    <div className="sticky top-0 z-40 overflow-hidden rounded-[30px] border border-white/70 bg-white/80 shadow-[0_20px_54px_rgba(148,163,184,0.18)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 md:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <FiArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Package editor
              </div>

              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={headerNameInputRef}
                    value={draftPackageName}
                    onChange={(e) => setDraftPackageName(e.target.value)}
                    onKeyDown={handleHeaderNameKeyDown}
                    placeholder="Nhập tên gói..."
                    className="h-11 w-full min-w-[220px] rounded-2xl border border-sky-100 bg-white px-4 text-lg font-black tracking-tight text-slate-800 shadow-sm outline-none focus:border-sky-200"
                  />

                  <button
                    type="button"
                    onClick={saveHeaderName}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                  >
                    <FiSave size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={cancelHeaderNameEdit}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openNameEditor}
                  className="group inline-flex max-w-full items-center gap-2 rounded-2xl px-2 py-1 text-left transition hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      'truncate text-xl font-black tracking-tight',
                      packageName.trim() ? 'text-slate-800' : 'text-slate-400'
                    )}
                  >
                    {packageName.trim() || 'Chưa đặt tên gói'}
                  </span>
                  <FiEdit2
                    size={15}
                    className="shrink-0 text-slate-400 transition group-hover:text-sky-500"
                  />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex h-11 items-center rounded-2xl px-4 text-xs font-bold uppercase tracking-[0.14em]',
                isAutoSaving
                  ? 'bg-sky-50 text-sky-600'
                  : 'bg-emerald-50 text-emerald-600'
              )}
            >
              {isAutoSaving ? 'Đang tự lưu...' : 'Đã đồng bộ'}
            </div>

            <button
              type="button"
              onClick={handleAddCardPair}
              disabled={!canAddCard}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition',
                canAddCard
                  ? 'bg-gradient-to-r from-sky-300 via-blue-400 to-pink-300 text-slate-900 shadow-[0_16px_36px_rgba(96,165,250,0.28)] hover:-translate-y-0.5'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400'
              )}
            >
              <FiPlus size={16} />
              <span>Thêm cặp thẻ</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={savingAll}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition',
                savingAll
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-gradient-to-r from-sky-400 via-blue-500 to-pink-400 text-white shadow-[0_16px_36px_rgba(99,102,241,0.28)] hover:-translate-y-0.5'
              )}
            >
              <FiSave size={16} />
              <span>{savingAll ? 'Đang lưu...' : 'Lưu tất cả'}</span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <textarea
              value={packageDescription}
              onChange={handleDescriptionChange}
              rows={2}
              placeholder="Mô tả gói flashcard này..."
              className="w-full resize-none rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-200"
            />
            {nameError && (
              <div className="mt-2 text-sm font-medium text-rose-500">
                {nameError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:w-[240px]">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-500">
                Cards
              </div>
              <div className="mt-1 text-2xl font-black text-slate-800">
                {cardsCount}
              </div>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-pink-50/70 px-4 py-3 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-500">
                Active
              </div>
              <div className="mt-1 text-sm font-bold text-slate-700">
                {activeCanvasKey?.endsWith('-back') ? 'Mặt sau' : 'Mặt trước'}
              </div>
            </div>
          </div>
        </div>

        {(error || saveMessage) && (
          <div className="flex flex-col gap-2">
            {error && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-600">
                {error}
              </div>
            )}
            {saveMessage && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-600">
                {saveMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}