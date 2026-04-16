'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { token } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response: any = await apiClient.patch(`/auth/reset-password/${token}`, { password });
      if (response.success) {
        setStatus('success');
        setMessage(response.message);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 font-outfit relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-10 relative z-10 animate-reveal">
        <div className="text-center group">
          <Link href="/admin" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-2xl shadow-blue-600/20 mb-8 transition-transform hover:scale-110">
            SFM
          </Link>
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">New <span className="text-blue-500 not-italic">Credential.</span></h2>
          <p className="mt-4 text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Create a secure new password</p>
        </div>

        <div className="rounded-[28px] sm:rounded-[40px] border border-white/5 bg-white/[0.02] p-7 sm:p-10 backdrop-blur-xl shadow-2xl">
          {status === 'success' ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto h-16 w-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-bold text-neutral-300 leading-relaxed uppercase tracking-wide">
                {message}
              </p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Redirecting to login...</p>
            </div>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit}>
              {status === 'error' && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-bold uppercase tracking-widest text-red-500">
                  {message}
                </div>
              )}

              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-3 block group-focus-within:text-blue-500 transition-colors">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all pr-14"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="group">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-3 block group-focus-within:text-blue-500 transition-colors">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all pr-14"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="group relative flex h-16 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-blue-600/20"
              >
                <span className={status === 'loading' ? 'opacity-0' : 'opacity-100'}>Reset Password</span>
                {status === 'loading' && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                   </div>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
