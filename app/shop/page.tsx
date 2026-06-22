'use client';

// ============================================================
// LazyShop - Shop Page
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import AIAssistant from '@/components/assistant/AIAssistant';
import ProductCard from '@/components/products/ProductCard';
import { getAllProducts, searchProducts } from '@/lib/products';
import type { Product, SearchFilters } from '@/types';

const CATEGORIES = ['all', 'electronics', 'furniture', 'clothing', 'lifestyle', 'kitchen'];
const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'A–Z' },
];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 600 });
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = useCallback(() => {
    const results = searchProducts({
      query: searchQuery,
      category: activeCategory === 'all' ? undefined : activeCategory,
      priceRange: { min: priceRange.min, max: priceRange.max },
      sortBy: sortBy as any || undefined,
    });
    setProducts(results);
  }, [searchQuery, activeCategory, sortBy, priceRange]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne text-4xl font-bold text-stone-100 mb-2">Shop</h1>
          <p className="text-stone-500">{products.length} products</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-8">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products... (or ask the AI assistant!)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-stone-900 border border-stone-800 rounded-2xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-500/60 transition-colors font-dm"
          />
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-syne font-bold text-stone-300 mb-3 text-sm uppercase tracking-wider">Category</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm capitalize transition-all ${
                        activeCategory === cat
                          ? 'bg-orange-500/20 text-orange-400 font-medium'
                          : 'text-stone-400 hover:text-stone-300 hover:bg-stone-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <h3 className="font-syne font-bold text-stone-300 mb-3 text-sm uppercase tracking-wider">Price Range</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-stone-400">
                    <span>${priceRange.min}</span>
                    <span>${priceRange.max}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={600}
                    value={priceRange.max}
                    onChange={e => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="font-syne font-bold text-stone-300 mb-3 text-sm uppercase tracking-wider">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 text-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500/60"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {/* Mobile category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 lg:hidden mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm capitalize transition-all ${
                    activeCategory === cat
                      ? 'bg-orange-500 text-white font-medium'
                      : 'bg-stone-900 text-stone-400 border border-stone-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {products.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-stone-500 text-lg mb-2">No products found</p>
                <p className="text-stone-600 text-sm">Try adjusting your filters or use the AI assistant</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product, i) => (
                  <div
                    key={product.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${Math.min(i * 50, 400)}ms`, opacity: 0, animationFillMode: 'forwards' }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AIAssistant />
    </div>
  );
}
