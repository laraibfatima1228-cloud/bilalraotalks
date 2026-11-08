import http from 'node:http';
import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { db } from './src/server/storage.ts';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'bilal-rao-live-jwt-secret-2026';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Direct ZIP download route for downloading source code
app.get(['/bilal-rao-live.zip', '/api/download-source'], (_req, res) => {
  const zipPath = path.resolve(process.cwd(), 'bilal-rao-live.zip');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="bilal-rao-live.zip"');
  res.sendFile(zipPath);
});

// Helper for signing session tokens
interface TokenPayload {
  adminId: string;
  email: string;
  exp: number;
}

function signSessionToken(adminId: string, email: string): string {
  const payload: TokenPayload = {
    adminId,
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySessionToken(token: string): TokenPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Admin Auth Guard Middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }

  (req as any).adminUser = payload;
  next();
}

// Rate limiter helper for chat/comments
const viewerRateLimits = new Map<string, number>();

// --- AUTH & SETUP API ROUTES ---
app.get('/api/auth/setup-status', (_req, res) => {
  const isSetup = db.hasAdmin();
  res.json({
    isSetup,
    platformName: db.getSettings().platformName
  });
});

app.post('/api/auth/setup', (req, res) => {
  try {
    if (db.hasAdmin()) {
      return res.status(400).json({ error: 'Setup has already been completed.' });
    }
    const { email, password, displayName } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Valid email and a secure password (min 8 characters) are required.' });
    }
    const admin = db.createInitialAdmin(email, password, displayName || 'Bilal Rao');
    const token = signSessionToken(admin.id, admin.email);
    res.json({
      success: true,
      token,
      profile: db.getAdminProfile()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Setup initialization failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (!db.hasAdmin()) {
    return res.status(400).json({ error: 'Platform not yet initialized. Please complete setup first.' });
  }

  const valid = db.verifyAdminCredentials(email, password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid administrator credentials' });
  }

  const profile = db.getAdminProfile()!;
  const token = signSessionToken(profile.id, profile.email);

  res.json({
    success: true,
    token,
    profile
  });
});

app.get('/api/auth/me', requireAdminAuth, (_req, res) => {
  const profile = db.getAdminProfile();
  if (!profile) return res.status(404).json({ error: 'Admin not found' });
  res.json({ profile });
});

app.post('/api/auth/change-password', requireAdminAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Invalid password format. Min 8 characters required.' });
  }
  const success = db.changeAdminPassword(oldPassword, newPassword);
  if (!success) {
    return res.status(400).json({ error: 'Incorrect existing password' });
  }
  res.json({ success: true, message: 'Password successfully updated' });
});

// --- ADMIN MANAGEMENT ROUTES ---
app.put('/api/admin/profile', requireAdminAuth, (req, res) => {
  try {
    const updated = db.updateAdminProfile(req.body);
    broadcastToAll({
      type: 'profile:updated',
      data: db.getAdminProfile()
    });
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/settings', requireAdminAuth, (_req, res) => {
  res.json({ settings: db.getSettings() });
});

app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
  const updated = db.updateSettings(req.body);
  broadcastToAll({
    type: 'settings:updated',
    data: updated
  });
  res.json({ success: true, settings: updated });
});

app.post('/api/admin/stream/start', requireAdminAuth, (req, res) => {
  const { title, description, thumbnailUrl } = req.body;
  const session = db.startLiveStream(title, description, thumbnailUrl);

  // Broadcast to all connected clients that Bilal Rao is now LIVE!
  broadcastToAll({
    type: 'stream:started',
    data: {
      status: db.getLiveStatus(),
      session
    }
  });

  res.json({ success: true, session, status: db.getLiveStatus() });
});

app.post('/api/admin/stream/end', requireAdminAuth, (_req, res) => {
  const endedSession = db.endLiveStream();

  // Broadcast to all clients that the stream has concluded
  broadcastToAll({
    type: 'stream:ended',
    data: {
      status: db.getLiveStatus(),
      endedSession
    }
  });

  res.json({ success: true, status: db.getLiveStatus(), endedSession });
});

app.post('/api/admin/moderation/delete-comment', requireAdminAuth, (req, res) => {
  const { commentId } = req.body;
  if (!commentId) return res.status(400).json({ error: 'commentId required' });
  db.deleteComment(commentId);
  broadcastToAll({
    type: 'comment:deleted',
    data: { commentId }
  });
  res.json({ success: true });
});

app.post('/api/admin/moderation/pin-comment', requireAdminAuth, (req, res) => {
  const { commentId, isPinned } = req.body;
  const pinned = db.pinComment(commentId, isPinned !== false);
  broadcastToAll({
    type: 'comment:pinned',
    data: { comment: pinned }
  });
  res.json({ success: true, comment: pinned });
});

app.post('/api/admin/moderation/highlight-question', requireAdminAuth, (req, res) => {
  const { questionId, isHighlighted } = req.body;
  const q = db.toggleHighlightQuestion(questionId, isHighlighted !== false);
  broadcastToAll({
    type: 'question:highlighted',
    data: { question: q }
  });
  res.json({ success: true, question: q });
});

app.post('/api/admin/moderation/answer-question', requireAdminAuth, (req, res) => {
  const { questionId, isAnswered } = req.body;
  const q = db.markQuestionAnswered(questionId, isAnswered !== false);
  broadcastToAll({
    type: 'question:answered',
    data: { question: q }
  });
  res.json({ success: true, question: q });
});

app.post('/api/admin/moderation/block-viewer', requireAdminAuth, (req, res) => {
  const { viewerId, viewerName, reason } = req.body;
  if (!viewerId) return res.status(400).json({ error: 'viewerId required' });
  const blocked = db.blockViewer(viewerId, viewerName, reason);
  broadcastToAll({
    type: 'viewer:blocked',
    data: { viewerId }
  });
  res.json({ success: true, blocked });
});

app.post('/api/admin/moderation/unblock-viewer', requireAdminAuth, (req, res) => {
  const { viewerId } = req.body;
  const success = db.unblockViewer(viewerId);
  res.json({ success });
});

app.get('/api/admin/moderation/blocked-list', requireAdminAuth, (_req, res) => {
  res.json({ blockedViewers: db.getBlockedViewers() });
});

app.get('/api/admin/stats', requireAdminAuth, (_req, res) => {
  const sessions = db.getSessions();
  const totalDuration = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const peakViewers = sessions.reduce((max, s) => Math.max(max, s.peakViewers || 0), 0);
  const totalComments = sessions.reduce((sum, s) => sum + (s.totalComments || 0), 0);
  const totalReactions = sessions.reduce((sum, s) => sum + (s.totalReactions || 0), 0);

  res.json({
    totalStreams: sessions.length,
    totalDuration,
    peakViewers,
    totalComments,
    totalReactions,
    currentLive: db.getLiveStatus(),
    recentSessions: sessions.slice(0, 10)
  });
});

// --- PUBLIC VIEWER API ROUTES ---
app.get('/api/public/status', (_req, res) => {
  res.json({
    status: db.getLiveStatus(),
    profile: db.getAdminProfile() || {
      displayName: 'Bilal Rao',
      headline: 'Tech Broadcaster & Creator',
      bio: 'Official live broadcasting platform of Bilal Rao.',
      avatarUrl: '/src/assets/images/bilal_rao_portrait_1794131975933.jpg',
      socialLinks: {
        youtube: 'https://youtube.com/@bilalrao',
        x: 'https://x.com/bilalrao',
        instagram: 'https://instagram.com/bilalrao',
        linkedin: 'https://linkedin.com/in/bilalrao'
      }
    },
    settings: db.getSettings()
  });
});

app.get('/api/public/sessions', (_req, res) => {
  res.json({ sessions: db.getSessions() });
});

app.get('/api/public/comments', (req, res) => {
  const sessionId = (req.query.sessionId as string) || db.getLiveStatus().activeSessionId || undefined;
  res.json({ comments: db.getComments(sessionId) });
});

app.get('/api/public/questions', (req, res) => {
  const sessionId = (req.query.sessionId as string) || db.getLiveStatus().activeSessionId || undefined;
  res.json({ questions: db.getQuestions(sessionId) });
});

app.get('/api/public/reactions', (_req, res) => {
  res.json({ reactions: db.getReactions() });
});

// --- LIVEKIT OR WEBRTC TOKEN ENDPOINT ---
app.post('/api/stream/token', async (req, res) => {
  try {
    const { identity, roomName = 'bilal-rao-live', isPublisher } = req.body;
    const isProdLiveKitConfigured = Boolean(
      process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
    );

    // If publishing, verify admin token
    if (isPublisher) {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token || !verifySessionToken(token)) {
        return res.status(403).json({ error: 'Only authorized broadcaster can request publisher credentials' });
      }
    }

    if (isProdLiveKitConfigured) {
      // Dynamic import of livekit-server-sdk to prevent boot errors if package changes
      const { AccessToken } = await import('livekit-server-sdk');
      const apiKey = process.env.LIVEKIT_API_KEY!;
      const apiSecret = process.env.LIVEKIT_API_SECRET!;
      const livekitUrl = process.env.LIVEKIT_URL!;

      const at = new AccessToken(apiKey, apiSecret, {
        identity: identity || (isPublisher ? 'bilal-rao-broadcaster' : `viewer_${Date.now()}`),
        ttl: '2h'
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: Boolean(isPublisher),
        canSubscribe: true,
        canPublishData: true
      });

      const jwtToken = await at.toJwt();
      return res.json({
        provider: 'livekit',
        token: jwtToken,
        serverUrl: livekitUrl
      });
    }

    // Default: Built-in Ultra Low Latency WebRTC Mesh/Signaling Server
    return res.json({
      provider: 'webrtc-direct',
      roomName,
      isPublisher: Boolean(isPublisher),
      rtcConfiguration: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });
  } catch (error: any) {
    console.error('Error generating streaming token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected sockets and roles
interface SocketClient {
  ws: WebSocket;
  id: string;
  isBroadcaster: boolean;
  viewerId?: string;
  viewerName?: string;
  ip: string;
}

const clients = new Map<WebSocket, SocketClient>();
let broadcasterSocket: WebSocket | null = null;

function broadcastToAll(message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const [ws, client] of clients.entries()) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (err) {
        console.warn('Failed to send to client', client.id);
      }
    }
  }
}

function updateViewerCount() {
  // Count active non-broadcaster clients
  let viewers = 0;
  for (const client of clients.values()) {
    if (!client.isBroadcaster) {
      viewers++;
    }
  }
  db.setViewerCount(viewers);
  broadcastToAll({
    type: 'viewer_count_update',
    data: { count: viewers }
  });
}

// WebSocket Event Handling
wss.on('connection', (ws: WebSocket, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const ip = req.socket.remoteAddress || 'unknown';

  const clientInfo: SocketClient = {
    ws,
    id: clientId,
    isBroadcaster: false,
    ip
  };

  clients.set(ws, clientInfo);

  // Send initial state upon connect
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      status: db.getLiveStatus(),
      settings: db.getSettings(),
      profile: db.getAdminProfile(),
      comments: db.getComments(),
      questions: db.getQuestions(),
      reactions: db.getReactions(),
      hasBroadcaster: broadcasterSocket !== null && broadcasterSocket.readyState === WebSocket.OPEN
    }
  }));

  updateViewerCount();

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      const { type, data } = message;

      switch (type) {
        // --- BROADCASTER CONNECTION & WEBRTC SIGNALING ---
        case 'broadcaster:register': {
          const { token } = data;
          const payload = verifySessionToken(token);
          if (payload) {
            clientInfo.isBroadcaster = true;
            broadcasterSocket = ws;
            console.log('✅ Broadcaster registered securely:', payload.email);

            ws.send(JSON.stringify({
              type: 'broadcaster:confirmed',
              data: { success: true }
            }));

            broadcastToAll({
              type: 'broadcaster:online',
              data: { isOnline: true }
            }, ws);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Unauthorized broadcaster token' }
            }));
          }
          break;
        }

        case 'viewer:register': {
          clientInfo.viewerId = data?.viewerId || clientId;
          clientInfo.viewerName = data?.viewerName || 'Viewer';

          // Notify broadcaster that a viewer has joined and wants video
          if (broadcasterSocket && broadcasterSocket.readyState === WebSocket.OPEN) {
            broadcasterSocket.send(JSON.stringify({
              type: 'webrtc:viewer-joined',
              data: {
                viewerId: clientInfo.id,
                name: clientInfo.viewerName
              }
            }));
          }
          break;
        }

        // WebRTC Signaling routing between Broadcaster and Viewers
        case 'webrtc:offer': {
          // Broadcaster creates offer for a specific viewer
          const targetViewerId = data.targetViewerId;
          for (const [vWs, vClient] of clients.entries()) {
            if (vClient.id === targetViewerId && vWs.readyState === WebSocket.OPEN) {
              vWs.send(JSON.stringify({
                type: 'webrtc:offer',
                data: {
                  sdp: data.sdp,
                  broadcasterId: clientInfo.id
                }
              }));
              break;
            }
          }
          break;
        }

        case 'webrtc:answer': {
          // Viewer sends answer back to broadcaster
          if (broadcasterSocket && broadcasterSocket.readyState === WebSocket.OPEN) {
            broadcasterSocket.send(JSON.stringify({
              type: 'webrtc:answer',
              data: {
                sdp: data.sdp,
                viewerId: clientInfo.id
              }
            }));
          }
          break;
        }

        case 'webrtc:ice-candidate': {
          // Relay candidate to the other peer
          if (clientInfo.isBroadcaster) {
            // Broadcaster -> Viewer
            const targetViewerId = data.targetViewerId;
            for (const [vWs, vClient] of clients.entries()) {
              if (vClient.id === targetViewerId && vWs.readyState === WebSocket.OPEN) {
                vWs.send(JSON.stringify({
                  type: 'webrtc:ice-candidate',
                  data: { candidate: data.candidate }
                }));
                break;
              }
            }
          } else {
            // Viewer -> Broadcaster
            if (broadcasterSocket && broadcasterSocket.readyState === WebSocket.OPEN) {
              broadcasterSocket.send(JSON.stringify({
                type: 'webrtc:ice-candidate',
                data: {
                  candidate: data.candidate,
                  viewerId: clientInfo.id
                }
              }));
            }
          }
          break;
        }

        // --- REAL-TIME CHAT & COMMENTS ---
        case 'chat:send': {
          const settings = db.getSettings();
          if (!settings.chatEnabled) {
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Chat is currently disabled by administrator.' } }));
            return;
          }

          const { viewerId, viewerName, message: msgText } = data;
          if (!msgText || !msgText.trim()) return;

          // Rate limit check
          const lastSent = viewerRateLimits.get(viewerId) || 0;
          const now = Date.now();
          if (now - lastSent < settings.slowModeSeconds * 1000) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: `Please wait ${settings.slowModeSeconds} seconds between messages.` }
            }));
            return;
          }
          viewerRateLimits.set(viewerId, now);

          try {
            const activeSessionId = db.getLiveStatus().activeSessionId || 'default_session';
            const comment = db.addComment(activeSessionId, viewerId, viewerName, msgText);
            broadcastToAll({
              type: 'chat:new',
              data: { comment }
            });
          } catch (err: any) {
            ws.send(JSON.stringify({ type: 'error', data: { message: err.message } }));
          }
          break;
        }

        // --- REAL-TIME QUESTIONS ---
        case 'question:ask': {
          const settings = db.getSettings();
          if (!settings.questionsEnabled) {
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Live questions are currently disabled.' } }));
            return;
          }

          const { viewerId, viewerName, question } = data;
          if (!question || !question.trim()) return;

          try {
            const activeSessionId = db.getLiveStatus().activeSessionId || 'default_session';
            const q = db.addQuestion(activeSessionId, viewerId, viewerName, question);
            broadcastToAll({
              type: 'question:new',
              data: { question: q }
            });
          } catch (err: any) {
            ws.send(JSON.stringify({ type: 'error', data: { message: err.message } }));
          }
          break;
        }

        // --- REAL-TIME REACTIONS (❤️, 🔥, 👏, 😂, 😍, 👍) ---
        case 'reaction:send': {
          const { type: reactionType } = data;
          if (['heart', 'fire', 'clap', 'laugh', 'hearteyes', 'thumbsup'].includes(reactionType)) {
            const reactions = db.addReaction(reactionType);
            broadcastToAll({
              type: 'reaction:burst',
              data: {
                reactionType,
                reactions,
                timestamp: Date.now()
              }
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.warn('Invalid WebSocket packet received:', err);
    }
  });

  ws.on('close', () => {
    if (clientInfo.isBroadcaster) {
      console.log('Broadcaster disconnected');
      broadcasterSocket = null;
      broadcastToAll({
        type: 'broadcaster:offline',
        data: { isOnline: false }
      });
    } else if (broadcasterSocket && broadcasterSocket.readyState === WebSocket.OPEN) {
      // Notify broadcaster that viewer disconnected so peer connection can be cleaned up
      broadcasterSocket.send(JSON.stringify({
        type: 'webrtc:viewer-left',
        data: { viewerId: clientInfo.id }
      }));
    }

    clients.delete(ws);
    updateViewerCount();
  });
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🔴 BILAL RAO LIVE server running on http://localhost:${PORT}`);
    console.log(`⚡ WebSocket endpoint ready at ws://localhost:${PORT}/ws`);
    console.log(`🔒 Initial Admin Setup status: ${db.hasAdmin() ? 'INITIALIZED' : 'PENDING'}`);
    console.log(`=================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
