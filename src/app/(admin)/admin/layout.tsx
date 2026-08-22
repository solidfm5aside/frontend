'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';
import apiClient from '@/lib/api-client';
import type { Admin } from '@/types';

interface CurrentAdminResponse {
  success: boolean;
  data: Admin;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout, setAuth, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [validatedAdminId, setValidatedAdminId] = useState<string | null>(null);
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
  const sessionCheckAttempt = useRef<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const isAdminPath = pathname === '/admin';
  const isSessionReady = (isAdminPath && !admin)
    || Boolean(admin && validatedAdminId === admin._id)
    || Boolean(!admin && !isAdminPath && sessionCheckComplete);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isAdminPath && !admin) return;

    if (admin && validatedAdminId === admin._id) return;

    const attemptKey = admin?._id ?? 'cookie-bootstrap';
    if (sessionCheckAttempt.current === attemptKey) return;
    sessionCheckAttempt.current = attemptKey;

    let cancelled = false;
    void apiClient
      .get<CurrentAdminResponse, CurrentAdminResponse>('/auth/me')
      .then((response) => {
        if (cancelled) return;
        if (!response.success) throw new Error('The admin session could not be verified');
        setAuth(response.data);
        setValidatedAdminId(response.data._id);
        setSessionCheckComplete(true);
      })
      .catch(() => {
        if (cancelled) return;
        sessionCheckAttempt.current = 'cookie-bootstrap';
        logout();
        setSessionCheckComplete(true);
        router.replace('/login');
      });

    return () => {
      cancelled = true;
    };
  }, [admin, hasHydrated, isAdminPath, logout, router, setAuth, validatedAdminId]);

  useEffect(() => {
    if (hasHydrated && isSessionReady) {
      if (!admin) {
        if (!isAdminPath) {
          router.push('/login');
        }
      } else if (validatedAdminId !== admin._id) {
        return;
      } else if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        // Logged in but not an admin (e.g., viewer)
        router.push('/');
      } else if (isAdminPath && admin.isVerified) {
        // Logged in as verified admin and on landing page, go to dashboard
        router.push('/admin/dashboard');
      }
    }
  }, [hasHydrated, isSessionReady, admin, router, isAdminPath, validatedAdminId]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setIsSidebarOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsSidebarOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !sidebarRef.current) return;
      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    desktopQuery.addEventListener('change', closeAtDesktop);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      desktopQuery.removeEventListener('change', closeAtDesktop);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (menuButton?.getClientRects().length) menuButton.focus();
    };
  }, [isSidebarOpen]);

  if (!hasHydrated || !isSessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black" role="status" aria-live="polite">
        <div aria-hidden="true" className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600 motion-reduce:animate-none"></div>
        <span className="sr-only">Loading admin portal</span>
      </div>
    );
  }

  if (admin && validatedAdminId !== admin._id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black" role="status" aria-live="polite">
        <div aria-hidden="true" className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600 motion-reduce:animate-none"></div>
        <span className="sr-only">Verifying admin session</span>
      </div>
    );
  }

  // If on public admin landing page and not logged in, show children without sidebar
  if (isAdminPath && !admin) {
    return <>{children}</>;
  }

  // If not logged in and not on public admin page, show loader while redirecting
  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black" role="status" aria-live="polite">
        <div aria-hidden="true" className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600 motion-reduce:animate-none"></div>
        <span className="sr-only">Redirecting to sign in</span>
      </div>
    );
  }

  // Handle Unverified Admins (Pending Approval State)
  if (admin && admin.isVerified === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center font-outfit relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-md w-full animate-reveal">
           <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600/10 border border-blue-500/20 text-3xl mb-8">
              ⏳
           </div>
           <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase mb-4">Account <span className="text-blue-500 not-italic">Pending.</span></h1>
           <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest leading-loose mb-12 italic">
              Welcome to the team, {admin.name.split(' ')[0]}.<br/>
              Your admin access is currently in the &quot;Review&quot; queue. A Super Admin will verify your credentials shortly.
           </p>
           
           <div className="space-y-4">
              <Link href="/" className="flex w-full h-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
                 ← Return to Public Site
              </Link>
              <button 
                type="button"
                onClick={() => { logout(); router.push('/login'); }}
                className="flex w-full h-16 items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 transition-all italic underline underline-offset-8 decoration-red-500/20"
              >
                Sign out & Try again
              </button>
           </div>
        </div>
      </div>
    );
  }


  const navLinks = [
    { name: 'Overview', href: '/admin/dashboard', icon: '📊' },
    { name: 'Tournaments', href: '/admin/tournaments', icon: '🏆' },
    { name: 'Teams', href: '/admin/teams', icon: '🛡️' },
    { name: 'Players', href: '/admin/players', icon: '👥' },
    { name: 'Venues', href: '/admin/venues', icon: '📍' },
    { name: 'Matches', href: '/admin/matches', icon: '⚽' },
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
  ];

  // Only a super admin can grant, revoke, or verify administrator access.
  if (admin.role === 'super_admin') {
    navLinks.push({ name: 'Admins', href: '/admin/admins', icon: '🔒' });
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#050505] font-outfit text-white">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        id="admin-sidebar"
        role={isSidebarOpen ? 'dialog' : undefined}
        aria-modal={isSidebarOpen ? true : undefined}
        aria-label="Admin navigation"
        className={`fixed left-0 top-0 z-[60] h-dvh w-64 max-w-[calc(100vw-2rem)] border-r border-white/5 bg-black/40 backdrop-blur-3xl transition-[transform,visibility] duration-300 lg:static lg:visible lg:translate-x-0 ${
        isSidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
      }`}
      >
        <div className="flex h-dvh flex-col overflow-hidden">
          {/* Logo Section - Fixed */}
          <div className="p-8 pb-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-600/20">SFM</div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tighter uppercase leading-none">Admin</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Portal</span>
              </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-neutral-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                aria-label="Close admin navigation"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>

          {/* Nav Section - Scrollable but with hidden scrollbar */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-8 scrollbar-hide" aria-label="Admin sections">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-4 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                      : 'text-neutral-500 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className="text-lg" aria-hidden="true">{link.icon}</span>
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer Section - Fixed */}
          <div className="p-8 space-y-4 border-t border-white/5 bg-black/20">
             <div className="px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">Signed in as</p>
                <p className="text-xs font-bold text-white truncate">{admin.name}</p>
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1 italic">{admin.role}</p>
             </div>
             
             <button
               type="button"
               onClick={() => { logout(); router.push('/login'); }}
               className="flex w-full items-center gap-4 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
             >
               <span aria-hidden="true">🚪</span> Logout
             </button>
             
             <Link href="/" className="flex w-full items-center gap-4 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-all italic">
                ← Public Site
             </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-black/40 py-6 px-4 sm:px-8 backdrop-blur-xl flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white">S</div>
              <span className="text-xs font-black uppercase tracking-widest">Admin Portal</span>
            </div>
            
            <button 
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
              aria-label="Open admin navigation"
              aria-expanded={isSidebarOpen}
              aria-controls="admin-sidebar"
            >
              <span className="text-xl" aria-hidden="true">☰</span>
            </button>
        </header>

        <div className="p-6 md:p-10 lg:p-16 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
