'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response: any = await apiClient.post('/auth/register', formData);
      if (response.success) {
        setStatus('success');
        setMessage(response.message || 'Registration successful. Please wait for admin verification.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Registration failed');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 font-outfit">
        <div className="w-full max-w-md text-center space-y-8 animate-reveal">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600/10 border border-blue-500/20 text-4xl mb-6">
            ⏳
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-tight">Registration <br /><span className="text-blue-500 not-italic">Pending.</span></h2>
          <div className="rounded-3xl border border-blue-500/10 bg-blue-500/5 p-8 backdrop-blur-xl">
            <p className="text-lg font-medium text-neutral-300 leading-relaxed mb-6">
              {message}
            </p>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest leading-loose">
              You will be notified once a Super Admin verifies your credentials.
            </p>
          </div>
          <Link href="/admin" className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 hover:text-white transition-colors underline underline-offset-8">
             Return to Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 font-outfit relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg space-y-10 relative z-10 animate-reveal">
        <div className="text-center">
          <Link href="/admin" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-2xl shadow-blue-600/20 mb-8 transition-transform hover:scale-110">
            SFM
          </Link>
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">Join the <span className="text-blue-500 not-italic">Elite.</span></h2>
          <p className="mt-4 text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Apply for Administrative Access</p>
        </div>

        <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-10 backdrop-blur-xl shadow-2xl">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {status === 'error' && (
              <div className="rounded-2xl bg-red-500/10 p-4 text-xs font-bold uppercase tracking-widest text-red-500 border border-red-500/20">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-3 block group-focus-within:text-blue-500 transition-colors">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-3 block group-focus-within:text-blue-500 transition-colors">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@solidfm.com"
                  className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-3 block group-focus-within:text-blue-500 transition-colors">Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="group relative flex h-16 w-full items-center justify-center rounded-2xl bg-white text-lg font-black text-black transition-all hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-white/5"
            >
              <span className={status === 'loading' ? 'opacity-0' : 'opacity-100 uppercase tracking-tighter italic'}>Submit Application</span>
              {status === 'loading' && (
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black"></div>
                 </div>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
             <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Already have an account? 
                <Link href="/login" className="ml-2 text-blue-500 hover:text-white transition-colors underline underline-offset-4 decoration-blue-500/30">Sign In instead</Link>
             </p>
          </div>
        </div>
        
        <p className="text-center text-[9px] font-bold text-neutral-700 uppercase tracking-[0.3em] leading-relaxed">
           Submission of this form implies consent to background credential verification. 
           Abuse of registration system is strictly prohibited.
        </p>
      </div>
    </div>
  );
}
