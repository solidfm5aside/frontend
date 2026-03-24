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
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="text-3xl font-black tracking-tighter uppercase italic group cursor-default">
              CoJude <span className="text-blue-500 transition-colors group-hover:text-white">Solid FM</span>
            </div>
            <p className="max-w-xs text-center md:text-left text-[11px] font-black text-neutral-600 leading-relaxed uppercase tracking-widest">
              Supported by CoJude International Company. Nigeria's premier grassroots elite football event.
            </p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-700">
            &copy; {new Date().getFullYear()} CoJude Solid FM.
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
