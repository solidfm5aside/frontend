'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const images = [
  "BQ3A5250.MOV.06_57_37_19.Still001.jpg.jpeg",
  "BQ3A5250.MOV.06_58_33_21.Still002.jpg.jpeg",
  "BQ3A5274.MOV.06_59_44_12.Still001.jpg.jpeg",
  "BQ3A5274.MOV.06_59_59_19.Still002.jpg.jpeg",
  "BQ3A5276.MOV.07_00_18_16.Still001.jpg.jpeg",
  "BQ3A5277.MOV.07_00_25_27.Still001.jpg.jpeg",
  "BQ3A5280.MOV.07_00_52_01.Still001.jpg.jpeg",
  "BQ3A5281.MOV.07_01_01_23.Still001.jpg.jpeg",
  "BQ3A5282.MOV.07_01_11_21.Still001.jpg.jpeg",
  "BQ3A5283.MOV.07_01_25_10.Still001.jpg.jpeg",
  "BQ3A5285.MOV.07_01_35_06.Still001.jpg.jpeg",
  "BQ3A5288.MOV.07_02_15_08.Still001.jpg.jpeg",
  "BQ3A5292.MOV.07_03_24_04.Still001.jpg.jpeg",
  "BQ3A5304.MOV.07_04_07_05.Still001.jpg.jpeg",
  "BQ3A5318.MOV.07_06_32_02.Still001.jpg.jpeg",
  "BQ3A5348.MOV.07_11_43_00.Still001.jpg.jpeg",
  "BQ3A5351.MOV.07_12_00_28.Still001.jpg.jpeg",
  "BQ3A5352.MOV.07_12_11_05.Still001.jpg.jpeg",
  "BQ3A5353.MOV.07_12_18_07.Still001.jpg.jpeg",
  "BQ3A5355.MOV.07_12_31_24.Still001.jpg.jpeg",
  "BQ3A5376.MOV.07_17_22_10.Still001.jpg.jpeg",
  "BQ3A5406.MOV.07_23_16_25.Still001.jpg.jpeg",
  "BQ3A5466.MOV.07_27_10_01.Still001.jpg.jpeg",
  "BQ3A5468.MOV.07_27_25_12.Still001.jpg.jpeg",
  "BQ3A5473.MOV.07_30_05_12.Still001.jpg.jpeg",
  "BQ3A5475.MOV.07_33_55_10.Still001.jpg.jpeg",
  "BQ3A5478.MOV.07_35_13_00.Still001.jpg.jpeg",
  "BQ3A5483.MOV.07_37_14_14.Still002.jpg.jpeg",
  "BQ3A5484.MOV.07_37_29_27.Still001.jpg.jpeg",
  "BQ3A5492.MOV.07_37_50_17.Still001.jpg.jpeg",
  "BQ3A5494.MOV.07_39_29_10.Still001.jpg.jpeg",
  "BQ3A5496.MOV.07_40_50_03.Still001.jpg.jpeg",
  "BQ3A5497.MOV.07_41_05_15.Still001.jpg.jpeg",
  "BQ3A5497.MOV.07_41_28_26.Still002.jpg.jpeg",
];

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
           <h2 className="text-5xl md:text-9xl font-black italic tracking-tighter uppercase mb-8 leading-tight">Edition <span className="text-neutral-800">2.0.</span></h2>
           <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-400 font-medium italic border-t border-white/10 pt-8">
             Every tackle, every celebration, every moment of glory from our previous season.
           </p>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-20 md:py-32 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {images.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative group overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.02] transition-all hover:scale-[1.02] hover:-rotate-1 reveal-on-scroll stagger-${(idx % 4) + 1} cursor-zoom-in`}
                onClick={() => setSelectedImage(img)}
              >
                <img 
                  src={`/assets/last-edition/${img}`} 
                  alt={`Solid FM Edition 2.0 History ${idx + 1}`} 
                  className="w-full h-auto object-cover transition-all duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                   <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">View Frame</span>
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
          <div className="relative max-w-6xl w-full h-full flex items-center justify-center">
             <img 
               src={`/assets/last-edition/${selectedImage}`} 
               alt="Gallery Full View" 
               className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
             />
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
