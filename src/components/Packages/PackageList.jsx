import React, { useEffect, useState } from 'react';
import {
  FiFolder,
  FiFolderPlus,
  FiPackage,
  FiTrash2,
} from 'react-icons/fi';
import { BsFolder2Open, BsPlayCircle } from 'react-icons/bs';
import HeroLoading from '../Common/HeroLoading';
import {
  deletePackage,
  getFlashcards,
  getPackages,
} from '../../services/flashcardService';
import ConfirmModal from '../Common/ConfirmModal';

export default function PackageList({
  user,
  onAddPackage,
  onOpenPackage,
  onStudyPackage,
  onDrawPackage,
}) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [studyingId, setStudyingId] = useState(null);

  useEffect(() => {
    loadPackages();
  }, [user]);

  const loadPackages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      const data = await getPackages(user.uid);
      setPackages(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải danh sách gói');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (packageItem) => {
    setDeleteTarget(packageItem);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await deletePackage(user.uid, deleteTarget.id);
      setPackages((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('Lỗi xóa gói');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStudyClick = async (packageItem) => {
    if (!user) return;

    try {
      setStudyingId(packageItem.id);
      const cards = await getFlashcards(user.uid, packageItem.id);
      onStudyPackage?.(packageItem, cards);
    } catch (err) {
      console.error(err);
      alert('Lỗi tải thẻ để học');
    } finally {
      setStudyingId(null);
    }
  };

  if (loading) {
    return (
      <HeroLoading
        title="Đang tải gói..."
        message="Hệ thống đang chuẩn bị danh sách flashcard của bạn."
      />
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 mb-6 bg-transparent">
        <div className="mx-auto flex w-full max-w-7xl justify-end px-4 pt-4 sm:px-6 lg:px-8">
          <button
            className="package-add-gradient inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(59,130,246,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(236,72,153,0.28)]"
            onClick={onAddPackage}
            type="button"
          >
            <FiFolderPlus size={18} />
            <span>Tạo gói mới</span>
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-3xl border border-rose-100 bg-rose-50/90 px-5 py-4 text-sm font-semibold text-rose-600 shadow-sm">
            {error}
          </div>
        )}

        {packages.length === 0 ? (
          <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/75 px-6 py-12 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl" />

            <div className="relative mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-sky-100 bg-sky-50 text-sky-500 shadow-inner">
              <FiPackage size={34} />
            </div>

            <h3 className="relative text-2xl font-black tracking-tight text-slate-800">
              Bạn chưa có gói nào
            </h3>

            <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Hãy tạo gói đầu tiên để bắt đầu xây dựng bộ flashcard của riêng bạn.
            </p>

            <button
              className="package-add-gradient relative mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] px-5 text-sm font-black text-white shadow-[0_18px_40px_rgba(59,130,246,0.25)] transition hover:-translate-y-0.5"
              onClick={onAddPackage}
              type="button"
            >
              <FiFolderPlus size={18} />
              <span>Tạo gói đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {packages.map((item, index) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-[30px] border border-white/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,23,42,0.15)]"
              >
                <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-sky-200/35 blur-2xl transition group-hover:bg-pink-200/45" />

                <div
                  className="relative cursor-pointer px-5 py-5"
                  onClick={() => onOpenPackage(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenPackage(item);
                    }
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-pink-100 text-sky-600 shadow-inner">
                      <FiFolder size={22} />
                    </div>

                    <div className="rounded-full border border-slate-100 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 shadow-sm">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50/90 px-3 py-1 text-xs font-bold text-slate-500">
                    <FiPackage size={13} />
                    <span>Flashcard package</span>
                  </div>

                  <h3 className="line-clamp-1 text-xl font-black tracking-tight text-slate-800">
                    {item.name || 'Gói chưa đặt tên'}
                  </h3>

                  <p className="mt-2 min-h-[48px] line-clamp-2 text-sm leading-6 text-slate-500">
                    {item.description || 'Chưa có mô tả'}
                  </p>
                </div>

                <div className="relative grid grid-cols-1 gap-2 border-t border-slate-100/80 bg-slate-50/45 px-5 py-4 sm:grid-cols-3">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                    onClick={() => onOpenPackage(item)}
                    type="button"
                  >
                    <BsFolder2Open size={16} />
                    <span>Mở</span>
                  </button>

                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    onClick={() => handleStudyClick(item)}
                    disabled={studyingId === item.id}
                    type="button"
                  >
                    <BsPlayCircle size={16} />
                    <span>{studyingId === item.id ? 'Đang tải...' : 'Học'}</span>
                  </button>

                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 text-sm font-bold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100"
                    onClick={() => handleDeleteClick(item)}
                    type="button"
                  >
                    <FiTrash2 size={16} />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xóa gói này?"
        message={`${
          deleteTarget?.name?.trim() || 'Gói chưa đặt tên'
        } sẽ bị xóa cùng toàn bộ flashcard bên trong.`}
        confirmText="Xóa gói"
        cancelText="Hủy"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
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