'use client';

// ============================================================
// LazyShop - Home Page
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCartStore } from '@/lib/store';
import Navbar from '@/components/layout/Navbar';
import AIAssistant from '@/components/assistant/AIAssistant';
import ProductCard from '@/components/products/ProductCard';
import LoginModal from '@/components/ui/LoginModal';
import { getFeaturedProducts } from '@/lib/products';
import type { Product } from '@/types';

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const { items } = useCartStore();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    setFeatured(getFeaturedProducts());
  }, []);

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar onLoginClick={() => setShowLogin(true)} />

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-32 px-6">
        {/* Background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-amber-500/8 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 border border-stone-800 text-orange-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            AI-Powered Shopping Assistant
          </div>

          {/* Heading */}
          <h1 className="font-syne text-6xl md:text-8xl font-black text-stone-50 leading-[0.9] mb-6">
            Shop with your{' '}
            <span className="gradient-text">voice.</span>
          </h1>

          <p className="text-stone-400 text-xl max-w-2xl mx-auto mb-12 font-dm font-light leading-relaxed">
            LazyShop's AI assistant finds products, manages your cart, and checks you out —
            all through natural conversation. Just ask.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => router.push('/shop')}
              className="px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white font-syne font-bold text-lg rounded-2xl transition-all hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] active:scale-95"
            >
              Browse Products
            </button>
            {!isAuthenticated && (
              <button
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 bg-stone-900 hover:bg-stone-800 text-stone-100 font-syne font-bold text-lg rounded-2xl border border-stone-800 transition-all"
              >
                Sign In Free
              </button>
            )}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {['Voice Commands', 'AI Search', 'Smart Cart', 'Fast Checkout', 'OpenAI + Groq'].map(f => (
              <span key={f} className="px-4 py-2 rounded-xl bg-stone-900/60 border border-stone-800 text-stone-400 text-sm">
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-orange-400 text-sm font-medium font-syne uppercase tracking-widest mb-2">
              Curated picks
            </p>
            <h2 className="font-syne text-4xl font-bold text-stone-100">Featured Products</h2>
          </div>
          <button
            onClick={() => router.push('/shop')}
            className="text-orange-400 hover:text-orange-300 font-medium transition-colors flex items-center gap-2"
          >
            View all
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featured.map((product, i) => (
            <div
              key={product.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 80}ms`, opacity: 0, animationFillMode: 'forwards' }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Voice Feature Callout ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 p-12 text-center">
          <div className="absolute inset-0 bg-orange-500/5 rounded-3xl" />
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto rounded-full bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center mb-6 animate-float">
              <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="font-syne text-4xl font-bold text-stone-100 mb-4">
              Say it. Done.
            </h2>
            <p className="text-stone-400 text-lg max-w-xl mx-auto">
              "Find me wireless headphones under $200" — and watch LazyShop do the rest.
              Built with OpenAI and Groq for always-on reliability.
            </p>
          </div>
        </div>
      </section>

      {/* AI Assistant (floating) */}
      <AIAssistant />

      {/* Login Modal */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
