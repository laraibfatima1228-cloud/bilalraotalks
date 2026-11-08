import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Share2,
  Users,
  Radio,
  Check,
  AlertCircle
} from 'lucide-react';
import { LiveStatus, FloatingReaction, StreamSettings } from '../types.ts';
import { ViewerStreamManager } from '../lib/webrtc.ts';
import { realtimeSocket } from '../lib/socket.ts';

interface LivePlayerProps {
  liveStatus: LiveStatus;
  settings: StreamSettings;
  viewerId: string;
  viewerName: string;
  reactions: FloatingReaction[];
  onBackToHome: () => void;
}

export const LivePlayer: React.FC<LivePlayerProps> = ({
  liveStatus,
  viewerId,
  viewerName,
  reactions,
  onBackToHome
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamManagerRef = useRef<ViewerStreamManager | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [durationString, setDurationString] = useState('00:00:00');
  const [hasCopiedShare, setHasCopiedShare] = useState(false);
  const [hasReceivedVideo, setHasReceivedVideo] = useState(false);

  // Stream duration ticker
  useEffect(() => {
    if (!liveStatus.startedAt || !liveStatus.isLive) {
      setDurationString('00:00:00');
      return;
    }

    const updateTimer = () => {
      const start = new Date(liveStatus.startedAt!).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');
      setDurationString(`${hours}:${minutes}:${seconds}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [liveStatus.startedAt, liveStatus.isLive]);

  // WebRTC viewer setup
  useEffect(() => {
    if (!liveStatus.isLive) return;

    const manager = new ViewerStreamManager(
      (remoteStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play().catch((err) => {
            console.warn('Autoplay blocked, muting first:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().catch(() => {});
            }
          });
          setHasReceivedVideo(true);
          setConnectionState('connected');
        }
      },
      (state) => {
        setConnectionState(state);
      }
    );

    streamManagerRef.current = manager;
    manager.startViewing(viewerId, viewerName);

    // Socket signaling handlers
    const unsubOffer = realtimeSocket.on('webrtc:offer', (data) => {
      if (data?.sdp) {
        manager.handleOffer(data.sdp);
      }
    });

    const unsubIce = realtimeSocket.on('webrtc:ice-candidate', (data) => {
      if (data?.candidate) {
        manager.handleIceCandidate(data.candidate);
      }
    });

    const unsubBroadcasterOffline = realtimeSocket.on('broadcaster:offline', () => {
      setHasReceivedVideo(false);
      setConnectionState('broadcaster-offline');
    });

    return () => {
      unsubOffer();
      unsubIce();
      unsubBroadcasterOffline();
      manager.cleanup();
    };
  }, [liveStatus.isLive, viewerId, viewerName]);

  // Volume & Mute control
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const muted = val === 0;
      videoRef.current.muted = muted;
      setIsMuted(muted);
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Share stream
  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `BILAL RAO LIVE – ${liveStatus.title}`,
        text: `Watch Bilal Rao streaming live now!`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setHasCopiedShare(true);
      setTimeout(() => setHasCopiedShare(false), 2000);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Video Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video sm:aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center group select-none"
      >
        {/* Actual Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            hasReceivedVideo ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Floating Reactions Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-6 text-3xl sm:text-4xl animate-reaction-float select-none"
              style={{ left: `${r.leftPercent}%` }}
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Placeholder / Standby State when video is connecting */}
        {!hasReceivedVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center z-10">
            {liveStatus.thumbnailUrl ? (
              <img
                src={liveStatus.thumbnailUrl}
                alt="Standby"
                className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-xs"
                referrerPolicy="no-referrer"
              />
            ) : null}

            <div className="relative z-10 max-w-md space-y-3">
              {liveStatus.isLive ? (
                <>
                  <div className="w-12 h-12 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-2" />
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800/60 text-xs font-semibold text-rose-300">
                    <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    Connecting to Bilal Rao's Camera Feed...
                  </div>
                  <h3 className="text-lg font-bold text-white">Receiving Real-Time WebRTC Stream</h3>
                  <p className="text-xs text-zinc-400">
                    Ultra-low latency live connection is establishing directly with the broadcaster.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                    <Radio className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Broadcast Concluded</h3>
                  <p className="text-sm text-zinc-400">
                    Bilal Rao is currently offline. Thank you for joining this session!
                  </p>
                  <button
                    onClick={onBackToHome}
                    className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
                  >
                    Return to Homepage
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Top Video HUD: LIVE Badge, Duration & Viewers */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
          <div className="flex items-center gap-2">
            {liveStatus.isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-600 text-white shadow-lg pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            )}

            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-black/60 backdrop-blur-md text-zinc-300 border border-zinc-700/50 tabular-nums pointer-events-auto">
              {durationString}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-black/60 backdrop-blur-md text-white border border-zinc-700/50 tabular-nums pointer-events-auto">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              {liveStatus.currentViewers} watching
            </span>
          </div>
        </div>

        {/* Bottom Control Bar on Hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between opacity-95 group-hover:opacity-100 transition-opacity z-30">
          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Volume Slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-24 accent-rose-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
              title="Volume"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Share stream link"
            >
              {hasCopiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{hasCopiedShare ? 'Link Copied!' : 'Share'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stream Meta Details Bar */}
      <div className="mt-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Broadcaster: Bilal Rao
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs text-zinc-400 font-mono tabular-nums">
              Stream Protocol: Ultra-Low Latency WebRTC
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white">
            {liveStatus.title || 'Bilal Rao Live Stream'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2">
            {liveStatus.description || 'Welcome to the live broadcast! Send your questions, comments, and real-time reactions in the chat panel.'}
          </p>
        </div>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          {hasCopiedShare ? 'Copied to Clipboard' : 'Share Broadcast'}
        </button>
      </div>
    </div>
  );
};
