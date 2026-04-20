import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { cn } from './constants';

export default function CardsEmptyState({ handleAddCardPair, canAddCard }) {
  return (
    <div className="rounded-[30px] border border-white/70 bg-white/80 px-6 py-16 text-center shadow-[0_20px_54px_rgba(148,163,184,0.16)] backdrop-blur-xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-sky-100 to-pink-100 text-slate-600">
        <FiPlus size={24} />
      </div>
      <h3 className="text-2xl font-black tracking-tight text-slate-800">
        Chưa có flashcard nào
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Hãy tạo cặp thẻ đầu tiên. Bạn có thể vẽ trực tiếp, import ảnh vào từng mặt
        thẻ và lưu toàn bộ như app hiện tại.
      </p>
      <button
        type="button"
        onClick={handleAddCardPair}
        disabled={!canAddCard}
        className={cn(
          'mt-6 inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-bold transition',
          canAddCard
            ? 'bg-gradient-to-r from-sky-300 via-blue-400 to-pink-300 text-slate-900 shadow-[0_16px_36px_rgba(96,165,250,0.28)] hover:-translate-y-0.5'
            : 'cursor-not-allowed bg-slate-100 text-slate-400'
        )}
      >
        <FiPlus size={16} />
        <span>Thêm cặp thẻ đầu tiên</span>
      </button>
    </div>
  );
}