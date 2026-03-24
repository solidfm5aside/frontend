'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('hashchange', handleHashChange);
    
    // Initial check
    handleHashChange();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/#vision' },
    { name: 'Fixtures', href: '/fixtures' },
    { name: 'Standings', href: '/standings' },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled || isMenuOpen ? 'border-b border-white/10 bg-black py-3' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-6">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0" onClick={() => setActiveHash('')}>
          <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[#FFD700] shadow-lg shadow-yellow-500/20 transition-transform group-hover:scale-110">
            <Image 
              src="/assets/logos/solid-5aside.png" 
              alt="Solid 5-Aside Badge" 
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">
              Solid FM <span className="text-[#FFD700]">5-Aside</span>
            </h1>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 transform lg:block">
          <ul className="flex space-x-10 text-[11px] font-black uppercase tracking-[0.25em] text-neutral-400">
            {navLinks.map((link) => {
              const linkBase = link.href.split('#')[0];
              const linkHash = link.href.includes('#') ? '#' + link.href.split('#')[1] : '';
              
              let isActive = false;
              if (link.href === '/') {
                isActive = pathname === '/' && !activeHash;
              } else if (linkHash) {
                isActive = pathname === linkBase && activeHash === linkHash;
              } else {
                isActive = pathname.startsWith(linkBase) && pathname !== '/';
              }

              return (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    onClick={() => setActiveHash(linkHash)}
                    className={`relative py-2 transition-all duration-300 hover:text-white ${isActive ? 'text-[#FFD700]' : ''} group`}
                  >
                    {link.name}
                    <span className={`absolute -bottom-1 left-0 h-1 bg-[#FFD700] transition-all duration-300 ${isActive ? 'w-full opacity-100 shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-50'}`}></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Link 
            href="/register-team" 
            className="hidden sm:inline-flex rounded-2xl bg-[#FFD700] px-7 py-3 text-[11px] font-black uppercase tracking-widest text-black transition-all hover:bg-white hover:scale-105 active:scale-95 shadow-xl shadow-yellow-600/20"
          >
            Register Now
          </Link>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={toggleMenu}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white lg:hidden"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-x-0 top-[72px] bottom-0 z-40 lg:hidden bg-black animate-reveal">
          <nav className="container mx-auto px-10 py-16">
            <ul className="flex flex-col gap-10 text-2xl font-black italic uppercase tracking-tighter text-white">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} onClick={() => { toggleMenu(); setActiveHash(link.href.includes('#') ? '#' + link.href.split('#')[1] : ''); }} className="hover:text-blue-500 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
              <li className="pt-10 border-t border-white/10">
                <Link href="/register-team" onClick={toggleMenu} className="text-blue-500">Register Your Team</Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
