'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !admin) {
      router.push('/login');
    }
  }, [isHydrated, admin, router]);

  if (!isHydrated || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  const navLinks = [
    { name: 'Overview', href: '/admin/dashboard', icon: '📊' },
    { name: 'Teams', href: '/admin/teams', icon: '🛡️' },
    { name: 'Players', href: '/admin/players', icon: '👥' },
    { name: 'Matches', href: '/admin/matches', icon: '⚽' },
  ];

  // Only super_admin can manage other admins
  if (admin.role === 'super_admin') {
    navLinks.push({ name: 'Admins', href: '/admin/admins', icon: '🔒' });
  }

  return (
    <div className="flex min-h-screen bg-[#050505] font-outfit text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl lg:static lg:block hidden">
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
        <header className="sticky top-0 z-40 border-b border-white/5 bg-black/40 py-6 px-10 backdrop-blur-xl flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white">S</div>
              <span className="text-xs font-black uppercase tracking-widest">Admin Portal</span>
            </div>
            {/* Mobile menu could go here, but for now we focus on the core layout */}
        </header>

        <div className="p-6 md:p-10 lg:p-16 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
