import React from 'react';
import { FiTrash2 } from 'react-icons/fi';
import AdvancedCanvas from '../AdvancedCanvas/AdvancedCanvas';
import {
    BACK_PAPER_COLOR,
    FRONT_PAPER_COLOR,
    cn,
} from './constants';

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
}) {
    const frontKey = `${item.localId}-front`;
    const backKey = `${item.localId}-back`;
    const isFrontActive = activeCanvasKey === frontKey;
    const isBackActive = activeCanvasKey === backKey;

    return (
        <div
            ref={setPairCardRef(item.localId)}
            className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-3 shadow-[0_20px_54px_rgba(148,163,184,0.16)] backdrop-blur-xl md:p-4"
        >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-2xl bg-gradient-to-r from-sky-100 to-pink-100 px-3 text-sm font-black text-slate-700">
                        {index + 1}
                    </div>

                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Flashcard pair
                        </div>
                        <div className="text-sm font-semibold text-slate-600">
                            Chọn mặt trước hoặc mặt sau để thao tác
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => handleDeleteCardPair(item.localId)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100"
                >
                    <FiTrash2 size={16} />
                    <span>Xóa cặp thẻ</span>
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div
                    className={cn(
                        'rounded-[28px] border p-3 transition',
                        isFrontActive
                            ? 'border-sky-300 bg-sky-50/70 shadow-[0_0_0_1px_rgba(125,211,252,0.3)]'
                            : 'border-sky-100 bg-sky-50/40'
                    )}
                >


                    <div
                        onClick={() => setActiveCanvasKey(frontKey)}
                        className="h-[360px] overflow-hidden rounded-[24px] border border-sky-100 bg-white shadow-inner md:h-[460px] lg:h-[520px]"
                    >
                        <AdvancedCanvas
                            ref={setCanvasRef(frontKey)}
                            initialImage={item.front}
                            initialData={item.frontData}
                            tool={toolbox.tool}
                            brushType={toolbox.brushType}
                            color={toolbox.color}
                            size={toolbox.size}
                            opacity={toolbox.opacity}
                            backgroundColor={FRONT_PAPER_COLOR}
                            inputMode="stylusOnly"
                            onStatusChange={handleCanvasStatusChange(frontKey)}
                        />
                    </div>
                </div>

                <div
                    className={cn(
                        'rounded-[28px] border p-3 transition',
                        isBackActive
                            ? 'border-pink-300 bg-pink-50/70 shadow-[0_0_0_1px_rgba(244,114,182,0.18)]'
                            : 'border-pink-100 bg-pink-50/40'
                    )}
                >
                    <div
                        onClick={() => setActiveCanvasKey(backKey)}
                        className="h-[360px] overflow-hidden rounded-[24px] border border-sky-100 bg-white shadow-inner md:h-[460px] lg:h-[520px]"
                    >
                        <AdvancedCanvas
                            ref={setCanvasRef(backKey)}
                            initialImage={item.back}
                            initialData={item.backData}
                            tool={toolbox.tool}
                            brushType={toolbox.brushType}
                            color={toolbox.color}
                            size={toolbox.size}
                            opacity={toolbox.opacity}
                            backgroundColor={BACK_PAPER_COLOR}
                            inputMode="stylusOnly"
                            onStatusChange={handleCanvasStatusChange(backKey)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}