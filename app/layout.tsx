// ============================================================
// LazyShop - Root Layout
// ============================================================

import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'LazyShop — AI-Powered Shopping',
  description: 'Shop smarter with your voice. LazyShop uses AI to help you find products, manage your cart, and checkout — all hands-free.',
  keywords: 'AI shopping, voice commerce, lazy shop, ecommerce',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="font-dm bg-stone-950 text-stone-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
