import React, { useState, useEffect } from 'react';
import { Lock, Mail, Key, Shield, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { AdminProfile } from '../types.ts';

interface AdminLoginProps {
  onLoginSuccess: (token: string, profile: AdminProfile) => void;
  onBackToHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToHome }) => {
  const [isSetupNeeded, setIsSetupNeeded] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('Bilal Rao');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then((res) => res.json())
      .then((data) => {
        setIsSetupNeeded(!data.isSetup);
      })
      .catch(() => {
        setIsSetupNeeded(false);
      });
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Initialization failed');
      }

      onLoginSuccess(data.token, data.profile);
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.token, data.profile);
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#09090b]">
      <div className="w-full max-w-md">
        
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Public Website
          </button>
          <div className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-mono">
            <Lock className="w-3.5 h-3.5" />
            Private Broadcaster Area
          </div>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-6 sm:p-8 shadow-2xl space-y-6">
          
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-500 mx-auto">
              <Shield className="w-6 h-6" />
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isSetupNeeded ? 'Master Creator Initialization' : 'Bilal Rao Admin Login'}
            </h1>
            <p className="text-xs text-zinc-400">
              {isSetupNeeded
                ? 'Welcome Bilal Rao! Initialize your exclusive broadcasting credentials. Public registrations are permanently locked.'
                : 'Authentication is restricted exclusively to Bilal Rao.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {isSetupNeeded ? (
            /* First-Time Setup Form */
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Broadcaster Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Bilal Rao"
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Master Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bilal@bilalrao.live"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Master Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 active:scale-98 transition-all cursor-pointer"
              >
                {isLoading ? 'Initializing...' : 'Initialize Master Administrator'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Normal Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bilal@bilalrao.live"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 active:scale-98 transition-all cursor-pointer"
              >
                {isLoading ? 'Authenticating...' : 'Sign In as Bilal Rao'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Security Guarantee Notice */}
          <div className="pt-2 text-center border-t border-zinc-800/80">
            <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-zinc-600" />
              Protected by PBKDF2 cryptography & HMAC session tokens.
            </p>
          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto text-rose-400">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Administrator Recovery</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              For security, credentials recovery is server-side. As server administrator, you can update your master credentials in <code className="text-rose-300">.data/db.json</code> or reset them directly via the platform backend console.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
