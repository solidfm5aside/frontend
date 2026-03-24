'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [view, setView] = useState<'selection' | 'login' | 'register'>('selection');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 font-outfit">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-black"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-12 text-center">
          <Link href="/" className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white shadow-2xl shadow-blue-600/20 mb-6">
            SFM
          </Link>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            Admin <span className="text-blue-500 not-italic uppercase">Portal</span>
          </h1>
          <p className="mt-3 text-sm font-medium text-neutral-500 uppercase tracking-widest leading-relaxed">
             Elite Tournament Management System
          </p>
        </div>

        <div className="space-y-4">
          <Link 
            href="/login"
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-600/10"
          >
            Sign In to Dashboard
          </Link>
          
          <Link 
            href="/register"
            className="flex h-16 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            Apply for Admin Access
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 leading-relaxed max-w-[200px] mx-auto">
            Authorized personnel only. All access is logged and monitored.
          </p>
          <Link href="/" className="mt-8 inline-block text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hover:text-white transition-colors underline underline-offset-4 decoration-blue-500/30">
            Back to Public Site
          </Link>
        </div>
      </div>
    </div>
  );
}
