import Header from '@/components/Header';
import AnnouncementBar from '@/components/AnnouncementBar';
import Image from 'next/image';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[200] -translate-y-24 rounded-xl bg-[#FFD700] px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <footer className="overflow-hidden border-t border-white/5 bg-black px-6 py-14 sm:py-20">
        <div className="container relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 lg:flex-row lg:gap-12">
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <div className="flex items-center gap-3 cursor-default">
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#FFD700] shadow-lg shadow-yellow-500/20">
                <Image
                  src="/assets/logos/solid-5aside.png"
                  alt="Solid 5-Aside Badge"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-2xl font-black tracking-tighter uppercase leading-none text-white">
                Solid FM <span className="text-[#FFD700]">5-Aside</span>
              </div>
            </div>
            <p className="max-w-xs text-center text-[11px] font-black uppercase leading-relaxed tracking-widest text-neutral-500 lg:text-left">
              Title Sponsor: CoJude International. Nigeria&apos;s premier grassroots elite football event.
            </p>
          </div>
          <div className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-neutral-700 sm:tracking-[0.4em]">
            &copy; {new Date().getFullYear()} Solid 5-Aside Football Tournament.
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 sm:gap-x-10">
            <span className="inline-flex min-h-11 items-center">Privacy</span>
            <span className="inline-flex min-h-11 items-center">Terms</span>
            <span className="inline-flex min-h-11 items-center">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
