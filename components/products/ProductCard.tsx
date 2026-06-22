'use client';

// ============================================================
// LazyShop - Product Card Component
// ============================================================

import { useState } from 'react';
import { useCartStore, useAuthStore, useUIStore } from '@/lib/store';
import type { Product } from '@/types';
import { speak } from '@/lib/hooks/useVoice';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const { addNotification } = useUIStore();
  const [adding, setAdding] = useState(false);
  const [imageError, setImageError] = useState(false);

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding) return;

    setAdding(true);
    try {
      // Optimistic UI update
      addItem({
        productId: product.id,
        product,
        quantity: 1,
        addedAt: new Date(),
      });

      // Sync to server if logged in
      if (isAuthenticated && user) {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, productId: product.id, quantity: 1 }),
        });
      }

      addNotification({ type: 'success', message: `Added "${product.name}" to cart!` });
      speak(`Added ${product.name} to your cart`);
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to add to cart' });
    } finally {
      setTimeout(() => setAdding(false), 800);
    }
  };

  return (
    <div className="group relative bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden card-hover">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-stone-800">
        {!imageError ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-600">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg">
            -{discount}%
          </div>
        )}

        {/* Quick add button (appears on hover) */}
        <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm transition-colors"
          >
            {adding ? '✓ Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-syne font-semibold text-stone-100 text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>

        <p className="text-stone-600 text-xs capitalize mb-3">{product.category}</p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'text-amber-400' : 'text-stone-700'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-stone-500 text-xs">({product.reviews.toLocaleString()})</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-syne font-bold text-orange-400 text-lg">${product.price.toFixed(2)}</span>
          {product.originalPrice > product.price && (
            <span className="text-stone-600 text-sm line-through">${product.originalPrice.toFixed(2)}</span>
          )}
        </div>

        {/* Stock */}
        {product.stock <= 10 && (
          <p className="text-red-400 text-xs mt-2">Only {product.stock} left!</p>
        )}
      </div>
    </div>
  );
}
