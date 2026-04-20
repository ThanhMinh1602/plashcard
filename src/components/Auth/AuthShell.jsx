import React from 'react';
import { FiStar } from 'react-icons/fi';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.55),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,168,212,0.45),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)]" />

      <div className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-pink-200/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-600 shadow-sm">
           <FiStar size={14} />
              <span>Flashcard App</span>
            </div>

            <h1 className="gradient-text text-3xl font-black tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500">{subtitle}</p>
          </div>

          {children}

          {footer ? <div className="mt-6 text-center text-sm text-slate-500">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}