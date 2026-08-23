'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/use-auth-store';
import type { Admin } from '@/types';
import { Eye, EyeOff } from 'lucide-react';

interface LoginResponse {
  success: boolean;
  data: {
    admin: Admin;
  };
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get('from');
  const from = requestedPath?.startsWith('/admin/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/admin/dashboard';
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post<LoginResponse, LoginResponse>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      if (response.success) {
        setAuth(response.data.admin);
        window.location.href = from;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-black px-6 py-8 font-outfit supports-[height:100dvh]:min-h-dvh sm:py-12">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-10 relative z-10 animate-reveal">
        <div className="text-center group">
          <Link href="/admin" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-2xl shadow-blue-600/20 mb-8 transition-transform hover:scale-110">
            SFM
          </Link>
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">Welcome <span className="text-blue-500 not-italic">Back.</span></h2>
          <p className="mt-4 text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Authorized Access Only</p>
        </div>

        <div className="rounded-[28px] sm:rounded-[40px] border border-white/5 bg-white/[0.02] p-7 sm:p-10 backdrop-blur-xl shadow-2xl">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" aria-live="polite" className={`rounded-2xl p-4 text-xs font-bold uppercase tracking-widest border transition-all ${
                error.toLowerCase().includes('pending') 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="group">
                <label htmlFor="admin-email" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-3 block group-focus-within:text-blue-500 transition-colors">Admin Email</label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder="name@solidfm.com"
                  className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-base text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="group">
                <label htmlFor="admin-password" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-3 block group-focus-within:text-blue-500 transition-colors">Password</label>
                <div className="relative">
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder="••••••••"
                    className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-base text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all pr-14"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    aria-controls="admin-password"
                    className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-neutral-500 transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" title="Click here to reset your password" id="forgot-password-link" className="text-[10px] font-bold text-neutral-500 hover:text-blue-500 transition-colors uppercase tracking-widest">
                    Forgot Password?
                  </Link>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="group relative flex h-16 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-blue-600/20"
            >
              <span className={loading ? 'opacity-0' : 'opacity-100'}>Sign In</span>
              {loading && (
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                 </div>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
             <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Don&apos;t have an account?
                <Link href="/register" className="ml-2 text-blue-500 hover:text-white transition-colors underline underline-offset-4 decoration-blue-500/30">Apply for Access</Link>
             </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 hover:text-white transition-colors">
             ← Back to Public Site
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
