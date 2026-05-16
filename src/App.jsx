import React, { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { FiLogOut, FiStar } from "react-icons/fi";
import { Player } from "@lottiefiles/react-lottie-player";

import { getCurrentUser, logout } from "./services/authService";

import ConfirmModal from "./components/Common/ConfirmModal";

import AppRoutes from "./routes/AppRoutes";

import loadingLottie from "./assets/lottie/sundance.json";

import monkeyLottie from "./assets/lottie/sun_cloud.json";

function App() {
  const navigate = useNavigate();

  const location = useLocation();

  const [user, setUser] = useState(undefined);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const currentUser = await getCurrentUser();

      if (mounted) {
        setUser(currentUser ?? null);
      }
    };

    loadUser();

    const onAuthChanged = () => {
      loadUser();
    };

    window.addEventListener("auth-changed", onAuthChanged);

    return () => {
      mounted = false;
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);

      logout();

      setShowLogoutModal(false);

      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
      alert("Lỗi đăng xuất");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (user === undefined) {
    return (
      <div className='flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.45),transparent_25%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.34),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)] px-4'>
        <div className='relative w-full max-w-sm overflow-hidden rounded-[34px] border border-white/70 bg-white/80 px-6 py-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-2xl'>
          <div className='pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl' />

          <div className='pointer-events-none absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-pink-200/45 blur-3xl' />

          <div className='relative mx-auto mb-4 h-36 w-36'>
            <Player
              autoplay
              loop
              src={loadingLottie}
              className='h-full w-full'
            />
          </div>

          <h2 className='relative animate-gradient-x bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] bg-clip-text text-xl font-black tracking-tight text-transparent'>
            Đang khởi động...
          </h2>

          <p className='relative mt-2 text-sm leading-6 text-slate-500'>
            Sunni Flashcard đang chuẩn bị dữ liệu cho bạn.
          </p>

          <div className='relative mt-6 flex items-center justify-center gap-2'>
            <span className='h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.3s]' />

            <span className='h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]' />

            <span className='h-2 w-2 animate-bounce rounded-full bg-pink-400' />
          </div>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes gradient-x {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }

              .animate-gradient-x {
                animation: gradient-x 3s ease infinite;
              }
            `,
          }}
        />
      </div>
    );
  }

  const isPackagesPage = location.pathname === "/packages";

  const isEditorMode = location.pathname === "/packages/edit";

  return (
    <>
      <div
        className={`min-h-screen ${
          isEditorMode
            ? "bg-white"
            : "bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.45),transparent_25%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.34),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)]"
        }`}
      >
        {user && isPackagesPage && (
          <header className='sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-2xl'>
            <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-sky-300/80 bg-sky-200 shadow-[0_12px_28px_rgba(14,165,233,0.22)]'>
                  <Player
                    autoplay
                    loop
                    src={monkeyLottie}
                    className='h-12 w-12'
                  />
                </div>

                <div className='min-w-0'>
                  <div className='mb-1 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-600'>
                    <FiStar size={11} />

                    <span>Study app</span>
                  </div>

                  <h1 className='animate-gradient-x truncate bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl'>
                    Sunni Flashcard
                  </h1>
                </div>
              </div>

              <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
                <div className='hidden max-w-[280px] items-center rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 text-sm text-slate-500 shadow-sm sm:flex'>
                  <span className='truncate'>
                    Chào,{" "}
                    <span className='font-bold text-slate-800'>
                      {user.email}
                    </span>
                  </span>
                </div>

                <button
                  onClick={handleLogoutClick}
                  className='inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-black text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100'
                  type='button'
                >
                  <FiLogOut size={16} />

                  <span className='hidden sm:inline'>Đăng xuất</span>
                </button>
              </div>
            </div>
          </header>
        )}

        <AppRoutes user={user} />
      </div>

      <ConfirmModal
        open={showLogoutModal}
        title='Đăng xuất?'
        message='Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.'
        confirmText='Đăng xuất'
        cancelText='Ở lại'
        variant='logout'
        loading={isLoggingOut}
        lottieSrc={monkeyLottie}
        lottieClassName='h-28 w-28'
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutModal(false)}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes gradient-x {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            .animate-gradient-x {
              animation: gradient-x 3s ease infinite;
            }
          `,
        }}
      />
    </>
  );
}

export default App;
