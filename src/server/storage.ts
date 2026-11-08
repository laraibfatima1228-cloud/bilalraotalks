import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AdminProfile {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
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

export interface DatabaseState {
  admin: AdminProfile | null;
  settings: StreamSettings;
  liveStatus: LiveStatus;
  sessions: LiveSession[];
  comments: LiveComment[];
  questions: LiveQuestion[];
  reactions: Record<string, number>;
  blockedViewers: BlockedViewer[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

class StorageEngine {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read db.json, initializing default state:', e);
    }

    const defaultState: DatabaseState = {
      admin: null, // Initial setup required for owner security
      settings: {
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
      },
      liveStatus: {
        isLive: false,
        activeSessionId: null,
        title: 'Welcome to Bilal Rao Live',
        description: 'Stay tuned for insightful discussions, live tech broadcasts, and exclusive interactive streams.',
        thumbnailUrl: '/src/assets/images/studio_standby_1794131977087.jpg',
        startedAt: null,
        currentViewers: 0,
        updatedAt: new Date().toISOString()
      },
      sessions: [
        {
          id: 'sess_archive_01',
          title: 'The Future of Real-Time Web & AI Systems',
          description: 'Deep dive into full-stack architecture, ultra-low latency streaming, and scalable creator infrastructure.',
          thumbnailUrl: '/src/assets/images/broadcast_highlight_1794131976835.jpg',
          status: 'ended',
          startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          endedAt: new Date(Date.now() - 86400000 * 3 + 4500000).toISOString(),
          durationSeconds: 4500,
          peakViewers: 1420,
          totalComments: 890,
          totalQuestions: 74,
          totalReactions: 3820
        },
        {
          id: 'sess_archive_02',
          title: 'Ask Me Anything: Tech, Career, and Content Creation',
          description: 'Live interactive Q&A where we answered over 50 audience questions about modern software development.',
          thumbnailUrl: '/src/assets/images/studio_standby_1794131977087.jpg',
          status: 'ended',
          startedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          endedAt: new Date(Date.now() - 86400000 * 7 + 3600000).toISOString(),
          durationSeconds: 3600,
          peakViewers: 980,
          totalComments: 610,
          totalQuestions: 52,
          totalReactions: 2450
        }
      ],
      comments: [],
      questions: [],
      reactions: {
        heart: 0,
        fire: 0,
        clap: 0,
        laugh: 0,
        hearteyes: 0,
        thumbsup: 0
      },
      blockedViewers: []
    };

    this.persist(defaultState);
    return defaultState;
  }

  private persist(dataToSave: DatabaseState = this.state) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  // --- ADMIN CREDENTIALS & PROFILE ---
  public hasAdmin(): boolean {
    return this.state.admin !== null;
  }

  public getAdminProfile(): Omit<AdminProfile, 'passwordHash' | 'salt'> | null {
    if (!this.state.admin) return null;
    const { passwordHash, salt, ...safeProfile } = this.state.admin;
    return safeProfile;
  }

  public createInitialAdmin(email: string, passwordPlain: string, displayName = 'Bilal Rao'): AdminProfile {
    if (this.state.admin) {
      throw new Error('Admin already initialized! Unauthorized attempt.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(passwordPlain, salt);
    const admin: AdminProfile = {
      id: `admin_${Date.now()}`,
      email: email.trim().toLowerCase(),
      passwordHash,
      salt,
      displayName: displayName.trim() || 'Bilal Rao',
      headline: 'Tech Broadcaster, Creator & Full-Stack Engineer',
      bio: 'Welcome to Bilal Rao Live. Join me as I stream technology breakthroughs, live engineering, and real-time interactive discussions.',
      avatarUrl: '/src/assets/images/bilal_rao_portrait_1794131975933.jpg',
      bannerUrl: '/src/assets/images/studio_standby_1794131977087.jpg',
      socialLinks: {
        youtube: 'https://youtube.com/@bilalrao',
        x: 'https://x.com/bilalrao',
        instagram: 'https://instagram.com/bilalrao',
        linkedin: 'https://linkedin.com/in/bilalrao'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.admin = admin;
    this.persist();
    return admin;
  }

  public verifyAdminCredentials(email: string, passwordPlain: string): boolean {
    if (!this.state.admin) return false;
    if (this.state.admin.email.toLowerCase() !== email.trim().toLowerCase()) return false;
    const calculatedHash = hashPassword(passwordPlain, this.state.admin.salt);
    return crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(this.state.admin.passwordHash));
  }

  public updateAdminProfile(updates: Partial<Omit<AdminProfile, 'id' | 'passwordHash' | 'salt' | 'createdAt'>>): AdminProfile {
    if (!this.state.admin) throw new Error('No admin profile configured');
    this.state.admin = {
      ...this.state.admin,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.state.admin;
  }

  public changeAdminPassword(oldPass: string, newPass: string): boolean {
    if (!this.state.admin) return false;
    const valid = this.verifyAdminCredentials(this.state.admin.email, oldPass);
    if (!valid) return false;
    const newSalt = crypto.randomBytes(16).toString('hex');
    this.state.admin.salt = newSalt;
    this.state.admin.passwordHash = hashPassword(newPass, newSalt);
    this.state.admin.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  // --- STREAM SETTINGS ---
  public getSettings(): StreamSettings {
    return this.state.settings;
  }

  public updateSettings(updates: Partial<StreamSettings>): StreamSettings {
    this.state.settings = {
      ...this.state.settings,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.state.settings;
  }

  // --- LIVE STATUS & SESSIONS ---
  public getLiveStatus(): LiveStatus {
    return this.state.liveStatus;
  }

  public setViewerCount(count: number): void {
    this.state.liveStatus.currentViewers = Math.max(0, count);
    if (this.state.liveStatus.isLive && this.state.liveStatus.activeSessionId) {
      const session = this.state.sessions.find(s => s.id === this.state.liveStatus.activeSessionId);
      if (session && count > session.peakViewers) {
        session.peakViewers = count;
      }
    }
    this.state.liveStatus.updatedAt = new Date().toISOString();
    this.persist();
  }

  public startLiveStream(title: string, description: string, thumbnailUrl?: string): LiveSession {
    const sessionId = `sess_${Date.now()}`;
    const startedAt = new Date().toISOString();

    const newSession: LiveSession = {
      id: sessionId,
      title: title.trim() || 'Bilal Rao Live Stream',
      description: description.trim() || 'Streaming live with Bilal Rao.',
      thumbnailUrl: thumbnailUrl || '/src/assets/images/studio_standby_1794131977087.jpg',
      status: 'live',
      startedAt,
      durationSeconds: 0,
      peakViewers: this.state.liveStatus.currentViewers,
      totalComments: 0,
      totalQuestions: 0,
      totalReactions: 0
    };

    this.state.sessions.unshift(newSession);

    this.state.liveStatus = {
      isLive: true,
      activeSessionId: sessionId,
      title: newSession.title,
      description: newSession.description,
      thumbnailUrl: newSession.thumbnailUrl || '/src/assets/images/studio_standby_1794131977087.jpg',
      startedAt,
      currentViewers: this.state.liveStatus.currentViewers,
      updatedAt: new Date().toISOString()
    };

    // Reset current reactions for the new session
    this.state.reactions = { heart: 0, fire: 0, clap: 0, laugh: 0, hearteyes: 0, thumbsup: 0 };

    this.persist();
    return newSession;
  }

  public endLiveStream(): LiveSession | null {
    if (!this.state.liveStatus.isLive || !this.state.liveStatus.activeSessionId) {
      this.state.liveStatus.isLive = false;
      this.state.liveStatus.activeSessionId = null;
      this.persist();
      return null;
    }

    const sessionId = this.state.liveStatus.activeSessionId;
    const session = this.state.sessions.find(s => s.id === sessionId);

    if (session) {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();
      const startMs = new Date(session.startedAt).getTime();
      const endMs = new Date(session.endedAt).getTime();
      session.durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
      session.totalComments = this.state.comments.filter(c => c.sessionId === sessionId && !c.isDeleted).length;
      session.totalQuestions = this.state.questions.filter(q => q.sessionId === sessionId).length;
      session.totalReactions = Object.values(this.state.reactions).reduce((a, b) => a + b, 0);
    }

    this.state.liveStatus = {
      isLive: false,
      activeSessionId: null,
      title: 'Bilal Rao is Currently Offline',
      description: 'The live broadcast has concluded. Check back soon for the next live stream!',
      thumbnailUrl: session?.thumbnailUrl || '/src/assets/images/studio_standby_1794131977087.jpg',
      startedAt: null,
      currentViewers: this.state.liveStatus.currentViewers,
      updatedAt: new Date().toISOString()
    };

    this.persist();
    return session || null;
  }

  public getSessions(): LiveSession[] {
    return this.state.sessions;
  }

  // --- COMMENTS ---
  public addComment(sessionId: string, viewerId: string, viewerName: string, message: string): LiveComment {
    if (this.isViewerBlocked(viewerId)) {
      throw new Error('You have been blocked from commenting by the stream administrator.');
    }
    const comment: LiveComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      viewerId,
      viewerName: viewerName.trim().slice(0, 32) || 'Viewer',
      message: message.trim().slice(0, this.state.settings.maxMessageLength),
      createdAt: new Date().toISOString(),
      isPinned: false,
      isDeleted: false
    };

    this.state.comments.push(comment);
    if (this.state.comments.length > 500) {
      this.state.comments.shift();
    }
    this.persist();
    return comment;
  }

  public getComments(sessionId?: string): LiveComment[] {
    if (!sessionId) return this.state.comments.filter(c => !c.isDeleted);
    return this.state.comments.filter(c => c.sessionId === sessionId && !c.isDeleted);
  }

  public deleteComment(commentId: string): boolean {
    const comment = this.state.comments.find(c => c.id === commentId);
    if (!comment) return false;
    comment.isDeleted = true;
    this.persist();
    return true;
  }

  public pinComment(commentId: string, isPinned = true): LiveComment | null {
    // Unpin others
    this.state.comments.forEach(c => {
      c.isPinned = false;
    });
    const comment = this.state.comments.find(c => c.id === commentId);
    if (comment) {
      comment.isPinned = isPinned;
      this.persist();
      return comment;
    }
    return null;
  }

  // --- QUESTIONS ---
  public addQuestion(sessionId: string, viewerId: string, viewerName: string, question: string): LiveQuestion {
    if (this.isViewerBlocked(viewerId)) {
      throw new Error('You have been blocked from asking questions by the stream administrator.');
    }
    const q: LiveQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      viewerId,
      viewerName: viewerName.trim().slice(0, 32) || 'Viewer',
      question: question.trim().slice(0, 300),
      upvotes: 0,
      isHighlighted: false,
      isAnswered: false,
      createdAt: new Date().toISOString()
    };
    this.state.questions.push(q);
    if (this.state.questions.length > 300) {
      this.state.questions.shift();
    }
    this.persist();
    return q;
  }

  public getQuestions(sessionId?: string): LiveQuestion[] {
    if (!sessionId) return this.state.questions;
    return this.state.questions.filter(q => q.sessionId === sessionId);
  }

  public toggleHighlightQuestion(questionId: string, isHighlighted: boolean): LiveQuestion | null {
    this.state.questions.forEach(q => {
      q.isHighlighted = false;
    });
    const q = this.state.questions.find(item => item.id === questionId);
    if (q) {
      q.isHighlighted = isHighlighted;
      this.persist();
      return q;
    }
    return null;
  }

  public markQuestionAnswered(questionId: string, isAnswered: boolean): LiveQuestion | null {
    const q = this.state.questions.find(item => item.id === questionId);
    if (q) {
      q.isAnswered = isAnswered;
      if (isAnswered && q.isHighlighted) q.isHighlighted = false;
      this.persist();
      return q;
    }
    return null;
  }

  // --- REACTIONS ---
  public addReaction(type: string): Record<string, number> {
    if (this.state.reactions[type] !== undefined) {
      this.state.reactions[type] += 1;
    } else {
      this.state.reactions[type] = 1;
    }
    this.persist();
    return this.state.reactions;
  }

  public getReactions(): Record<string, number> {
    return this.state.reactions;
  }

  // --- BLOCKED VIEWERS ---
  public isViewerBlocked(viewerId: string): boolean {
    return this.state.blockedViewers.some(b => b.viewerId === viewerId);
  }

  public blockViewer(viewerId: string, viewerName: string, reason = 'Abusive behavior'): BlockedViewer {
    const existing = this.state.blockedViewers.find(b => b.viewerId === viewerId);
    if (existing) return existing;
    const blocked: BlockedViewer = {
      id: `block_${Date.now()}`,
      viewerId,
      viewerName: viewerName || 'Viewer',
      reason,
      blockedAt: new Date().toISOString()
    };
    this.state.blockedViewers.push(blocked);
    this.persist();
    return blocked;
  }

  public unblockViewer(viewerId: string): boolean {
    const idx = this.state.blockedViewers.findIndex(b => b.viewerId === viewerId);
    if (idx !== -1) {
      this.state.blockedViewers.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  public getBlockedViewers(): BlockedViewer[] {
    return this.state.blockedViewers;
  }
}

export const db = new StorageEngine();
