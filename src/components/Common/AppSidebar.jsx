import React, { useEffect, useState } from 'react';
import {
  FiGlobe,
  FiKey,
  FiLogOut,
  FiMenu,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

export default function AppSidebar({
  user,
  active = '',
  onOpenTrash,
  onChangePassword,
  onOpenLanguage,
  onLogout,
  inline = false,
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

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

  const menuItems = [
    {
      id: 'trash',
      label: t('common.trash'),
      icon: FiTrash2,
      onClick: onOpenTrash,
      activeClass:
        'border-sky-200 bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 text-white',
      idleClass: 'border-sky-100 bg-sky-50/90 text-sky-700 hover:bg-sky-100',
    },
    {
      id: 'password',
      label: t('common.changePassword'),
      icon: FiKey,
      onClick: onChangePassword,
      activeClass:
        'border-sky-200 bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 text-white',
      idleClass:
        'border-slate-100 bg-white/90 text-slate-600 hover:bg-slate-50 hover:text-slate-800',
    },
    {
      id: 'language',
      label: t('common.language'),
      icon: FiGlobe,
      onClick: onOpenLanguage,
      activeClass:
        'border-sky-200 bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 text-white',
      idleClass:
        'border-slate-100 bg-white/90 text-slate-600 hover:bg-slate-50 hover:text-slate-800',
    },
  ];

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
        title={open ? t('common.closeMenu') : t('common.openMenu')}
        onClick={() => setOpen((prev) => !prev)}
        className='pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-700 sm:h-12 sm:w-12'
      >
        {open ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      {open && (
        <aside className='pointer-events-auto absolute right-0 top-full z-[9999] mt-3 flex w-[220px] flex-col rounded-[28px] border border-slate-100 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]'>
          <div className='mb-3 px-2 py-1'>
            <div className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>
              {t('common.menu')}
            </div>
            <div className='mt-1 truncate text-sm font-bold text-slate-700'>
              {user.email}
            </div>
          </div>

          <div className='flex flex-col gap-2'>
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type='button'
                  title={item.label}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={`inline-flex h-12 w-full items-center justify-start gap-3 rounded-2xl border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${
                    active === item.id ? item.activeClass : item.idleClass
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type='button'
            title={t('common.logout')}
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className='mt-2 inline-flex h-12 w-full items-center justify-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-black text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100'
          >
            <FiLogOut size={20} />
            <span>{t('common.logout')}</span>
          </button>
        </aside>
      )}
    </div>
  );
}
