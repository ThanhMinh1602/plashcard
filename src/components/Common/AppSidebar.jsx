import React, { useEffect, useState } from 'react';
import { FiKey, FiLogOut, FiMenu, FiTrash2, FiX } from 'react-icons/fi';

export default function AppSidebar({
  user,
  active = '',
  onOpenTrash,
  onChangePassword,
  onLogout,
  inline = false,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div
      className={
        inline
          ? 'relative z-50 flex flex-col items-end'
          : 'fixed right-4 top-3 bottom-4 z-50 flex flex-col items-end pointer-events-none'
      }
    >
      <button
        type='button'
        title={open ? 'Đóng menu' : 'Mở menu'}
        onClick={() => setOpen((prev) => !prev)}
        className='pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-700 sm:h-12 sm:w-12'
      >
        {open ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      {open && (
        <aside className='pointer-events-auto absolute right-0 top-full z-[9999] mt-3 flex w-[220px] flex-col rounded-[28px] border border-slate-100 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]'>
          <div className='mb-3 px-2 py-1'>
            <div className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>
              Menu
            </div>
            <div className='mt-1 truncate text-sm font-bold text-slate-700'>
              {user.email}
            </div>
          </div>

          <div className='flex flex-col gap-2'>
        <button
          type='button'
          title='Thùng rác'
          onClick={() => {
            setOpen(false);
            onOpenTrash?.();
          }}
          className={`inline-flex h-12 w-full items-center justify-start gap-3 rounded-2xl border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${
            active === 'trash'
              ? 'border-sky-200 bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 text-white'
              : 'border-sky-100 bg-sky-50/90 text-sky-700 hover:bg-sky-100'
          }`}
        >
          <FiTrash2 size={20} />
          <span>Thùng rác</span>
        </button>

        <button
          type='button'
          title='Đổi mật khẩu'
          onClick={() => {
            setOpen(false);
            onChangePassword?.();
          }}
          className={`inline-flex h-12 w-full items-center justify-start gap-3 rounded-2xl border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${
            active === 'password'
              ? 'border-sky-200 bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 text-white'
              : 'border-slate-100 bg-white/90 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <FiKey size={20} />
          <span>Đổi mật khẩu</span>
        </button>
          </div>

          <button
            type='button'
            title='Đăng xuất'
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className='mt-2 inline-flex h-12 w-full items-center justify-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-black text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100'
          >
            <FiLogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </aside>
      )}
    </div>
  );
}
