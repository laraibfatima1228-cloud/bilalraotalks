import React from 'react';
import { Calendar, Clock, Users, MessageSquare, Play, Video } from 'lucide-react';
import { LiveSession } from '../types.ts';

interface StreamHistoryProps {
  sessions: LiveSession[];
  onOpenSession?: (session: LiveSession) => void;
}

export const StreamHistory: React.FC<StreamHistoryProps> = ({
  sessions
}) => {
  const endedSessions = sessions.filter((s) => s.status === 'ended');

  return (
    <section id="past-streams" className="py-16 sm:py-24 border-t border-zinc-900 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-widest text-rose-500 uppercase">
              Broadcast Archives
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Past Live Streams & Sessions
            </h2>
            <p className="text-sm text-zinc-400">
              Catch up on previous broadcasts, tech discussions, and community Q&A highlights.
            </p>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            Total Archives: <span className="text-white font-semibold tabular-nums">{endedSessions.length}</span>
          </div>
        </div>

        {/* Sessions Grid */}
        {endedSessions.length === 0 ? (
          <div className="p-12 text-center border border-zinc-900 rounded-2xl bg-zinc-900/30">
            <Video className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-400">No recorded stream archives yet</p>
            <p className="text-xs text-zinc-500 mt-1">Previous live sessions will automatically be catalogued here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {endedSessions.map((session) => {
              const formattedDuration = session.durationSeconds
                ? `${Math.floor(session.durationSeconds / 60)} min`
                : '1 hour';
              const formattedDate = new Date(session.startedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={session.id}
                  className="group rounded-2xl overflow-hidden border border-zinc-800 bg-[#121215] hover:border-zinc-700 transition-all shadow-lg flex flex-col"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                    <img
                      src={session.thumbnailUrl || '/src/assets/images/broadcast_highlight_1794131976835.jpg'}
                      alt={session.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Duration badge */}
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-black/80 text-zinc-200 border border-zinc-700/60 tabular-nums">
                      {formattedDuration}
                    </div>

                    {/* Date badge */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-300 bg-black/70 backdrop-blur-xs">
                      {formattedDate}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-heading font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-rose-400 transition-colors">
                        {session.title}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {session.description || 'Live broadcast with Bilal Rao.'}
                      </p>
                    </div>

                    {/* Metrics Footer */}
                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-rose-500" />
                        {session.peakViewers} peak viewers
                      </span>
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                        {session.totalComments} comments
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
