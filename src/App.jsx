import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiLogOut, FiStar } from 'react-icons/fi';

import { auth } from './services/firebase';
import ConfirmModal from './components/Common/ConfirmModal';
import AppRoutes from './routes/AppRoutes';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(undefined);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ?? null);
    });

    return () => unsubscribe();
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut(auth);
      setShowLogoutModal(false);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
      alert('Lỗi đăng xuất');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.45),transparent_25%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.34),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)]">
        <div className="rounded-[28px] border border-white/70 bg-white/85 px-8 py-6 text-slate-500 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl">
          Đang tải...
        </div>
      </div>
    );
  }

  const isPackagesPage = location.pathname === '/packages';
  const isEditorMode = location.pathname === '/packages/edit';

  return (
    <>
      <div
        className={`min-h-screen ${
          isEditorMode
            ? 'bg-white'
            : 'bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.45),transparent_25%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.34),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)]'
        }`}
      >
        {user && isPackagesPage && (
          <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-600 shadow-sm">
                  <FiStar size={14} />
                  <span>Flashcard Studio</span>
                </div>
                <h1 className="gradient-text text-2xl font-black tracking-tight sm:text-3xl">
                  Flashcard
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                  Chào, <span className="font-semibold text-slate-800">{user.email}</span>
                </div>

                <button
                  onClick={handleLogoutClick}
                  className="soft-button rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm hover:-translate-y-0.5 hover:bg-rose-100"
                  type="button"
                >
                  <FiLogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </header>
        )}

        <AppRoutes user={user} />
      </div>

      <ConfirmModal
        open={showLogoutModal}
        title="Đăng xuất?"
        message="Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng."
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        variant="logout"
        loading={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}

export default App;