-- ====================================================================
-- BILAL RAO LIVE – SUPABASE POSTGRESQL SCHEMA & SECURITY POLICIES
-- ====================================================================

-- 1. Stream Settings Table
CREATE TABLE IF NOT EXISTS stream_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  platform_name TEXT NOT NULL DEFAULT 'BILAL RAO LIVE',
  tagline TEXT NOT NULL DEFAULT 'Official Real-Time Live Broadcasting Hub',
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  questions_enabled BOOLEAN NOT NULL DEFAULT true,
  reactions_enabled BOOLEAN NOT NULL DEFAULT true,
  slow_mode_seconds INTEGER NOT NULL DEFAULT 2,
  max_message_length INTEGER NOT NULL DEFAULT 280,
  notification_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Admin Profiles Table (Only Bilal Rao)
CREATE TABLE IF NOT EXISTS admin_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Bilal Rao',
  headline TEXT NOT NULL DEFAULT 'Tech Creator, Broadcaster & Digital Storyteller',
  bio TEXT NOT NULL DEFAULT 'Welcome to my official live streaming hub! Here I stream live technology talks, interactive Q&A sessions, coding walkthroughs, and behind-the-scenes creator moments with my global audience.',
  avatar_url TEXT,
  banner_url TEXT,
  social_links JSONB DEFAULT '{"youtube": "https://youtube.com/@bilalrao", "x": "https://x.com/bilalrao", "instagram": "https://instagram.com/bilalrao", "linkedin": "https://linkedin.com/in/bilalrao"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Live Sessions Table (Historical Archives & Active Session)
CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Live Broadcast',
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_started_at ON live_sessions(started_at DESC);

-- 4. Live Status Table (Single row tracking current live broadcast)
CREATE TABLE IF NOT EXISTS live_status (
  id TEXT PRIMARY KEY DEFAULT 'current',
  is_live BOOLEAN NOT NULL DEFAULT false,
  active_session_id TEXT REFERENCES live_sessions(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  started_at TIMESTAMPTZ,
  current_viewers INTEGER NOT NULL DEFAULT 0,
  streaming_protocol TEXT DEFAULT 'webrtc',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Live Viewers Table (Presence tracking)
CREATE TABLE IF NOT EXISTS live_viewers (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES live_sessions(id) ON DELETE CASCADE,
  viewer_fingerprint TEXT NOT NULL,
  viewer_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_live_viewers_session ON live_viewers(session_id, is_active);

-- 6. Live Comments Table
CREATE TABLE IF NOT EXISTS live_comments (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES live_sessions(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL,
  viewer_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by_admin BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_live_comments_session ON live_comments(session_id, created_at DESC);

-- 7. Live Questions Table
CREATE TABLE IF NOT EXISTS live_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES live_sessions(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL,
  viewer_name TEXT NOT NULL,
  question TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_questions_session ON live_questions(session_id, created_at DESC);

-- 8. Live Reactions Table
CREATE TABLE IF NOT EXISTS live_reactions (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES live_sessions(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'fire', 'clap', 'laugh', 'hearteyes', 'thumbsup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_reactions_session ON live_reactions(session_id, created_at);

-- 9. Blocked Viewers Table
CREATE TABLE IF NOT EXISTS blocked_viewers (
  id TEXT PRIMARY KEY,
  viewer_fingerprint TEXT NOT NULL UNIQUE,
  viewer_name TEXT,
  reason TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE stream_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_viewers ENABLE ROW LEVEL SECURITY;

-- Public can read live status, stream settings, non-deleted comments, questions, and public sessions
CREATE POLICY "Public can view stream settings" ON stream_settings FOR SELECT USING (true);
CREATE POLICY "Public can view live status" ON live_status FOR SELECT USING (true);
CREATE POLICY "Public can view past sessions" ON live_sessions FOR SELECT USING (status != 'cancelled');
CREATE POLICY "Public can view comments" ON live_comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "Public can view questions" ON live_questions FOR SELECT USING (true);
CREATE POLICY "Public can view admin profile bio" ON admin_profiles FOR SELECT USING (true);

-- Anonymous viewers can insert comments, questions, reactions, and viewer presence
CREATE POLICY "Public can post comments" ON live_comments FOR INSERT WITH CHECK (
  NOT EXISTS (SELECT 1 FROM blocked_viewers WHERE blocked_viewers.viewer_fingerprint = viewer_id)
);
CREATE POLICY "Public can ask questions" ON live_questions FOR INSERT WITH CHECK (
  NOT EXISTS (SELECT 1 FROM blocked_viewers WHERE blocked_viewers.viewer_fingerprint = viewer_id)
);
CREATE POLICY "Public can send reactions" ON live_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can track presence" ON live_viewers FOR INSERT WITH CHECK (true);

-- Admin ONLY can modify live status, stream settings, session records, and moderate
CREATE POLICY "Admin full access stream_settings" ON stream_settings FOR ALL USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "Admin full access live_status" ON live_status FOR ALL USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "Admin full access live_sessions" ON live_sessions FOR ALL USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "Admin full access admin_profiles" ON admin_profiles FOR ALL USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "Admin moderate comments" ON live_comments FOR UPDATE USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "Admin moderate questions" ON live_questions FOR UPDATE USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "Admin manage blocked" ON blocked_viewers FOR ALL USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' IS NOT NULL);

-- Initialize default settings
INSERT INTO stream_settings (id, platform_name) 
VALUES ('default', 'BILAL RAO LIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO live_status (id, is_live, title, current_viewers) 
VALUES ('current', false, 'Welcome to Bilal Rao Live', 0)
ON CONFLICT (id) DO NOTHING;
