'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);



  useEffect(() => {
    if (hasHydrated) {
      if (!admin) {
        router.push('/login');
      } else if (admin.role !== 'admin' && admin.role !== 'super_admin') {
        // Logged in but not an admin (e.g., viewer)
        router.push('/');
      }
    }
  }, [hasHydrated, admin, router]);


  if (!hasHydrated || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
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
              Your admin access is currently in the "Review" queue. A Super Admin will verify your credentials shortly.
           </p>
           
           <div className="space-y-4">
              <Link href="/" className="flex w-full h-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
                 ← Return to Public Site
              </Link>
              <button 
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
  ];

  // Only super_admin can manage other admins and global settings
  if (admin.role === 'super_admin') {
    navLinks.push({ name: 'Admins', href: '/admin/admins', icon: '🔒' });
    navLinks.push({ name: 'Settings', href: '/admin/settings', icon: '⚙️' });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] font-outfit text-white">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl transition-transform duration-300 lg:static lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-screen flex-col overflow-hidden">
          {/* Logo Section - Fixed */}
          <div className="p-8 pb-12">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-600/20">SFM</div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tighter uppercase leading-none">Admin</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Portal</span>
              </div>
            </div>
          </div>

          {/* Nav Section - Scrollable but with hidden scrollbar */}
          <nav className="flex-1 space-y-2 px-8 overflow-y-auto scrollbar-hide">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-4 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                      : 'text-neutral-500 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className="text-lg">{link.icon}</span>
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
               onClick={() => { logout(); router.push('/login'); }}
               className="flex w-full items-center gap-4 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
             >
               <span>🚪</span> Logout
             </button>
             
             <Link href="/" className="flex w-full items-center gap-4 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-all italic">
                ← Public Site
             </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-black/40 py-6 px-4 sm:px-8 backdrop-blur-xl flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white">S</div>
              <span className="text-xs font-black uppercase tracking-widest">Admin Portal</span>
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
              <span className="text-xl">☰</span>
            </button>
        </header>

        <div className="p-6 md:p-10 lg:p-16 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
