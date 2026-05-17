import React from 'react';
import { FiEdit3, FiPlus } from 'react-icons/fi';
import { Player } from '@lottiefiles/react-lottie-player';
import { cn } from './constants';
import usePenPress from './hooks/usePenPress';
import { useLanguage } from '../../i18n/LanguageContext';

import emptyLottie from '../../assets/lottie/sundance.json';

export default function CardsEmptyState({ handleAddCardPair, canAddCard }) {
  const bindPress = usePenPress();
  const { t } = useLanguage();

  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[34px] border border-white/70 bg-white/80 px-6 py-10 text-center shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-52 w-52 rounded-full bg-pink-200/45 blur-3xl" />

      <div className="relative mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-[32px] border border-sky-100/70 bg-sky-50/70 shadow-inner">
        <Player autoplay loop src={emptyLottie} className="h-32 w-32" />
      </div>

      <div className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-sky-600 shadow-sm">
        {canAddCard ? <FiPlus size={13} /> : <FiEdit3 size={13} />}
        <span>{canAddCard ? t('cards.ready') : t('cards.needName')}</span>
      </div>

      <h3 className="relative text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
        {canAddCard ? t('cards.emptyTitle') : t('cards.nameFirstTitle')}
      </h3>

      <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
        {canAddCard ? t('cards.emptyText') : t('cards.nameFirstText')}
      </p>

      {!canAddCard && (
        <div className="relative mx-auto mt-5 max-w-md rounded-3xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm font-semibold leading-6 text-amber-700 shadow-sm">
          {t('cards.nameHint')}
        </div>
      )}

      <button
        type="button"
        disabled={!canAddCard}
        {...bindPress(handleAddCardPair, !canAddCard)}
        className={cn(
          'relative mt-7 inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-black transition',
          canAddCard
            ? 'bg-gradient-to-r from-sky-400 via-blue-500 to-pink-400 bg-[length:200%_200%] text-white shadow-[0_18px_42px_rgba(59,130,246,0.28)] hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(236,72,153,0.28)]'
            : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 shadow-sm',
        )}
      >
        <FiPlus size={16} />
        <span>{canAddCard ? t('cards.addFirst') : t('cards.cannotAdd')}</span>
      </button>
    </div>
  );
}
