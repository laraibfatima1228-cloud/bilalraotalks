/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Radio,
  Play,
  Eye,
  Calendar,
  Sparkles,
  Share2,
  Clock,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { LiveIndicatorBanner } from './components/LiveIndicatorBanner.tsx';
import { LivePlayer } from './components/LivePlayer.tsx';
import { LiveChat } from './components/LiveChat.tsx';
import { AboutSection } from './components/AboutSection.tsx';
import { StreamHistory } from './components/StreamHistory.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminLogin } from './pages/AdminLogin.tsx';
import { AdminLiveStudio } from './pages/AdminLiveStudio.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { realtimeSocket } from './lib/socket.ts';
import {
  LiveStatus,
  StreamSettings,
  AdminProfile,
  LiveComment,
  LiveQuestion,
  LiveSession,
  FloatingReaction,
  ReactionType
} from './types.ts';

type AppView = 'home' | 'player' | 'admin-login' | 'admin-studio' | 'admin-dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('bilal_admin_token'));
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  // Real-time Platform States
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({
    isLive: false,
    activeSessionId: null,
    title: 'Bilal Rao Live Broadcast',
    description: 'Welcome to the official live streaming platform of Bilal Rao.',
    thumbnailUrl: '/src/assets/images/studio_standby_1794131977087.jpg',
    startedAt: null,
    currentViewers: 0,
    updatedAt: new Date().toISOString()
  });

  const [settings, setSettings] = useState<StreamSettings>({
    id: 'default',
    platformName: 'BILAL RAO LIVE',
    tagline: 'Official Real-Time Live Broadcasting Hub',
    chatEnabled: true,
    questionsEnabled: true,
    reactionsEnabled: true,
    slowModeSeconds: 2,
    maxMessageLength: 280,
    notificationEmail: 'bilal@bilalrao.live',
    updatedAt: new Date().toISOString()
  });

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [reactions, setReactions] = useState<Record<string, number>>({
    heart: 0,
    fire: 0,
    clap: 0,
    laugh: 0,
    hearteyes: 0,
    thumbsup: 0
  });

  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Persistent viewer identity for anonymous participation
  const [viewerId] = useState<string>(() => {
    let id = localStorage.getItem('bilal_viewer_id');
    if (!id) {
      id = `v_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('bilal_viewer_id', id);
    }
    return id;
  });

  const [viewerName, setViewerNameState] = useState<string>(() => {
    let name = localStorage.getItem('bilal_viewer_name');
    if (!name) {
      name = `Viewer #${Math.floor(100 + Math.random() * 900)}`;
      localStorage.setItem('bilal_viewer_name', name);
    }
    return name;
  });

  const setViewerName = (name: string) => {
    setViewerNameState(name);
    localStorage.setItem('bilal_viewer_name', name);
  };

  // URL Route Synchronization
  useEffect(() => {
    const syncRouteFromPath = () => {
      const path = window.location.pathname;
      if (path === '/admin/login' || path === '/admin') {
        setCurrentView('admin-login');
      } else if (path === '/admin/studio') {
        setCurrentView(adminToken ? 'admin-studio' : 'admin-login');
      } else if (path === '/admin/dashboard') {
        setCurrentView(adminToken ? 'admin-dashboard' : 'admin-login');
      } else if (path === '/live') {
        setCurrentView('player');
      }
    };

    syncRouteFromPath();
    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, [adminToken]);

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    let newPath = '/';
    if (view === 'player') newPath = '/live';
    else if (view === 'admin-login') newPath = '/admin/login';
    else if (view === 'admin-studio') newPath = '/admin/studio';
    else if (view === 'admin-dashboard') newPath = '/admin/dashboard';
    window.history.pushState(null, '', newPath);
  };

  // Initial Data Fetch
  useEffect(() => {
    fetch('/api/public/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.status) setLiveStatus(data.status);
        if (data.profile) setAdminProfile(data.profile);
        if (data.settings) setSettings(data.settings);
      })
      .catch((e) => console.warn('Failed to load initial status', e));

    fetch('/api/public/sessions')
      .then((r) => r.json())
      .then((data) => {
        if (data.sessions) setSessions(data.sessions);
      })
      .catch((e) => console.warn('Failed to load sessions', e));

    // Verify admin token if stored
    if (adminToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
        .then((r) => {
          if (!r.ok) throw new Error('Token expired');
          return r.json();
        })
        .then((data) => {
          if (data.profile) setAdminProfile(data.profile);
        })
        .catch(() => {
          setAdminToken(null);
          localStorage.removeItem('bilal_admin_token');
        });
    }
  }, []);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const unsubInit = realtimeSocket.on('init', (data) => {
      if (data?.status) setLiveStatus(data.status);
      if (data?.settings) setSettings(data.settings);
      if (data?.profile) setAdminProfile(data.profile);
      if (data?.comments) setComments(data.comments);
      if (data?.questions) setQuestions(data.questions);
      if (data?.reactions) setReactions(data.reactions);
    });

    const unsubStreamStarted = realtimeSocket.on('stream:started', (data) => {
      setLiveStatus(data.status);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    });

    const unsubStreamEnded = realtimeSocket.on('stream:ended', (data) => {
      setLiveStatus(data.status);
      if (data.endedSession) {
        setSessions((prev) => [data.endedSession, ...prev.filter((s) => s.id !== data.endedSession.id)]);
      }
    });

    const unsubViewerCount = realtimeSocket.on('viewer_count_update', (data) => {
      setLiveStatus((prev) => ({
        ...prev,
        currentViewers: data.count
      }));
    });

    const unsubChatNew = realtimeSocket.on('chat:new', (data) => {
      setComments((prev) => [...prev, data.comment]);
    });

    const unsubChatDelete = realtimeSocket.on('comment:deleted', (data) => {
      setComments((prev) => prev.filter((c) => c.id !== data.commentId));
    });

    const unsubChatPin = realtimeSocket.on('comment:pinned', (data) => {
      setComments((prev) =>
        prev.map((c) => ({
          ...c,
          isPinned: c.id === data.comment?.id ? data.comment.isPinned : false
        }))
      );
    });

    const unsubQuestionNew = realtimeSocket.on('question:new', (data) => {
      setQuestions((prev) => [data.question, ...prev]);
    });

    const unsubQuestionHighlight = realtimeSocket.on('question:highlighted', (data) => {
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          isHighlighted: q.id === data.question?.id ? data.question.isHighlighted : false
        }))
      );
    });

    const unsubQuestionAnswer = realtimeSocket.on('question:answered', (data) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === data.question?.id ? { ...q, isAnswered: data.question.isAnswered } : q))
      );
    });

    const unsubReaction = realtimeSocket.on('reaction:burst', (data) => {
      if (data.reactions) setReactions(data.reactions);

      // Trigger floating emoji animation on player
      const emojiMap: Record<ReactionType, string> = {
        heart: '❤️',
        fire: '🔥',
        clap: '👏',
        laugh: '😂',
        hearteyes: '😍',
        thumbsup: '👍'
      };

      const newReaction: FloatingReaction = {
        id: `react_${Date.now()}_${Math.random()}`,
        type: data.reactionType,
        emoji: emojiMap[data.reactionType as ReactionType] || '❤️',
        leftPercent: 65 + Math.random() * 26 // Float up on right side of player
      };

      setFloatingReactions((prev) => [...prev.slice(-15), newReaction]);

      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2300);
    });

    const unsubProfile = realtimeSocket.on('profile:updated', (data) => {
      if (data) setAdminProfile(data);
    });

    const unsubSettings = realtimeSocket.on('settings:updated', (data) => {
      if (data) setSettings(data);
    });

    return () => {
      unsubInit();
      unsubStreamStarted();
      unsubStreamEnded();
      unsubViewerCount();
      unsubChatNew();
      unsubChatDelete();
      unsubChatPin();
      unsubQuestionNew();
      unsubQuestionHighlight();
      unsubQuestionAnswer();
      unsubReaction();
      unsubProfile();
      unsubSettings();
    };
  }, []);

  const handleSendReaction = (type: ReactionType) => {
    realtimeSocket.send('reaction:send', { type });
  };

  const handleLoginSuccess = (token: string, profile: AdminProfile) => {
    setAdminToken(token);
    setAdminProfile(profile);
    localStorage.setItem('bilal_admin_token', token);
    navigateTo('admin-studio');
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('bilal_admin_token');
    navigateTo('home');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        liveStatus={liveStatus}
        currentView={currentView}
        setCurrentView={navigateTo}
        isAdminLoggedIn={Boolean(adminToken)}
        onLogout={handleLogout}
      />

      {/* Prominent Red LIVE NOW Banner (Only visible when Bilal Rao is streaming) */}
      {currentView === 'home' && (
        <LiveIndicatorBanner
          liveStatus={liveStatus}
          onWatchLive={() => navigateTo('player')}
        />
      )}

      {/* View Router */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: PUBLIC HOMEPAGE */}
        {currentView === 'home' && (
          <div className="flex-1 flex flex-col">
            
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-zinc-900">
              {/* Background ambient lighting */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
                
                {/* Status Indicator */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium">
                  {liveStatus.isLive ? (
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Broadcasting Live Right Now
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2 h-2 rounded-full bg-zinc-600" />
                      Currently Offline · Join Broadcast Notifications
                    </span>
                  )}
                </div>

                {/* Hero Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.08] font-heading">
                  Real-Time Tech Discussions with{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-red-500 to-rose-400">
                    Bilal Rao
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                  Join exclusive live broadcasts, participate in real-time interactive Q&A sessions, send instant reactions, and explore engineering frontiers together.
                </p>

                {/* Main Hero CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {liveStatus.isLive ? (
                    <button
                      onClick={() => navigateTo('player')}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-xl shadow-rose-950/60 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Watch Bilal Rao Live Now</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 max-w-md w-full flex items-center justify-between gap-3 text-left">
                      <div>
                        <span className="text-xs font-semibold text-white block">Next Scheduled Stream</span>
                        <span className="text-[11px] text-zinc-400">Next Live: Every Wednesday & Sunday at 8 PM</span>
                      </div>
                      <a
                        href="#about-section"
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium whitespace-nowrap transition-colors"
                      >
                        About Bilal
                      </a>
                    </div>
                  )}

                  <a
                    href="#past-streams"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Browse Stream Archives</span>
                  </a>
                </div>

                {/* Offline Standby Notice when not live */}
                {!liveStatus.isLive && (
                  <div className="pt-8 max-w-xl mx-auto">
                    <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                        <Radio className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Broadcast Status: Offline</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Bilal is currently off the air. The moment Bilal starts broadcasting from his mobile phone, this page will update in real time with an active stream player.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </section>

            {/* About Section */}
            <AboutSection
              profile={adminProfile}
              onWatchOrCheckLive={() => navigateTo('player')}
              isLive={liveStatus.isLive}
            />

            {/* Stream History */}
            <StreamHistory sessions={sessions} />

          </div>
        )}

        {/* VIEW 2: THEATER LIVE BROADCAST PLAYER */}
        {currentView === 'player' && (
          <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 flex flex-col">
            
            {/* Top Return Header */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => navigateTo('home')}
                className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                ← Back to Homepage
              </button>

              <div className="flex items-center gap-2 text-xs">
                {liveStatus.isLive ? (
                  <span className="inline-flex items-center gap-1.5 text-rose-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Live Transmission Active
                  </span>
                ) : (
                  <span className="text-zinc-500">Offline Standby</span>
                )}
              </div>
            </div>

            {/* Theater 2-Column Split: Player (Left) + Chat & Q&A (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
              
              {/* Video Player Column */}
              <div className="lg:col-span-8 flex flex-col">
                <LivePlayer
                  liveStatus={liveStatus}
                  settings={settings}
                  viewerId={viewerId}
                  viewerName={viewerName}
                  reactions={floatingReactions}
                  onBackToHome={() => navigateTo('home')}
                />
              </div>

              {/* Chat & Questions Column */}
              <div className="lg:col-span-4 h-[580px] lg:h-[650px]">
                <LiveChat
                  comments={comments}
                  questions={questions}
                  reactions={reactions}
                  settings={settings}
                  viewerId={viewerId}
                  viewerName={viewerName}
                  setViewerName={setViewerName}
                  isAdmin={Boolean(adminToken)}
                  onSendReaction={handleSendReaction}
                  onDeleteComment={(id) => {
                    fetch('/api/admin/moderation/delete-comment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify({ commentId: id })
                    });
                  }}
                  onPinComment={(id, isPinned) => {
                    fetch('/api/admin/moderation/pin-comment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify({ commentId: id, isPinned })
                    });
                  }}
                  onHighlightQuestion={(id, isHighlighted) => {
                    fetch('/api/admin/moderation/highlight-question', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify({ questionId: id, isHighlighted })
                    });
                  }}
                  onAnswerQuestion={(id, isAnswered) => {
                    fetch('/api/admin/moderation/answer-question', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify({ questionId: id, isAnswered })
                    });
                  }}
                  onBlockViewer={(vId, vName) => {
                    fetch('/api/admin/moderation/block-viewer', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                      body: JSON.stringify({ viewerId: vId, viewerName: vName, reason: 'Abuse' })
                    });
                  }}
                />
              </div>

            </div>

          </div>
        )}

        {/* VIEW 3: ADMIN LOGIN & MASTER SETUP */}
        {currentView === 'admin-login' && (
          <AdminLogin
            onLoginSuccess={handleLoginSuccess}
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {/* VIEW 4: ADMIN LIVE STUDIO (BROADCASTER MOBILE & DESKTOP) */}
        {currentView === 'admin-studio' && adminToken && (
          <AdminLiveStudio
            token={adminToken}
            liveStatus={liveStatus}
            comments={comments}
            questions={questions}
            reactions={reactions}
            onStreamStarted={(status) => setLiveStatus(status)}
            onStreamEnded={(session) => {
              setLiveStatus({
                isLive: false,
                activeSessionId: null,
                title: 'Bilal Rao is Offline',
                description: 'Broadcast has ended.',
                thumbnailUrl: '/src/assets/images/studio_standby_1794131977087.jpg',
                startedAt: null,
                currentViewers: liveStatus.currentViewers,
                updatedAt: new Date().toISOString()
              });
              if (session) {
                setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
              }
            }}
            onNavigateToDashboard={() => navigateTo('admin-dashboard')}
          />
        )}

        {/* VIEW 5: ADMIN DASHBOARD */}
        {currentView === 'admin-dashboard' && adminToken && (
          <AdminDashboard
            token={adminToken}
            profile={adminProfile}
            onProfileUpdated={(updated) => setAdminProfile(updated)}
            onOpenStudio={() => navigateTo('admin-studio')}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onAdminClick={() => navigateTo(adminToken ? 'admin-dashboard' : 'admin-login')}
        isAdminLoggedIn={Boolean(adminToken)}
      />
    </div>
  );
}
