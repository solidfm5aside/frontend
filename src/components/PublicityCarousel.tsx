'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import apiClient from '@/lib/api-client';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';

interface Ad {
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
}

export default function PublicityCarousel() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default fallback ad if none are set in admin
  const defaultAd: Ad = {
    title: "Partner with Solid FM 5-Aside",
    imageUrl: "/assets/publicity/banner1.png",
    link: "/register-team",
    isActive: true
  };

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response: any = await apiClient.get('/settings');
        if (response.success && response.data?.landing_ads && response.data.landing_ads.length > 0) {
          const activeAds = response.data.landing_ads.filter((ad: Ad) => ad.isActive);
          setAds(activeAds.length > 0 ? activeAds : [defaultAd]);
        } else {
          setAds([defaultAd]);
        }
      } catch (error) {
        console.error('Failed to fetch ads:', error);
        setAds([defaultAd]);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchAds();
  }, []);

  // Handle intersection observer locally for this component
  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = containerRef.current.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isLoaded, ads]);

  useEffect(() => {
    if (ads.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [ads, isHovered]);

  if (!isLoaded || ads.length === 0) return null;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % ads.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? ads.length - 1 : prev - 1));

  return (
    <section 
      ref={containerRef}
      className="py-20 md:py-40 bg-black relative overflow-hidden px-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6 reveal-on-scroll">
           <div>
             <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.5em] text-blue-500 italic">Strategic Publicity</h2>
             </div>
             <h3 className="text-5xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-[0.85]">
               Brand <br /><span className="text-neutral-800">Spotlight.</span>
             </h3>
           </div>
           
           {ads.length > 1 && (
             <div className="flex items-center gap-3">
               <button onClick={prevSlide} className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                 <ChevronLeft className="h-6 w-6" />
               </button>
               <button onClick={nextSlide} className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                 <ChevronRight className="h-6 w-6" />
               </button>
             </div>
           )}
        </div>

        <div className="relative aspect-[16/9] md:aspect-[21/9] w-full group overflow-hidden rounded-[32px] md:rounded-[60px] border border-white/10 shadow-2xl reveal-on-scroll">
           {ads.map((ad, idx) => (
             <div 
               key={idx}
               className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
                 currentIndex === idx ? 'opacity-100 scale-100 translate-x-0 bg-neutral-900' : 
                 currentIndex < idx ? 'opacity-0 scale-110 translate-x-full' : 'opacity-0 scale-110 -translate-x-full'
               }`}
             >
                <Link href={ad.link || '#'} target={ad.link.startsWith('http') ? "_blank" : "_self"} className="block relative h-full w-full">
                  {ad.imageUrl ? (
                    <Image 
                      src={ad.imageUrl} 
                      alt={ad.title} 
                      fill 
                      priority={idx === 0}
                      className={`object-cover transition-transform duration-[10000ms] ease-linear ${currentIndex === idx ? 'animate-slow-zoom' : ''}`}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                      <Sparkles className="h-12 w-12 text-blue-500/20" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  
                  <div className="absolute bottom-10 left-10 md:bottom-20 md:left-20 max-w-2xl px-4 md:px-0">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest mb-6">
                      Featured Partner
                    </div>
                    <h4 className="text-3xl md:text-7xl font-black text-white italic tracking-tighter uppercase mb-8 leading-[0.9] drop-shadow-2xl">
                      {ad.title}
                    </h4>
                    <div className="inline-flex items-center gap-3 text-white text-xs md:text-sm font-black uppercase tracking-[0.3em] group/btn">
                      Explore Partnership <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-2" />
                    </div>
                  </div>
                </Link>
             </div>
           ))}

           {/* Indicators */}
           <div className="absolute bottom-10 right-10 flex gap-2 z-20">
              {ads.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 transition-all duration-500 rounded-full ${currentIndex === idx ? 'w-10 bg-blue-500' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                />
              ))}
           </div>
        </div>
      </div>

      <style jsx>{`
        .animate-slow-zoom {
          animation: slowZoom 30s linear infinite alternate;
        }
        @keyframes slowZoom {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
      `}</style>
    </section>
  );
}
