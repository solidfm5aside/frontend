'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const firstEditionImages = [
  "first01.jpeg", "first02.jpeg", "first03.jpeg", "first04.jpeg", "first05.jpeg",
  "first06.jpeg", "first07.jpeg", "first08.jpeg", "first09.jpeg"
];

const secondEditionImages = [
  "second01.jpeg",
  "second02.jpeg",
  "second03.jpeg",
  "second04.jpeg",
  "second05.jpeg",
  "second06.jpeg",
  "second07.jpeg",
  "second08.jpeg",
  "second09.jpeg",
  "second10.jpeg",
  "second11.jpeg",
  "second12.jpeg"
];

const allImages = [
  ...firstEditionImages.map(img => ({ name: img, edition: 'Edition 1.0', path: `/assets/editions/first/${img}` })),
  ...secondEditionImages.map(img => ({ name: img, edition: 'Edition 2.0', path: `/assets/editions/second/${img}` }))
];

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<typeof allImages[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'edition1' | 'edition2'>('all');

  const filteredImages = allImages.filter(img => {
    if (activeTab === 'all') return true;
    if (activeTab === 'edition1') return img.edition === 'Edition 1.0';
    if (activeTab === 'edition2') return img.edition === 'Edition 2.0';
    return true;
  });

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col bg-black font-outfit text-white min-h-screen relative overflow-hidden">
      {/* Hero Header */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container mx-auto max-w-7xl relative z-10 text-center animate-reveal">
           <h1 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.5em] text-blue-500 mb-6 italic">The Archive</h1>
           <h2 className="text-5xl md:text-9xl font-black italic tracking-tighter uppercase mb-8 leading-tight">The <span className="text-neutral-800">Legacy.</span></h2>
           <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-400 font-medium italic border-t border-white/10 pt-8">
             Exploring every tackle, every celebration, and every moment of glory from all previous editions.
           </p>

           <div className="mt-16 flex flex-wrap justify-center gap-4">
              {(['all', 'edition1', 'edition2'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === tab 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-110' 
                    : 'bg-white/5 text-neutral-500 hover:bg-white/10'
                  }`}
                >
                  {tab === 'all' ? 'All Editions' : tab === 'edition1' ? 'Edition 1.0' : 'Edition 2.0'}
                </button>
              ))}
           </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-20 md:py-32 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {filteredImages.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative group overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.02] transition-all hover:scale-[1.02] hover:-rotate-1 reveal-on-scroll stagger-${(idx % 4) + 1} cursor-zoom-in group`}
                onClick={() => setSelectedImage(img)}
              >
                <img 
                  src={img.path} 
                  alt={`Solid FM ${img.edition} Highlight ${idx + 1}`} 
                  className="w-full h-auto object-cover transition-all duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{img.edition}</span>
                   <span className="text-[8px] font-medium uppercase tracking-[0.3em] text-neutral-400">View Frame</span>
                </div>
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 opacity-60">
                   <span className="text-[8px] font-black uppercase text-white">{img.edition === 'Edition 1.0' ? '1.0' : '2.0'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox / Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-10 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center">
             <img 
               src={selectedImage.path} 
               alt={`${selectedImage.edition} Full View`} 
               className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl mb-4"
             />
             <div className="text-center">
                <span className="text-blue-500 font-black uppercase tracking-[0.5em] text-xs italic block mb-2">{selectedImage.edition}</span>
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">SolidFM 5-Aside Archive</span>
             </div>
             <button 
                className="absolute top-0 right-0 p-4 text-white text-4xl font-black hover:text-blue-500 transition-colors"
                onClick={() => setSelectedImage(null)}
             >
               ×
             </button>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <section className="py-24 md:py-40 bg-neutral-950 border-t border-white/5">
         <div className="container mx-auto max-w-7xl text-center reveal-on-scroll px-6">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-10 leading-tight">Ready to join the archive?</h2>
            <Link href="/register-team" className="inline-flex h-16 md:h-20 items-center justify-center rounded-3xl bg-blue-600 px-10 md:px-16 text-lg md:text-xl font-black uppercase italic tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-600/30">
               Register Team Now
            </Link>
         </div>
      </section>
    </div>
  );
}
