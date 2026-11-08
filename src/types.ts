export interface AdminProfile {
  id: string;
  email: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  socialLinks: {
    youtube: string;
    x: string;
    instagram: string;
    linkedin: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StreamSettings {
  id: string;
  platformName: string;
  tagline: string;
  chatEnabled: boolean;
  questionsEnabled: boolean;
  reactionsEnabled: boolean;
  slowModeSeconds: number;
  maxMessageLength: number;
  notificationEmail: string;
  updatedAt: string;
}

export interface LiveStatus {
  isLive: boolean;
  activeSessionId: string | null;
  title: string;
  description: string;
  thumbnailUrl: string;
  startedAt: string | null;
  currentViewers: number;
  updatedAt: string;
}

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  status: 'live' | 'ended' | 'scheduled';
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  peakViewers: number;
  totalComments: number;
  totalQuestions: number;
  totalReactions: number;
}

export interface LiveComment {
  id: string;
  sessionId: string;
  viewerId: string;
  viewerName: string;
  message: string;
  createdAt: string;
  isPinned: boolean;
  isDeleted: boolean;
}

export interface LiveQuestion {
  id: string;
  sessionId: string;
  viewerId: string;
  viewerName: string;
  question: string;
  upvotes: number;
  isHighlighted: boolean;
  isAnswered: boolean;
  createdAt: string;
}

export interface BlockedViewer {
  id: string;
  viewerId: string;
  viewerName: string;
  reason: string;
  blockedAt: string;
}

export type ReactionType = 'heart' | 'fire' | 'clap' | 'laugh' | 'hearteyes' | 'thumbsup';

export interface FloatingReaction {
  id: string;
  type: ReactionType;
  emoji: string;
  leftPercent: number;
}
