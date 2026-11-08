import React from 'react';
import { Lock, Radio, Shield } from 'lucide-react';

interface FooterProps {
  onAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onAdminClick, isAdminLoggedIn }) => {
  return (
    <footer className="border-t border-zinc-900 bg-[#09090b] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2">
            <span className="font-heading font-black tracking-wider text-base text-white">
              BILAL RAO <span className="text-rose-500">LIVE</span>
            </span>
            <span className="text-zinc-600">·</span>
            <p className="text-xs text-zinc-500">
              © {new Date().getFullYear()} Bilal Rao. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <a href="#about-section" className="hover:text-white transition-colors">
              About
            </a>
            <a href="#past-streams" className="hover:text-white transition-colors">
              Archives
            </a>
            <button
              onClick={onAdminClick}
              className="hover:text-rose-400 transition-colors flex items-center gap-1.5 text-zinc-500"
            >
              {isAdminLoggedIn ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Creator Dashboard
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Admin Portal
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
};
