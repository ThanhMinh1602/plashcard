import React, { useEffect, useState } from 'react';
import { FiFolder, FiFolderPlus, FiPackage, FiTrash2 } from 'react-icons/fi';
import { BsFolder2Open, BsPlayCircle } from 'react-icons/bs';
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
      <div className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="soft-card px-8 py-8 text-center text-slate-500">
          Đang tải gói...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-600 shadow-sm">
              <FiFolder size={14} />
              <span>Packages</span>
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-800">
              Gói Flashcard
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Mỗi gói chứa nhiều flashcard để bạn học nhanh và trực quan hơn.
            </p>
          </div>

          <button
            className="soft-button gradient-primary h-12 rounded-2xl px-5 text-sm font-bold hover:-translate-y-0.5"
            onClick={onAddPackage}
            type="button"
          >
            <FiFolderPlus size={18} />
            <span>Tạo gói mới</span>
          </button>
        </div>

        {error && <div className="status-error mb-6">{error}</div>}

        {packages.length === 0 ? (
          <div className="soft-card flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <FiPackage size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Bạn chưa có gói nào</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Hãy tạo gói đầu tiên để bắt đầu xây dựng bộ flashcard của riêng bạn.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {packages.map((item) => (
              <div
                key={item.id}
                className="soft-card overflow-hidden transition duration-200 hover:-translate-y-1"
              >
                <div
                  className="cursor-pointer px-5 py-5"
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
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                    <FiFolder size={13} />
                    <span>Flashcard package</span>
                  </div>

                  <h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-800">
                    {item.name || 'Gói chưa đặt tên'}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    {item.description || 'Chưa có mô tả'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
                  <button
                    className="soft-button h-11 rounded-2xl border border-slate-200 bg-slate-900 px-4 text-white hover:bg-slate-800"
                    onClick={() => onOpenPackage(item)}
                    type="button"
                  >
                    <BsFolder2Open size={16} />
                    <span>Mở</span>
                  </button>

                  <button
                    className="soft-button h-11 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => handleStudyClick(item)}
                    disabled={studyingId === item.id}
                    type="button"
                  >
                    <BsPlayCircle size={16} />
                    <span>{studyingId === item.id ? 'Đang tải...' : 'Học'}</span>
                  </button>

                  <button
                    className="soft-button h-11 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-rose-600 hover:bg-rose-100"
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
    </>
  );
}