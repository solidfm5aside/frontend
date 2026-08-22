'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/#vision' },
  { name: 'Results', href: '/results' },
  { name: 'Fixtures', href: '/fixtures' },
  { name: 'Standings', href: '/standings' },
  { name: 'Bracket', href: '/bracket' },
  { name: 'Gallery', href: '/gallery' },
];

function isNavLinkActive(href: string, pathname: string, activeHash: string) {
  const [linkBase, hash = ''] = href.split('#');
  const linkHash = hash ? `#${hash}` : '';

  if (href === '/') return pathname === '/' && !activeHash;
  if (linkHash) return pathname === linkBase && activeHash === linkHash;
  return pathname === linkBase || pathname.startsWith(`${linkBase}/`);
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [menuPathname, setMenuPathname] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [renderedPathname, setRenderedPathname] = useState(pathname);

  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    if (menuPathname !== null) setMenuPathname(null);
  }

  const isMenuOpen = menuPathname === pathname;

  useEffect(() => {
    const handleScroll = () => {
      const nextValue = window.scrollY > 10;
      setIsScrolled((currentValue) => currentValue === nextValue ? currentValue : nextValue);
    };
    const handleHashChange = () => {
      setActiveHash(window.location.hash);
      setMenuPathname(null);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    const initialSyncFrame = window.requestAnimationFrame(() => {
      handleScroll();
      handleHashChange();
    });

    return () => {
      window.cancelAnimationFrame(initialSyncFrame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      menuPanelRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    });
    const desktopQuery = window.matchMedia('(min-width: 1280px)');

    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuPathname(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuPathname(null);
        return;
      }

      if (event.key !== 'Tab' || !menuPanelRef.current) return;

      const menuLinks = Array.from(
        menuPanelRef.current.querySelectorAll<HTMLElement>('a[href]')
      );
      const focusable = menuButton
        ? [menuButton, ...menuLinks]
        : menuLinks;

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
  }, [isMenuOpen]);

  const closeMenu = () => setMenuPathname(null);
  const toggleMenu = () => setMenuPathname((openPathname) => openPathname === pathname ? null : pathname);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled || isMenuOpen ? 'border-b border-white/10 bg-black py-3' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-hidden={isMenuOpen ? true : undefined}
          tabIndex={isMenuOpen ? -1 : undefined}
          className="group flex min-h-11 shrink-0 items-center gap-2.5 sm:gap-3"
          onClick={() => {
            closeMenu();
            setActiveHash('');
          }}
          aria-label="Solid FM 5-Aside home"
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-[#FFD700] shadow-lg shadow-yellow-500/20 transition-transform group-hover:scale-110 motion-reduce:transform-none sm:h-12 sm:w-12">
            <Image
              src="/assets/logos/solid-5aside.png"
              alt=""
              fill
              sizes="(max-width: 639px) 40px, 48px"
              className="object-cover"
            />
          </div>
          <span className="text-lg font-black uppercase leading-none tracking-tighter text-white sm:text-xl">
            Solid FM <span className="text-[#FFD700]">5-Aside</span>
          </span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 transform xl:block" aria-label="Primary navigation">
          <ul className="flex space-x-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 2xl:space-x-10 2xl:text-[11px] 2xl:tracking-[0.25em]">
            {NAV_LINKS.map((link) => {
              const linkHash = link.href.includes('#') ? `#${link.href.split('#')[1]}` : '';
              const isActive = isNavLinkActive(link.href, pathname, activeHash);

              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => setActiveHash(linkHash)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative py-2 transition-all duration-300 hover:text-white ${isActive ? 'text-[#FFD700]' : ''}`}
                  >
                    {link.name}
                    <span aria-hidden="true" className={`absolute -bottom-1 left-0 h-1 bg-[#FFD700] transition-all duration-300 ${isActive ? 'w-full opacity-100 shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-50'}`}></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/register-team"
            aria-hidden={isMenuOpen ? true : undefined}
            tabIndex={isMenuOpen ? -1 : undefined}
            onClick={closeMenu}
            className="hidden rounded-2xl bg-[#FFD700] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-600/20 transition-all hover:scale-105 hover:bg-white active:scale-95 motion-reduce:transform-none sm:inline-flex 2xl:px-7 2xl:text-[11px]"
          >
            Men&apos;s Registration
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={toggleMenu}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 xl:hidden"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMenuOpen ? (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          ref={menuPanelRef}
          id="mobile-navigation"
          className="fixed inset-x-0 bottom-0 top-[64px] z-40 overflow-y-auto overscroll-contain bg-black animate-reveal sm:top-[72px] xl:hidden"
        >
          <nav className="container mx-auto px-6 py-10 sm:px-10 sm:py-16" aria-label="Mobile navigation links">
            <ul className="flex flex-col gap-8 text-2xl font-black italic uppercase tracking-tighter text-white sm:gap-10">
              {NAV_LINKS.map((link) => {
                const linkHash = link.href.includes('#') ? `#${link.href.split('#')[1]}` : '';
                const isActive = isNavLinkActive(link.href, pathname, activeHash);

                return (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      onClick={() => {
                        closeMenu();
                        setActiveHash(linkHash);
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex min-h-11 items-center gap-4 transition-colors ${isActive ? 'text-[#FFD700]' : 'hover:text-white/60'}`}
                    >
                      {isActive && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#FFD700] animate-pulse motion-reduce:animate-none"></span>}
                      {link.name}
                    </Link>
                  </li>
                );
              })}
              <li className="border-t border-white/10 pt-8 sm:pt-10">
                <Link href="/register-team" onClick={closeMenu} className="flex min-h-11 items-center text-blue-500">Register Men&apos;s Team</Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
