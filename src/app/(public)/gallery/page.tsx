'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRevealOnScroll } from '@/hooks/use-reveal-on-scroll';

interface GalleryImage {
  name: string;
  edition: 'Edition 1.0' | 'Edition 2.0';
  path: string;
  width: number;
  height: number;
}

const FIRST_EDITION_IMAGES = [
  { name: 'first01.jpeg', width: 2560, height: 1920 },
  { name: 'first02.jpeg', width: 2560, height: 1920 },
  { name: 'first03.jpeg', width: 2560, height: 1706 },
  { name: 'first04.jpeg', width: 2560, height: 1706 },
  { name: 'first05.jpeg', width: 1706, height: 2560 },
  { name: 'first06.jpeg', width: 1920, height: 2560 },
  { name: 'first07.jpeg', width: 2560, height: 1920 },
  { name: 'first08.jpeg', width: 1920, height: 2560 },
  { name: 'first09.jpeg', width: 1600, height: 1066 },
];

const SECOND_EDITION_IMAGES = [
  { name: 'second01.jpeg', width: 1408, height: 967 },
  { name: 'second02.jpeg', width: 1824, height: 940 },
  { name: 'second03.jpeg', width: 1754, height: 1034 },
  { name: 'second04.jpeg', width: 1920, height: 1080 },
  { name: 'second05.jpeg', width: 1879, height: 920 },
  { name: 'second06.jpeg', width: 1557, height: 983 },
  { name: 'second07.jpeg', width: 1637, height: 921 },
  { name: 'second08.jpeg', width: 1637, height: 921 },
  { name: 'second09.jpeg', width: 1788, height: 1006 },
  { name: 'second10.jpeg', width: 1711, height: 962 },
  { name: 'second11.jpeg', width: 1794, height: 1009 },
  { name: 'second12.jpeg', width: 1816, height: 1031 },
];

const ALL_IMAGES: GalleryImage[] = [
  ...FIRST_EDITION_IMAGES.map((image) => ({
    ...image,
    edition: 'Edition 1.0' as const,
    path: `/assets/editions/first/${image.name}`,
  })),
  ...SECOND_EDITION_IMAGES.map((image) => ({
    ...image,
    edition: 'Edition 2.0' as const,
    path: `/assets/editions/second/${image.name}`,
  })),
];

type GalleryTab = 'all' | 'edition1' | 'edition2';

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [activeTab, setActiveTab] = useState<GalleryTab>('all');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const filteredImages = ALL_IMAGES.filter((image) => {
    if (activeTab === 'edition1') return image.edition === 'Edition 1.0';
    if (activeTab === 'edition2') return image.edition === 'Edition 2.0';
    return true;
  });

  useRevealOnScroll([activeTab]);

  useEffect(() => {
    if (!selectedImage) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedImage(null);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [selectedImage]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-outfit text-white">
      <section className="relative overflow-hidden border-b border-white/5 px-6 py-20 sm:py-24 md:py-32">
        <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl"></div>
        <div className="container relative z-10 mx-auto max-w-7xl text-center animate-reveal">
          <h1 className="mb-6 text-[10px] font-bold uppercase tracking-[0.5em] text-blue-500 italic md:text-sm">The Archive</h1>
          <h2 className="mb-8 text-4xl font-black uppercase leading-tight tracking-tighter italic sm:text-6xl md:text-9xl">The <span className="text-neutral-800">Legacy.</span></h2>
          <p className="mx-auto max-w-xl border-t border-white/10 pt-8 text-sm font-medium text-neutral-400 italic md:text-lg">
            Exploring every tackle, every celebration, and every moment of glory from all previous editions.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-3 sm:mt-16 sm:gap-4" role="group" aria-label="Filter gallery by edition">
            {(['all', 'edition1', 'edition2'] as const).map((tab) => {
              const label = tab === 'all' ? 'All Editions' : tab === 'edition1' ? 'Edition 1.0' : 'Edition 2.0';
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={isActive}
                  className={`min-h-11 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all sm:px-8 sm:text-xs ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 sm:scale-110'
                      : 'bg-white/5 text-neutral-500 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="content-auto px-4 py-16 sm:py-20 md:px-6 md:py-32" aria-label="Tournament photo archive">
        <div className="container mx-auto max-w-7xl">
          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
            {filteredImages.map((image, index) => (
              <button
                key={image.path}
                type="button"
                onClick={() => setSelectedImage(image)}
                aria-label={`Open ${image.edition} photo ${index + 1}`}
                aria-haspopup="dialog"
                className={`group relative mb-6 block w-full break-inside-avoid cursor-zoom-in overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.02] text-left transition-all hover:scale-[1.02] hover:-rotate-1 reveal-on-scroll stagger-${(index % 4) + 1}`}
              >
                <Image
                  src={image.path}
                  alt={`Solid FM ${image.edition} highlight ${index + 1}`}
                  width={image.width}
                  height={image.height}
                  sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                  className="h-auto w-full object-cover transition-all duration-700 group-hover:scale-110 motion-reduce:transform-none"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-400">{image.edition}</span>
                  <span className="text-[8px] font-medium uppercase tracking-[0.3em] text-neutral-400">View Frame</span>
                </div>
                <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 opacity-60 backdrop-blur-md">
                  <span className="text-[8px] font-black uppercase text-white">{image.edition === 'Edition 1.0' ? '1.0' : '2.0'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-lightbox-title"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl animate-fade-in md:p-10"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedImage(null);
          }}
        >
          <div className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center">
            <h2 id="gallery-lightbox-title" className="sr-only">{selectedImage.edition} photo viewer</h2>
            <Image
              src={selectedImage.path}
              alt={`${selectedImage.edition} full view`}
              width={selectedImage.width}
              height={selectedImage.height}
              sizes="100vw"
              priority
              className="mb-4 h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <div className="text-center">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.5em] text-blue-500 italic">{selectedImage.edition}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">SolidFM 5-Aside Archive</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close photo viewer"
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl bg-black/60 text-4xl font-black text-white transition-colors hover:text-blue-500"
              onClick={() => setSelectedImage(null)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      )}

      <section className="content-auto border-t border-white/5 bg-neutral-950 py-24 md:py-40">
        <div className="container mx-auto max-w-7xl px-6 text-center reveal-on-scroll">
          <h2 className="mb-10 text-3xl font-black uppercase leading-tight tracking-tighter italic md:text-5xl">Ready to join the archive?</h2>
          <Link href="/register-team" className="inline-flex min-h-16 items-center justify-center rounded-3xl bg-blue-600 px-8 text-base font-black uppercase tracking-widest text-white italic shadow-2xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 motion-reduce:transform-none md:h-20 md:px-16 md:text-xl">
            Register Team Now
          </Link>
        </div>
      </section>
    </div>
  );
}
