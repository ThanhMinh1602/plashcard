import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

import loadingLottie from '../../assets/lottie/sun_cloud.json';

export default function HeroLoading({
  title = 'Đang tải...',
  message = 'Vui lòng chờ trong giây lát.',
  fullScreen = true,
}) {
  return (
    <div
      className={
        fullScreen
          ? 'flex min-h-screen w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.38),transparent_30%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.3),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)] px-4'
          : 'flex w-full items-center justify-center px-4 py-10'
      }
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/70 bg-white/80 px-6 py-8 text-center shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-36 w-36 rounded-full bg-pink-200/40 blur-3xl" />

        <div className="relative mx-auto mb-5 flex h-36 w-36 items-center justify-center">
          <Player
            autoplay
            loop
            src={loadingLottie}
            className="h-full w-full"
          />
        </div>

        <h3 className="relative text-xl font-black tracking-tight text-slate-800">
          {title}
        </h3>

        <p className="relative mt-2 text-sm leading-6 text-slate-500">
          {message}
        </p>

        <div className="relative mt-6 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-pink-400" />
        </div>
      </div>
    </div>
  );
}