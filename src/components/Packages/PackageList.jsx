import React, { useEffect, useState } from 'react';
import { FiFolder, FiFolderPlus, FiTrash2, FiPackage } from 'react-icons/fi';
import { BsFolder2Open } from 'react-icons/bs';
import { deletePackage, getPackages } from '../../services/flashcardService';
import ConfirmModal from '../Common/ConfirmModal';
import './PackageList.css';

export default function PackageList({
  user,
  onAddPackage,
  onOpenPackage,
}) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  if (loading) {
    return (
      <div className="packages-page">
        <div className="loading">Đang tải gói...</div>
      </div>
    );
  }

  return (
    <>
      <div className="packages-page">
        <div className="packages-header">
          <div>
            <h2 className="packages-title">
              <FiFolder size={24} />
              <span>Gói Flashcard</span>
            </h2>
            <p>Mỗi gói chứa nhiều flashcard</p>
          </div>

          <button className="btn-add-package package-btn-icon" onClick={onAddPackage}>
            <FiFolderPlus size={18} />
            <span>Tạo gói mới</span>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {packages.length === 0 ? (
          <div className="empty-state packages-empty-state">
            <p className="packages-empty-icon">
              <FiPackage size={28} />
            </p>
            <p>Bạn chưa có gói nào</p>
            <p>Hãy tạo gói đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="packages-grid">
            {packages.map((item) => (
              <div key={item.id} className="package-card">
                <div
                  className="package-body"
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
                  <h3>{item.name || 'Gói chưa đặt tên'}</h3>
                  <p>{item.description || 'Chưa có mô tả'}</p>
                </div>

                <div className="package-actions">
                  <button
                    className="btn-open package-btn-icon"
                    onClick={() => onOpenPackage(item)}
                  >
                    <BsFolder2Open size={16} />
                    <span>Mở</span>
                  </button>

                  <button
                    className="btn-delete package-btn-icon"
                    onClick={() => handleDeleteClick(item)}
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