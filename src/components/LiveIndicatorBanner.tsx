import React from 'react';
import { Play, Eye, Flame, ChevronRight } from 'lucide-react';
import { LiveStatus } from '../types.ts';

interface LiveIndicatorBannerProps {
  liveStatus: LiveStatus;
  onWatchLive: () => void;
}

export const LiveIndicatorBanner: React.FC<LiveIndicatorBannerProps> = ({
  liveStatus,
  onWatchLive
}) => {
  if (!liveStatus.isLive) {
    return null;
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-rose-950/60 via-red-950/40 to-zinc-950 border-y border-rose-900/40 py-6 px-4 sm:px-6 lg:px-8">
      {/* Background ambient crimson glow */}
      <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        
        {/* Left Side: Animated Indicator & Title */}
        <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full md:w-auto">
          {/* Live Pulsing Radar Beacon */}
          <div className="relative shrink-0 mt-1 sm:mt-0">
            <span className="flex h-5 w-5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-600 border-2 border-[#09090b]" />
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-heading font-black tracking-wider text-rose-500 text-sm sm:text-base uppercase flex items-center gap-2">
                🔴 BILAL RAO IS LIVE NOW!
              </span>
              <span className="text-zinc-500 hidden sm:inline" aria-hidden="true">·</span>
              <span className="text-xs font-mono font-medium text-zinc-300 flex items-center gap-1.5 tabular-nums">
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                {liveStatus.currentViewers} watching now
              </span>
            </div>
            
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug line-clamp-1">
              {liveStatus.title || 'Official Live Stream with Bilal Rao'}
            </h2>
            
            <p className="text-xs sm:text-sm text-zinc-400 line-clamp-1 max-w-2xl">
              {liveStatus.description || 'Join the live conversation, ask questions in real-time, and react now.'}
            </p>
          </div>
        </div>

        {/* Right Side: Thumbnail Preview + Watch Live Action */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
          {liveStatus.thumbnailUrl && (
            <div className="hidden sm:block relative w-24 h-14 rounded-lg overflow-hidden border border-rose-900/50 shrink-0 shadow-md">
              <img
                src={liveStatus.thumbnailUrl}
                alt="Stream Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white opacity-80" />
              </div>
            </div>
          )}

          <button
            onClick={onWatchLive}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-sm shadow-xl shadow-rose-950/60 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            <span>Watch Bilal Rao Live – Click Here</span>
            <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </section>
  );
};
