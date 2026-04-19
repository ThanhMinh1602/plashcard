import React, { useEffect, useState } from 'react';
import { deletePackage, getPackages } from '../../services/flashcardService';
import './PackageList.css';

export default function PackageList({
  user,
  onAddPackage,
  onOpenPackage,
}) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleDelete = async (packageId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa gói này và toàn bộ flashcard bên trong?')) {
      return;
    }

    try {
      await deletePackage(user.uid, packageId);
      setPackages((prev) => prev.filter((item) => item.id !== packageId));
    } catch (err) {
      console.error(err);
      alert('Lỗi xóa gói');
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
    <div className="packages-page">
      <div className="packages-header">
        <div>
          <h2>Gói Flashcard</h2>
          <p>Mỗi gói chứa nhiều flashcard</p>
        </div>

        <button className="btn-add-package" onClick={onAddPackage}>
          ➕ Tạo gói mới
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {packages.length === 0 ? (
        <div className="empty-state">
          <p>📦 Bạn chưa có gói nào</p>
          <p>Hãy tạo gói đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <div className="packages-grid">
          {packages.map((item) => (
            <div key={item.id} className="package-card">
              <div className="package-body" onClick={() => onOpenPackage(item)}>
                <h3>{item.name || 'Gói chưa đặt tên'}</h3>
                <p>{item.description || 'Chưa có mô tả'}</p>
              </div>

              <div className="package-actions">
                <button className="btn-open" onClick={() => onOpenPackage(item)}>
                  📂 Mở
                </button>
                <button className="btn-delete" onClick={() => handleDelete(item.id)}>
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}