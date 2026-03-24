import Header from '@/components/Header';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-white/5 bg-black py-20 px-6 overflow-hidden">
        <div className="container mx-auto max-w-7xl relative z-10 flex flex-col items-center justify-between gap-12 md:flex-row">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3 cursor-default">
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#FFD700] shadow-lg shadow-yellow-500/20">
                <img 
                  src="/assets/logos/solid-5aside.png" 
                  alt="Solid 5-Aside Badge" 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-2xl font-black tracking-tighter uppercase leading-none text-white">
                Solid FM <span className="text-[#FFD700]">5-Aside</span>
              </div>
            </div>
            <p className="max-w-xs text-center md:text-left text-[11px] font-black text-neutral-500 leading-relaxed uppercase tracking-widest">
              Title Sponsor: CoJude International. Nigeria's premier grassroots elite football event.
            </p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-700">
            &copy; {new Date().getFullYear()} Solid 5-Aside Football Tournament.
          </div>
          <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
            <a href="#" className="hover:text-blue-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
