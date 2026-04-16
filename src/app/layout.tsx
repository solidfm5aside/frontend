import './globals.css';
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

const siteConfig = {
  name: 'Solid FM 5-Aside',
  description: 'The premier league for 5-aside football in Nigeria. Elite competition, grassroots talent discovery, and professional tournament management.',
  url: 'https://solidfm5aside.com',
  ogImage: 'https://solidfm5aside.com/assets/logos/solid-5aside.png',
  keywords: [
    '5-aside football',
    'Solid FM Nigeria',
    'Football tournament Abuja',
    'Grassroots sports Nigeria',
    'Elite 5-aside league',
    'Solid FM 5-Aside',
    'CoJude Football'
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: 'Solid FM', url: siteConfig.url }],
  creator: 'Solid FM',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  alternates: {
    canonical: siteConfig.url,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${outfit.variable} font-sans min-h-screen bg-black text-neutral-50 antialiased`}>
        <Toaster theme="dark" position="bottom-right" richColors />
        {children}
      </body>
    </html>
  );
}
