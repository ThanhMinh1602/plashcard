import React from 'react';
import { FiArrowLeft, FiCheck, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import { cn } from './constants';
import usePenPress from './hooks/usePenPress';

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
  handleSaveAll,
  savingAll,
  nameError,
  cardsCount,
  error,
  saveMessage,
}) {
  const bindPress = usePenPress();
  const statusMessage = nameError || error || saveMessage;
  const hasErrorStatus = Boolean(nameError || error);

  return (
    <div className='cards-editor-header flex flex-col gap-2 px-4 py-3 md:px-5'>
      <div className='cards-editor-header-row flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <button
            type='button'
            {...bindPress(onBack)}
            className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900'
          >
            <FiArrowLeft size={18} />
          </button>

          <div className='flex min-w-0 flex-1 items-center'>
            {isEditingName ? (
              <div className='flex w-full max-w-md items-center gap-1.5'>
                <input
                  ref={headerNameInputRef}
                  value={draftPackageName}
                  onChange={(e) => setDraftPackageName(e.target.value)}
                  onKeyDown={handleHeaderNameKeyDown}
                  placeholder='Nhập tên gói...'
                  className='h-9 w-full min-w-[180px] rounded-lg border border-sky-200 bg-white px-3 text-base font-bold text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
                />

                <button
                  type='button'
                  {...bindPress(saveHeaderName)}
                  className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100'
                >
                  <FiSave size={16} />
                </button>

                <button
                  type='button'
                  {...bindPress(cancelHeaderNameEdit)}
                  className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition hover:bg-rose-100'
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <button
                type='button'
                {...bindPress(openNameEditor)}
                className='group flex max-w-full items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-100'
              >
                <span
                  className={cn(
                    'truncate text-lg font-bold tracking-tight',
                    packageName.trim()
                      ? 'text-slate-800'
                      : 'text-slate-400 italic',
                  )}
                >
                  {packageName.trim() || 'Chưa đặt tên gói'}
                </span>

                <FiEdit2
                  size={14}
                  className='shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 group-hover:text-sky-500'
                />
              </button>
            )}
          </div>
        </div>

        <div className='cards-editor-header-actions flex shrink-0 items-center gap-3 text-sm'>
          {statusMessage && (
            <div
              className={cn(
                'flex max-w-[220px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm sm:max-w-[320px]',
                hasErrorStatus
                  ? 'border-rose-100 bg-rose-50 text-rose-600'
                  : 'border-emerald-100 bg-emerald-50 text-emerald-600',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white',
                  hasErrorStatus ? 'bg-rose-500' : 'bg-emerald-500',
                )}
              >
                {hasErrorStatus ? <FiX size={13} /> : <FiCheck size={13} />}
              </span>
              <span className='truncate'>{statusMessage}</span>
            </div>
          )}

          <div className='hidden items-center gap-2 md:flex'>
            <span className='rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-600'>
              <span className='font-bold text-slate-800'>{cardsCount}</span> thẻ
            </span>
          </div>

          <button
            type='button'
            {...bindPress(handleSaveAll, savingAll)}
            disabled={savingAll}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition',
              savingAll
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-gradient-to-r from-sky-400 via-blue-500 to-pink-400 text-white shadow-sm hover:-translate-y-0.5',
            )}
          >
            <FiSave size={16} />
            <span className='hidden sm:inline'>
              {savingAll ? 'Đang lưu...' : 'Lưu tất cả'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
