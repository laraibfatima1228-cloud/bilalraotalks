import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  Users,
  MessageSquare,
  Flame,
  Clock,
  Settings,
  Key,
  User,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Ban,
  Trash2,
  Save,
  LogOut
} from 'lucide-react';
import { AdminProfile, StreamSettings, LiveSession, BlockedViewer } from '../types.ts';

interface AdminDashboardProps {
  token: string;
  profile: AdminProfile | null;
  onProfileUpdated: (profile: AdminProfile) => void;
  onOpenStudio: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  profile,
  onProfileUpdated,
  onOpenStudio,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'profile' | 'moderation' | 'security'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Settings State
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

  // Profile Edit State
  const [displayName, setDisplayName] = useState(profile?.displayName || 'Bilal Rao');
  const [headline, setHeadline] = useState(profile?.headline || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [youtube, setYoutube] = useState(profile?.socialLinks?.youtube || '');
  const [xSocial, setXSocial] = useState(profile?.socialLinks?.x || '');
  const [instagram, setInstagram] = useState(profile?.socialLinks?.instagram || '');
  const [linkedin, setLinkedin] = useState(profile?.socialLinks?.linkedin || '');

  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Moderation State
  const [blockedList, setBlockedList] = useState<BlockedViewer[]>([]);

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setFeedbackMessage(msg);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSettings();
    fetchBlockedViewers();
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.warn('Failed to fetch stats', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  };

  const fetchBlockedViewers = async () => {
    try {
      const res = await fetch('/api/admin/moderation/blocked-list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.blockedViewers) setBlockedList(data.blockedViewers);
    } catch (e) {
      console.warn('Failed to load blocked viewers', e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      showNotification('Stream settings successfully updated!');
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName,
          headline,
          bio,
          avatarUrl,
          socialLinks: {
            youtube,
            x: xSocial,
            instagram,
            linkedin
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      onProfileUpdated(data.profile);
      showNotification('Bilal Rao profile successfully saved!');
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match.', true);
      return;
    }
    if (newPassword.length < 8) {
      showNotification('New password must be at least 8 characters.', true);
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Administrator password successfully changed!');
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleUnblock = async (viewerId: string) => {
    try {
      const res = await fetch('/api/admin/moderation/unblock-viewer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ viewerId })
      });
      if (res.ok) {
        setBlockedList((prev) => prev.filter((b) => b.viewerId !== viewerId));
        showNotification('Viewer unblocked.');
      }
    } catch (err: any) {
      showNotification('Failed to unblock viewer', true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
              <img
                src={avatarUrl || '/src/assets/images/bilal_rao_portrait_1794131975933.jpg'}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {displayName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-400 uppercase">
                  MASTER ADMIN
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{headline || 'Broadcaster & Platform Administrator'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenStudio}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-950/60 active:scale-95 transition-all"
            >
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span>Launch Live Studio</span>
            </button>

            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Analytics & Sessions
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'profile'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Creator Profile
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Stream Controls & Chat
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'moderation'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Blocked Viewers ({blockedList.length})
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'security'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            Security & Password
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">All-Time Peak Viewers</span>
                <div className="text-2xl font-black text-white font-mono tabular-nums flex items-center gap-2">
                  <Users className="w-5 h-5 text-rose-500" />
                  {stats?.peakViewers || 0}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Total Streams Hosted</span>
                <div className="text-2xl font-black text-white font-mono tabular-nums flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  {stats?.totalStreams || 0}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Audience Comments</span>
                <div className="text-2xl font-black text-white font-mono tabular-nums flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-sky-400" />
                  {stats?.totalComments || 0}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Total Reactions Burst</span>
                <div className="text-2xl font-black text-white font-mono tabular-nums flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  {stats?.totalReactions || 0}
                </div>
              </div>
            </div>

            {/* Broadcast History Table */}
            <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
              <h3 className="text-base font-bold text-white">Stream History & Recordings</h3>
              {stats?.recentSessions?.length === 0 ? (
                <p className="text-xs text-zinc-500">No stream history recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500">
                        <th className="pb-3 font-semibold">Title</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Duration</th>
                        <th className="pb-3 font-semibold">Peak Viewers</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {stats?.recentSessions?.map((s: LiveSession) => (
                        <tr key={s.id} className="text-zinc-300">
                          <td className="py-3 font-medium text-white">{s.title}</td>
                          <td className="py-3 font-mono tabular-nums text-zinc-400">
                            {new Date(s.startedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-mono tabular-nums">
                            {Math.floor((s.durationSeconds || 0) / 60)} min
                          </td>
                          <td className="py-3 font-mono tabular-nums text-rose-400">
                            {s.peakViewers}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                s.status === 'live'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CREATOR PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Public Profile Settings</h3>
              <p className="text-xs text-zinc-400">Customize what visitors see about you on the public homepage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Headline / Role</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Broadcaster & Software Engineer"
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-zinc-300 font-medium mb-1">Profile Avatar Image URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Custom avatar image path or URL"
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-zinc-300 font-medium mb-1">About Bio</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">YouTube URL</label>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="https://youtube.com/@bilalrao"
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">X (Twitter) URL</label>
                <input
                  type="text"
                  value={xSocial}
                  onChange={(e) => setXSocial(e.target.value)}
                  placeholder="https://x.com/bilalrao"
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Instagram URL</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/bilalrao"
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">LinkedIn URL</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/bilalrao"
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Profile Changes
            </button>
          </form>
        )}

        {/* TAB 3: STREAM CONTROLS & CHAT SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Stream & Chat Permissions</h3>
              <p className="text-xs text-zinc-400">Configure real-time viewer interaction controls.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <div>
                  <span className="font-semibold text-white block">Enable Public Chat</span>
                  <span className="text-zinc-400 text-[11px]">Allow anonymous and named viewers to send live messages</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.chatEnabled}
                  onChange={(e) => setSettings({ ...settings, chatEnabled: e.target.checked })}
                  className="w-5 h-5 accent-rose-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <div>
                  <span className="font-semibold text-white block">Enable Live Questions</span>
                  <span className="text-zinc-400 text-[11px]">Allow viewers to submit questions for you to answer</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.questionsEnabled}
                  onChange={(e) => setSettings({ ...settings, questionsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-rose-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <div>
                  <span className="font-semibold text-white block">Enable Floating Reactions</span>
                  <span className="text-zinc-400 text-[11px]">Allow hearts, flames, claps, and laughter emojis to float on video</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reactionsEnabled}
                  onChange={(e) => setSettings({ ...settings, reactionsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-rose-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Slow Mode Delay (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={settings.slowModeSeconds}
                    onChange={(e) => setSettings({ ...settings, slowModeSeconds: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Max Message Length (characters)</label>
                  <input
                    type="number"
                    min={20}
                    max={500}
                    value={settings.maxMessageLength}
                    onChange={(e) => setSettings({ ...settings, maxMessageLength: parseInt(e.target.value, 10) || 280 })}
                    className="w-full px-3.5 py-2 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              Apply Settings
            </button>
          </form>
        )}

        {/* TAB 4: MODERATION & BLOCKED VIEWERS */}
        {activeTab === 'moderation' && (
          <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Blocked Viewers Management</h3>
              <p className="text-xs text-zinc-400">Viewers blocked for abusive behavior or spam.</p>
            </div>

            {blockedList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No blocked viewers. Chat is clean!</p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {blockedList.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">{b.viewerName}</span>
                      <span className="text-[11px] text-zinc-500 ml-2 font-mono">ID: {b.viewerId}</span>
                      <p className="text-[11px] text-rose-400">Reason: {b.reason}</p>
                    </div>

                    <button
                      onClick={() => handleUnblock(b.viewerId)}
                      className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SECURITY & PASSWORD */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-6 max-w-lg">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Change Master Password</h3>
              <p className="text-xs text-zinc-400">Update your private broadcaster authentication credentials.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Key className="w-4 h-4" />
              Update Password
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
