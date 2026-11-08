import React from 'react';
import { Youtube, Twitter, Instagram, Linkedin, Radio, Award, Globe, Video } from 'lucide-react';
import { AdminProfile } from '../types.ts';

interface AboutSectionProps {
  profile: AdminProfile | null;
  onWatchOrCheckLive: () => void;
  isLive: boolean;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  profile,
  onWatchOrCheckLive,
  isLive
}) => {
  const avatarUrl = profile?.avatarUrl || '/src/assets/images/bilal_rao_portrait_1794131975933.jpg';
  const displayName = profile?.displayName || 'Bilal Rao';
  const headline = profile?.headline || 'Tech Broadcaster, Creator & Full-Stack Engineer';
  const bio =
    profile?.bio ||
    'Welcome to my official live broadcasting platform. I bring you weekly live technical deep-dives, real-world engineering discussions, interactive audience Q&A sessions, and insights into future technologies.';

  const socialLinks = profile?.socialLinks || {
    youtube: 'https://youtube.com/@bilalrao',
    x: 'https://x.com/bilalrao',
    instagram: 'https://instagram.com/bilalrao',
    linkedin: 'https://linkedin.com/in/bilalrao'
  };

  return (
    <section id="about-section" className="py-16 sm:py-24 border-t border-zinc-900 bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Portrait Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative studio glow behind portrait */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-rose-600/20 via-zinc-800/10 to-transparent rounded-3xl blur-2xl" />
              
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900 aspect-square">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Overlaid status badge */}
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-zinc-700/50 flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold text-sm">{displayName}</div>
                    <div className="text-xs text-zinc-400">Broadcaster & Host</div>
                  </div>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-600 text-white animate-pulse">
                      ON AIR NOW
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300">
                      Off-Air
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Credentials Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold tracking-widest text-rose-500 uppercase">
                Creator Profile
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                About {displayName}
              </h2>
              <p className="text-lg text-rose-300/90 font-medium">
                {headline}
              </p>
            </div>

            <p className="text-zinc-400 leading-relaxed text-base">
              {bio}
            </p>

            {/* Quick Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-900">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-2">
                  <Video className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white">Live Broadcasts</h4>
                <p className="text-xs text-zinc-400 mt-1">Direct interactive streaming straight from my mobile studio to you.</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-2">
                  <Globe className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white">Global Reach</h4>
                <p className="text-xs text-zinc-400 mt-1">Connecting with engineers, creators, and enthusiasts worldwide.</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-2">
                  <Award className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white">Real-Time Q&A</h4>
                <p className="text-xs text-zinc-400 mt-1">Your questions answered on air without artificial delays or gatekeeping.</p>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-500 font-medium mr-2">Connect with Bilal:</span>
              
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
                >
                  <Youtube className="w-4 h-4 text-red-500" />
                  YouTube
                </a>
              )}

              {socialLinks.x && (
                <a
                  href={socialLinks.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
                >
                  <Twitter className="w-4 h-4 text-sky-400" />
                  X (Twitter)
                </a>
              )}

              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
                >
                  <Instagram className="w-4 h-4 text-pink-400" />
                  Instagram
                </a>
              )}

              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-blue-400" />
                  LinkedIn
                </a>
              )}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
