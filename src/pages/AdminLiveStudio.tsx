import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Camera,
  RefreshCw,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Play,
  Square,
  Users,
  Clock,
  Sparkles,
  Settings,
  MessageSquare,
  HelpCircle,
  Pin,
  Trash2,
  ShieldAlert,
  AlertCircle,
  Activity,
  CheckCircle2,
  X
} from 'lucide-react';
import { BroadcasterStreamManager } from '../lib/webrtc.ts';
import { realtimeSocket } from '../lib/socket.ts';
import { LiveStatus, LiveComment, LiveQuestion, StreamSettings } from '../types.ts';

interface AdminLiveStudioProps {
  token: string;
  liveStatus: LiveStatus;
  comments: LiveComment[];
  questions: LiveQuestion[];
  reactions: Record<string, number>;
  onStreamStarted: (status: LiveStatus) => void;
  onStreamEnded: (session: any) => void;
  onNavigateToDashboard: () => void;
}

export const AdminLiveStudio: React.FC<AdminLiveStudioProps> = ({
  token,
  liveStatus,
  comments,
  questions,
  reactions,
  onStreamStarted,
  onStreamEnded,
  onNavigateToDashboard
}) => {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamManagerRef = useRef<BroadcasterStreamManager | null>(null);

  // Broadcaster Media State
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Pre-flight stream configuration
  const [streamTitle, setStreamTitle] = useState('Bilal Rao Live – Tech & Innovation Talk');
  const [streamDesc, setStreamDesc] = useState('Interactive broadcast streaming directly from my mobile studio.');
  const [selectedThumbnail, setSelectedThumbnail] = useState('/src/assets/images/studio_standby_1794131977087.jpg');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Broadcast state
  const [isConnecting, setIsConnecting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [durationString, setDurationString] = useState('00:00:00');
  const [activeTab, setActiveTab] = useState<'chat' | 'questions'>('chat');
  const [showEndModal, setShowEndModal] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<any | null>(null);

  // Initialize camera and microphone
  useEffect(() => {
    const manager = new BroadcasterStreamManager();
    streamManagerRef.current = manager;

    const startCamera = async () => {
      try {
        setMediaError(null);
        const stream = await manager.initMedia(true);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
        setHasMediaPermission(true);
      } catch (err: any) {
        console.error('Camera access error:', err);
        setMediaError(err.message || 'Camera or microphone access denied. Please allow permissions in your mobile browser.');
      }
    };

    startCamera();

    // Audio level meter loop
    const audioInterval = setInterval(() => {
      if (streamManagerRef.current) {
        const lvl = streamManagerRef.current.getAudioLevel();
        setAudioLevel(lvl);
      }
    }, 100);

    // Register as authenticated broadcaster on WebSocket
    realtimeSocket.send('broadcaster:register', { token });

    // Handle incoming viewers requesting WebRTC connection
    const unsubViewerJoined = realtimeSocket.on('webrtc:viewer-joined', (data) => {
      if (data?.viewerId && streamManagerRef.current) {
        streamManagerRef.current.handleViewerJoined(data.viewerId);
      }
    });

    const unsubAnswer = realtimeSocket.on('webrtc:answer', (data) => {
      if (data?.viewerId && data?.sdp && streamManagerRef.current) {
        streamManagerRef.current.handleAnswer(data.viewerId, data.sdp);
      }
    });

    const unsubIce = realtimeSocket.on('webrtc:ice-candidate', (data) => {
      if (data?.candidate && streamManagerRef.current) {
        streamManagerRef.current.handleIceCandidate(data.candidate);
      }
    });

    const unsubViewerLeft = realtimeSocket.on('webrtc:viewer-left', (data) => {
      if (data?.viewerId && streamManagerRef.current) {
        streamManagerRef.current.handleViewerLeft(data.viewerId);
      }
    });

    return () => {
      clearInterval(audioInterval);
      unsubViewerJoined();
      unsubAnswer();
      unsubIce();
      unsubViewerLeft();
      manager.stopMedia();
    };
  }, [token]);

  // Stream duration ticker when LIVE
  useEffect(() => {
    if (!liveStatus.isLive || !liveStatus.startedAt) {
      setDurationString('00:00:00');
      return;
    }
    const interval = setInterval(() => {
      const start = new Date(liveStatus.startedAt!).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
      const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setDurationString(`${hours}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [liveStatus.isLive, liveStatus.startedAt]);

  // Flip camera (Front vs Back)
  const handleFlipCamera = async () => {
    if (!streamManagerRef.current) return;
    try {
      const newStream = await streamManagerRef.current.switchCamera();
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream;
      }
      setIsFrontCamera(streamManagerRef.current.isUsingFrontCamera());
    } catch (err: any) {
      setMediaError('Could not switch camera: ' + err.message);
    }
  };

  // Mic mute
  const handleToggleMic = () => {
    if (!streamManagerRef.current) return;
    const muted = streamManagerRef.current.toggleMuteMic();
    setIsMicMuted(muted);
  };

  // Video mute
  const handleToggleVideo = () => {
    if (!streamManagerRef.current) return;
    const muted = streamManagerRef.current.toggleMuteCam();
    setIsVideoMuted(muted);
  };

  // Start broadcast process
  const triggerStartLive = () => {
    setCountdown(3);
    const countTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countTimer);
          executeStartLive();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeStartLive = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/admin/stream/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: streamTitle,
          description: streamDesc,
          thumbnailUrl: selectedThumbnail
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start stream');

      onStreamStarted(data.status);
    } catch (err: any) {
      setMediaError(err.message || 'Error starting broadcast');
    } finally {
      setIsConnecting(false);
    }
  };

  // End broadcast
  const handleEndLive = async () => {
    try {
      const res = await fetch('/api/admin/stream/end', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setShowEndModal(false);
      setSessionSummary(data.endedSession);
      onStreamEnded(data.endedSession);
    } catch (err: any) {
      setMediaError(err.message || 'Error ending broadcast');
    }
  };

  // Moderation handlers
  const handlePin = async (commentId: string, isPinned: boolean) => {
    await fetch('/api/admin/moderation/pin-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ commentId, isPinned })
    });
  };

  const handleDelete = async (commentId: string) => {
    await fetch('/api/admin/moderation/delete-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ commentId })
    });
  };

  const handleHighlightQuestion = async (questionId: string, isHighlighted: boolean) => {
    await fetch('/api/admin/moderation/highlight-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questionId, isHighlighted })
    });
  };

  const handleAnswerQuestion = async (questionId: string, isAnswered: boolean) => {
    await fetch('/api/admin/moderation/answer-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questionId, isAnswered })
    });
  };

  const handleBlock = async (viewerId: string, viewerName: string) => {
    if (confirm(`Block ${viewerName} from sending messages?`)) {
      await fetch('/api/admin/moderation/block-viewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ viewerId, viewerName, reason: 'Abusive language' })
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090b] text-white p-3 sm:p-6 flex flex-col">
      
      {/* Studio Top Control Bar */}
      <div className="max-w-7xl mx-auto w-full mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#121215] p-3 sm:p-4 rounded-2xl border border-zinc-800">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-500">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-white">
                Live Studio
              </h1>
              {liveStatus.isLive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                  ON AIR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                  READY
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-md">
              {liveStatus.isLive ? liveStatus.title : 'Configure your stream and click Start Broadcast'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!liveStatus.isLive ? (
            <>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span className="hidden sm:inline">Stream Setup</span>
              </button>

              <button
                onClick={triggerStartLive}
                disabled={isConnecting || !hasMediaPermission}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Go Live</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowEndModal(true)}
              className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-red-950/60 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Live Stream</span>
            </button>
          )}

          <button
            onClick={onNavigateToDashboard}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            title="Dashboard"
          >
            Dashboard
          </button>
        </div>

      </div>

      {/* Main Studio Viewport Grid */}
      <div className="max-w-7xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Broadcaster Camera & Studio HUD (Left 8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* Camera Viewport */}
          <div className="relative w-full aspect-video sm:aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
            
            {/* Live Camera Video Feed */}
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted // Always mute locally to prevent mic feedback
              className={`w-full h-full object-cover transition-transform ${
                isFrontCamera ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Visual countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-40">
                <span className="text-8xl sm:text-9xl font-black text-rose-500 font-heading animate-pulse">
                  {countdown}
                </span>
                <p className="text-sm font-semibold text-white tracking-widest uppercase mt-4">
                  Going Live in...
                </p>
              </div>
            )}

            {/* Error Overlay if camera permission fails */}
            {mediaError && (
              <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center z-30 space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <h3 className="text-lg font-bold text-white">Camera Access Required</h3>
                <p className="text-xs text-zinc-400 max-w-sm">{mediaError}</p>
                <button
                  onClick={() => streamManagerRef.current?.initMedia(isFrontCamera)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white"
                >
                  Retry Camera Permissions
                </button>
              </div>
            )}

            {/* Top Studio HUD: Live State, Duration, Viewers */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
              <div className="flex items-center gap-2">
                {liveStatus.isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-600 text-white shadow-lg pointer-events-auto animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    LIVE ON AIR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900/90 text-zinc-300 border border-zinc-700/60 pointer-events-auto">
                    Camera Preview
                  </span>
                )}

                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-black/70 backdrop-blur-md text-zinc-300 border border-zinc-800 tabular-nums pointer-events-auto">
                  <Clock className="w-3 h-3 inline mr-1 text-zinc-400" />
                  {durationString}
                </span>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-black/70 backdrop-blur-md text-white border border-zinc-800 tabular-nums">
                  <Users className="w-3.5 h-3.5 text-rose-400" />
                  {liveStatus.currentViewers} Viewers
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-black/70 backdrop-blur-md text-emerald-400 border border-zinc-800">
                  <Activity className="w-3.5 h-3.5" />
                  HD 720p
                </span>
              </div>
            </div>

            {/* Bottom Floating Broadcaster Toolbar (Touch Optimized for Mobile) */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-20">
              {/* Mic Level Visualizer */}
              <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-zinc-800 flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">MIC:</span>
                <div className="w-16 sm:w-24 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioLevel > 60
                        ? 'bg-rose-500'
                        : audioLevel > 25
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, audioLevel)}%` }}
                  />
                </div>
              </div>

              {/* Hardware Quick Toggles */}
              <div className="flex items-center gap-2">
                {/* Switch Camera: Front / Rear */}
                <button
                  onClick={handleFlipCamera}
                  className="p-2.5 sm:px-3 sm:py-2 rounded-xl bg-black/80 hover:bg-zinc-800 active:scale-90 border border-zinc-700/80 text-white flex items-center gap-1.5 text-xs font-medium transition-all"
                  title="Switch between front and rear cameras"
                >
                  <RefreshCw className="w-4 h-4 text-zinc-300" />
                  <span className="hidden sm:inline">
                    {isFrontCamera ? 'Front Cam' : 'Rear Cam'}
                  </span>
                </button>

                {/* Mic Mute Toggle */}
                <button
                  onClick={handleToggleMic}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isMicMuted
                      ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                      : 'bg-black/80 border-zinc-700/80 text-white hover:bg-zinc-800'
                  }`}
                  title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Video Mute Toggle */}
                <button
                  onClick={handleToggleVideo}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isVideoMuted
                      ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                      : 'bg-black/80 border-zinc-700/80 text-white hover:bg-zinc-800'
                  }`}
                  title={isVideoMuted ? 'Resume Video' : 'Turn Off Video'}
                >
                  {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              </div>

            </div>

          </div>

          {/* Quick Reaction Monitor Strip */}
          <div className="p-3 bg-[#121215] rounded-xl border border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
            <span className="text-zinc-500 font-medium text-[11px] uppercase tracking-wider">
              Audience Reactions Received:
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">❤️ <b className="text-white tabular-nums">{reactions.heart || 0}</b></span>
              <span className="flex items-center gap-1">🔥 <b className="text-white tabular-nums">{reactions.fire || 0}</b></span>
              <span className="flex items-center gap-1">👏 <b className="text-white tabular-nums">{reactions.clap || 0}</b></span>
              <span className="flex items-center gap-1">😂 <b className="text-white tabular-nums">{reactions.laugh || 0}</b></span>
              <span className="flex items-center gap-1">😍 <b className="text-white tabular-nums">{reactions.hearteyes || 0}</b></span>
              <span className="flex items-center gap-1">👍 <b className="text-white tabular-nums">{reactions.thumbsup || 0}</b></span>
            </div>
          </div>

        </div>

        {/* Live Moderation & Q&A Panel (Right 4 Cols) */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-[460px]">
          
          <div className="flex-1 bg-[#121215] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
            
            {/* Header Tabs */}
            <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-1 p-1 bg-black rounded-lg border border-zinc-800">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'chat'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat Moderation</span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">({comments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('questions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'questions'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Live Q&A</span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">({questions.length})</span>
                </button>
              </div>

              <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Real-Time
              </div>
            </div>

            {/* Moderation Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {activeTab === 'chat' ? (
                comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
                    <p className="text-xs text-zinc-400">No incoming comments</p>
                    <p className="text-[11px] text-zinc-500">Messages will appear here live with instant moderation actions.</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="group p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 flex items-start justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="space-y-0.5 max-w-[78%]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-200">{c.viewerName}</span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-zinc-300 text-sm">{c.message}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePin(c.id, !c.isPinned)}
                          className={`p-1 rounded hover:bg-zinc-800 ${c.isPinned ? 'text-rose-400' : 'text-zinc-400'}`}
                          title={c.isPinned ? 'Unpin' : 'Pin to top of viewer screen'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleBlock(c.viewerId, c.viewerName)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-800"
                          title="Block user from chatting"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                questions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                    <HelpCircle className="w-8 h-8 mb-2 opacity-40 text-rose-400" />
                    <p className="text-xs text-zinc-400">No audience questions yet</p>
                    <p className="text-[11px] text-zinc-500">When viewers submit questions, you can spotlight them on stream.</p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <div
                      key={q.id}
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                        q.isHighlighted
                          ? 'bg-amber-950/40 border-amber-800'
                          : q.isAnswered
                          ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60'
                          : 'bg-zinc-900/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">{q.viewerName}</span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-white">{q.question}</p>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/80">
                        <button
                          onClick={() => handleHighlightQuestion(q.id, !q.isHighlighted)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            q.isHighlighted
                              ? 'bg-amber-500 text-black'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {q.isHighlighted ? 'Spotlight Active' : 'Spotlight on Stream'}
                        </button>

                        <button
                          onClick={() => handleAnswerQuestion(q.id, !q.isAnswered)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            q.isAnswered
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {q.isAnswered ? 'Answered' : 'Mark Done'}
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Quick Broadcaster Message Bar */}
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Send message to stream as Bilal Rao..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    realtimeSocket.send('chat:send', {
                      viewerId: 'bilal_rao_admin',
                      viewerName: 'Bilal Rao (Host)',
                      message: (e.target as HTMLInputElement).value.trim()
                    });
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

          </div>

        </div>

      </div>

      {/* Stream Pre-flight Setup Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-rose-500" />
                Live Broadcast Details
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Live Stream Title
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="e.g. Building Next-Gen WebRTC & Live Systems"
                  className="w-full px-3 py-2 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Description & Topics
                </label>
                <textarea
                  rows={3}
                  value={streamDesc}
                  onChange={(e) => setStreamDesc(e.target.value)}
                  placeholder="Tell your viewers what you will talk about today..."
                  className="w-full px-3 py-2 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Select Stream Poster / Thumbnail
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setSelectedThumbnail('/src/assets/images/studio_standby_1794131977087.jpg')}
                    className={`relative aspect-video rounded-lg overflow-hidden border cursor-pointer ${
                      selectedThumbnail === '/src/assets/images/studio_standby_1794131977087.jpg'
                        ? 'border-rose-500 ring-2 ring-rose-500/40'
                        : 'border-zinc-800 opacity-60'
                    }`}
                  >
                    <img
                      src="/src/assets/images/studio_standby_1794131977087.jpg"
                      alt="Studio"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white">
                      Studio Standby
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedThumbnail('/src/assets/images/broadcast_highlight_1794131976835.jpg')}
                    className={`relative aspect-video rounded-lg overflow-hidden border cursor-pointer ${
                      selectedThumbnail === '/src/assets/images/broadcast_highlight_1794131976835.jpg'
                        ? 'border-rose-500 ring-2 ring-rose-500/40'
                        : 'border-zinc-800 opacity-60'
                    }`}
                  >
                    <img
                      src="/src/assets/images/broadcast_highlight_1794131976835.jpg"
                      alt="Control Room"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white">
                      Broadcast Hub
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* End Stream Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800/80 flex items-center justify-center mx-auto text-red-500">
              <Square className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-base font-bold text-white">End Live Broadcast?</h3>
            <p className="text-xs text-zinc-400">
              This will stop publishing video and audio immediately, notify all connected viewers, and conclude the session record.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleEndLive}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Yes, End Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stream Summary Recap Dialog */}
      {sessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Broadcast Concluded</h3>
              <p className="text-xs text-zinc-400">
                Great stream, Bilal! Your broadcast stats have been saved to your archive.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Total Duration</span>
                <span className="text-base font-bold text-white font-mono tabular-nums">
                  {Math.floor((sessionSummary.durationSeconds || 0) / 60)} min { (sessionSummary.durationSeconds || 0) % 60} sec
                </span>
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Peak Audience</span>
                <span className="text-base font-bold text-white font-mono tabular-nums">
                  {sessionSummary.peakViewers || 0} Viewers
                </span>
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Comments</span>
                <span className="text-base font-bold text-white font-mono tabular-nums">
                  {sessionSummary.totalComments || 0}
                </span>
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Reactions</span>
                <span className="text-base font-bold text-white font-mono tabular-nums">
                  {sessionSummary.totalReactions || 0}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setSessionSummary(null);
                onNavigateToDashboard();
              }}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
            >
              Go to Creator Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
