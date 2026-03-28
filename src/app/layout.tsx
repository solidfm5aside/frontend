import './globals.css';
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';

import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'CoJude Solid FM | Elite 5-Aside Tournament',
  description: 'The premier league for 5-aside football. Grassroots talent discovery supported by CoJude International.',
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
