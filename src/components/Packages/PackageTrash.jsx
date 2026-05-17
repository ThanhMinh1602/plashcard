import React, { useEffect, useState } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import {
  FiArrowLeft,
  FiPackage,
  FiRefreshCcw,
  FiTrash2,
} from 'react-icons/fi';
import {
  getDeletedPackages,
  permanentlyDeletePackage,
  restorePackage,
} from '../../services/flashcardService';
import ConfirmModal from '../Common/ConfirmModal';
import loadingLottie from '../../assets/lottie/sundance.json';
import { useLanguage } from '../../i18n/LanguageContext';

export default function PackageTrash({ user, onBack }) {
  const { language, t } = useLanguage();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [clearTrashOpen, setClearTrashOpen] = useState(false);
  const [isClearingTrash, setIsClearingTrash] = useState(false);

  useEffect(() => {
    loadDeletedPackages();
  }, [user]);

  const loadDeletedPackages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      const data = await getDeletedPackages(user.uid);
      setPackages(data);
    } catch (err) {
      console.error(err);
      setError(t('trash.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    try {
      setBusyId(restoreTarget.id);
      await restorePackage(user.uid, restoreTarget.id);
      setPackages((prev) => prev.filter((item) => item.id !== restoreTarget.id));
      setRestoreTarget(null);
    } catch (err) {
      console.error(err);
      alert(t('trash.restoreError'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;

    try {
      setBusyId(deleteTarget.id);
      await permanentlyDeletePackage(user.uid, deleteTarget.id);
      setPackages((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert(t('trash.permanentDeleteError'));
    } finally {
      setBusyId(null);
    }
  };

  const handleClearTrash = async () => {
    if (packages.length === 0) return;

    try {
      setIsClearingTrash(true);
      setBusyId('clear-trash');

      await Promise.all(
        packages.map((item) => permanentlyDeletePackage(user.uid, item.id)),
      );

      setPackages([]);
      setClearTrashOpen(false);
    } catch (err) {
      console.error(err);
      alert(t('trash.clearError'));
    } finally {
      setIsClearingTrash(false);
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 px-4'>
        <div className='flex w-full max-w-md flex-col items-center rounded-[32px] border border-white/70 bg-white/75 p-8 text-center shadow-[0_24px_70px_rgba(251,113,133,0.22)] backdrop-blur-2xl'>
          <Player autoplay loop src={loadingLottie} className='h-40 w-40' />
          <h3 className='mt-2 text-xl font-black text-slate-800'>
            {t('trash.loadingTitle')}
          </h3>
          <p className='mt-2 text-sm font-semibold text-slate-500'>
            {t('trash.loadingMessage')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='mx-auto w-full max-w-7xl px-4 pt-10 pb-8 sm:px-6 lg:px-8'>
        <div className='relative mb-7 overflow-hidden rounded-[32px] border border-white/70 bg-white/75 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:px-6'>
          <div className='pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-200/35 blur-3xl' />
          <div className='pointer-events-none absolute -bottom-20 left-16 h-44 w-44 rounded-full bg-pink-200/30 blur-3xl' />

          <div className='relative'>
            <div>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex flex-wrap items-center gap-3'>
                  <button
                    type='button'
                    onClick={onBack}
                    className='inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-100 bg-white/90 px-4 text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-800'
                  >
                    <FiArrowLeft size={16} />
                    <span>{t('common.back')}</span>
                  </button>

                  <div className='hidden'>
                    <span>{t('common.trash')}</span>
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  {packages.length > 0 && (
                    <button
                      type='button'
                      onClick={() => setClearTrashOpen(true)}
                      disabled={isClearingTrash}
                      className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-black text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'
                    >
                      <FiTrash2 size={16} />
                      <span>{t('trash.clear')}</span>
                    </button>
                  )}

                  <button
                    type='button'
                    onClick={loadDeletedPackages}
                    disabled={isClearingTrash}
                    className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white/90 px-4 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'
                  >
                    <FiRefreshCcw size={16} />
                    <span>{t('common.refresh')}</span>
                  </button>
                </div>
              </div>

              <h1 className='text-3xl font-black tracking-tight text-slate-900'>
                {t('trash.title')}
              </h1>
              <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>
                {t('trash.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className='mb-6 rounded-3xl border border-rose-100 bg-rose-50/90 px-5 py-4 text-sm font-semibold text-rose-600 shadow-sm'>
            {error}
          </div>
        )}

        {packages.length === 0 ? (
          <div className='relative overflow-hidden rounded-[32px] border border-white/70 bg-white/75 px-6 py-12 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl'>
            <div className='pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl' />
            <div className='relative mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-sky-100 bg-sky-50 text-sky-500 shadow-inner'>
              <FiTrash2 size={34} />
            </div>
            <h3 className='relative text-2xl font-black tracking-tight text-slate-800'>
              {t('trash.emptyTitle')}
            </h3>
            <p className='relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500'>
              {t('trash.emptyMessage')}
            </p>
          </div>
        ) : (
          <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
            {packages.map((item) => (
              <div
                key={item.id}
                className='group relative overflow-hidden rounded-[30px] border border-white/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,23,42,0.15)]'
              >
                <div className='pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-sky-200/35 blur-2xl transition group-hover:bg-pink-200/45' />

                <div className='relative px-5 py-5'>
                  <div className='mb-4 flex items-start justify-between gap-3'>
                    <div className='inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-pink-100 text-sky-600 shadow-inner'>
                      <FiPackage size={22} />
                    </div>

                    <div className='rounded-full border border-slate-100 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 shadow-sm'>
                      {t('trash.deleted')}
                    </div>
                  </div>

                  <h3 className='line-clamp-1 text-xl font-black tracking-tight text-slate-800'>
                    {item.name || t('common.unnamedPackage')}
                  </h3>

                  <p className='mt-2 min-h-[48px] line-clamp-2 text-sm leading-6 text-slate-500'>
                    {item.description || t('common.noDescription')}
                  </p>

                  {item.deletedAt && (
                    <p className='mt-3 text-xs font-bold text-slate-400'>
                      {t('trash.deletedAt', {
                        date: new Date(item.deletedAt).toLocaleString(language),
                      })}
                    </p>
                  )}
                </div>

                <div className='relative grid grid-cols-1 gap-2 border-t border-slate-100/80 bg-slate-50/45 px-5 py-4 sm:grid-cols-2'>
                  <button
                    className='package-add-gradient inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] px-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'
                    onClick={() => setRestoreTarget(item)}
                    disabled={busyId === item.id || isClearingTrash}
                    type='button'
                  >
                    <FiRefreshCcw size={16} />
                    <span>{t('trash.restore')}</span>
                  </button>

                  <button
                    className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white px-3 text-sm font-black text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'
                    onClick={() => setDeleteTarget(item)}
                    disabled={busyId === item.id || isClearingTrash}
                    type='button'
                  >
                    <FiTrash2 size={16} />
                    <span>{t('trash.permanentDelete')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(restoreTarget)}
        title={t('trash.restoreTitle')}
        message={t('trash.restoreMessage', {
          name: restoreTarget?.name?.trim() || t('common.unnamedPackage'),
        })}
        confirmText={t('trash.restore')}
        cancelText={t('modal.cancel')}
        variant='warning'
        loading={Boolean(restoreTarget && busyId === restoreTarget.id)}
        onConfirm={handleRestore}
        onClose={() => setRestoreTarget(null)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t('trash.permanentDeleteTitle')}
        message={t('trash.permanentDeleteMessage', {
          name: deleteTarget?.name?.trim() || t('common.unnamedPackage'),
        })}
        confirmText={t('trash.permanentDeleteConfirm')}
        cancelText={t('modal.cancel')}
        variant='danger'
        loading={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onConfirm={handlePermanentDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={clearTrashOpen}
        title={t('trash.clearTitle')}
        message={t('trash.clearMessage', { count: packages.length })}
        confirmText={t('trash.clear')}
        cancelText={t('modal.cancel')}
        variant='danger'
        loading={isClearingTrash}
        onConfirm={handleClearTrash}
        onClose={() => setClearTrashOpen(false)}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes package-gradient-x {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            .package-add-gradient {
              animation: package-gradient-x 3s ease infinite;
            }
          `,
        }}
      />
    </>
  );
}
