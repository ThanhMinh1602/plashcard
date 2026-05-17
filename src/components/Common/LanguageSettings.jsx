import React from 'react';
import { FiArrowLeft, FiCheck, FiGlobe } from 'react-icons/fi';
import { Player } from '@lottiefiles/react-lottie-player';
import { useLanguage } from '../../i18n/LanguageContext';
import loadingLottie from '../../assets/lottie/sun_cloud.json';

const LANGUAGE_META = {
  vi: { flag: 'VI', sample: 'Xin chào' },
  en: { flag: 'EN', sample: 'Hello' },
  zh: { flag: 'ZH', sample: '你好' },
  ko: { flag: 'KO', sample: '안녕하세요' },
  ja: { flag: 'JA', sample: 'こんにちは' },
};

export default function LanguageSettings({ onBack }) {
  const { language, languages, setLanguage, t } = useLanguage();

  return (
    <div className='mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8'>
      <div className='relative overflow-hidden rounded-[32px] border border-white/70 bg-white/78 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-7'>
        <div className='pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-pink-200/40 blur-3xl' />

        <div className='relative flex flex-col gap-5'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex min-w-0 items-center gap-3'>
              <button
                type='button'
                onClick={onBack}
                className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900'
              >
                <FiArrowLeft size={18} />
              </button>

              <div className='min-w-0'>
                <div className='mb-1 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-600'>
                  <FiGlobe size={11} />
                  <span>{t('common.language')}</span>
                </div>
                <h1 className='truncate text-2xl font-black tracking-tight text-slate-800 sm:text-3xl'>
                  {t('language.title')}
                </h1>
                <p className='mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500'>
                  {t('language.subtitle')}
                </p>
              </div>
            </div>

            <div className='h-24 w-24 shrink-0'>
              <Player autoplay loop src={loadingLottie} className='h-full w-full' />
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {languages.map((item) => {
              const selected = item.code === language;
              const meta = LANGUAGE_META[item.code] || {};

              return (
                <button
                  key={item.code}
                  type='button'
                  onClick={() => setLanguage(item.code)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${
                    selected
                      ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-200'
                      : 'border-white/70 bg-white/85 hover:border-sky-100 hover:bg-white'
                  }`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <span
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-black ${
                          selected
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {meta.flag}
                      </span>
                      <div>
                        <div className='text-base font-black text-slate-800'>
                          {item.nativeName}
                        </div>
                        <div className='text-sm font-semibold text-slate-500'>
                          {item.label}
                        </div>
                      </div>
                    </div>

                    {selected && (
                      <span className='inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white'>
                        <FiCheck size={15} />
                      </span>
                    )}
                  </div>

                  <div className='mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600'>
                    {meta.sample}
                    {selected && (
                      <span className='ml-2 text-xs font-black text-emerald-600'>
                        {t('language.current')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
