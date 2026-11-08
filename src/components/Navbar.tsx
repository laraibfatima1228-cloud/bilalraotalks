import React from 'react';
import { Radio, Lock, ShieldCheck, Play } from 'lucide-react';
import { LiveStatus } from '../types.ts';

interface NavbarProps {
  liveStatus: LiveStatus;
  currentView: 'home' | 'player' | 'admin-login' | 'admin-studio' | 'admin-dashboard';
  setCurrentView: (view: 'home' | 'player' | 'admin-login' | 'admin-studio' | 'admin-dashboard') => void;
  isAdminLoggedIn: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  liveStatus,
  currentView,
  setCurrentView,
  isAdminLoggedIn,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#09090b]/90 backdrop-blur-md border-b border-[#27272a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single Wordmark Brand */}
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-2.5 text-left text-white tracking-tight group focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
        >
          <span className="font-heading font-extrabold text-xl tracking-wider text-white flex items-center gap-1.5">
            BILAL RAO <span className="text-rose-500">LIVE</span>
          </span>
          {liveStatus.isLive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-rose-950/80 border border-rose-600/50 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              LIVE
            </span>
          )}
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <button
            onClick={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`transition-colors hover:text-white whitespace-nowrap ${currentView === 'home' ? 'text-white' : ''}`}
          >
            Home
          </button>
          
          {liveStatus.isLive && (
            <button
              onClick={() => setCurrentView('player')}
              className={`transition-colors hover:text-rose-400 flex items-center gap-1.5 whitespace-nowrap ${currentView === 'player' ? 'text-rose-400 font-semibold' : 'text-zinc-300'}`}
            >
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              Watch Live
            </button>
          )}

          <a
            href="#about-section"
            onClick={(e) => {
              if (currentView !== 'home') {
                e.preventDefault();
                setCurrentView('home');
                setTimeout(() => {
                  document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="transition-colors hover:text-white whitespace-nowrap"
          >
            About Bilal
          </a>

          <a
            href="#past-streams"
            onClick={(e) => {
              if (currentView !== 'home') {
                e.preventDefault();
                setCurrentView('home');
                setTimeout(() => {
                  document.getElementById('past-streams')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="transition-colors hover:text-white whitespace-nowrap"
          >
            Broadcast Archive
          </a>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {liveStatus.isLive && currentView !== 'player' && (
            <button
              onClick={() => setCurrentView('player')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-950/40 active:scale-95 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch Now
            </button>
          )}

          {isAdminLoggedIn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('admin-studio')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  currentView === 'admin-studio'
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-rose-500" />
                Live Studio
              </button>
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  currentView === 'admin-dashboard'
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Admin
              </button>
              <button
                onClick={onLogout}
                className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
                title="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentView('admin-login')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              Creator Portal
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
