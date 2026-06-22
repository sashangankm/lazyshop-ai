'use client';

// ============================================================
// LazyShop - Cart Page
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import AIAssistant from '@/components/assistant/AIAssistant';
import { useCartStore, useAuthStore } from '@/lib/store';

export default function CartPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { items, setItems, removeItem, updateQuantity, getTotal, getCount, isLoading } = useCartStore();
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchCart = async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/cart?userId=${user.id}`);
        const data = await res.json();
        if (data.items) setItems(data.items);
      } catch (err) {
        console.error('Failed to fetch cart:', err);
      } finally {
        setFetching(false);
      }
    };

    fetchCart();
  }, [user, isAuthenticated, setItems]);

  const handleRemove = async (productId: string) => {
    removeItem(productId);
    if (user) {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId }),
      });
    }
  };

  const handleQuantity = async (productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
    if (user) {
      await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId, quantity }),
      });
    }
  };

  const total = getTotal();
  const count = getCount();

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-24">
        <h1 className="font-syne text-4xl font-bold text-stone-100 mb-2">Your Cart</h1>
        <p className="text-stone-500 mb-10">{count} {count === 1 ? 'item' : 'items'}</p>

        {!isAuthenticated ? (
          <div className="text-center py-24 bg-stone-900 rounded-3xl border border-stone-800">
            <p className="text-stone-400 text-lg mb-4">Sign in to view your cart</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl transition-colors"
            >
              Go to Home
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 bg-stone-900 rounded-3xl border border-stone-800">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-stone-400 text-lg mb-4">Your cart is empty</p>
            <button
              onClick={() => router.push('/shop')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <div
                  key={item.productId}
                  className="flex gap-4 p-4 bg-stone-900 rounded-2xl border border-stone-800 animate-slide-up"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-800 shrink-0">
                    <img
                      src={item.product?.image}
                      alt={item.product?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-syne font-semibold text-stone-100 truncate">
                      {item.product?.name}
                    </h3>
                    <p className="text-stone-500 text-sm capitalize">{item.product?.category}</p>
                    <p className="text-orange-400 font-bold mt-1">
                      ${item.product?.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => handleRemove(item.productId)}
                      className="text-stone-600 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <span className="text-stone-200 w-6 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 p-6 bg-stone-900 rounded-2xl border border-stone-800">
                <h2 className="font-syne font-bold text-stone-100 text-lg mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-stone-400 text-sm">
                    <span>Subtotal ({count} items)</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400 text-sm">
                    <span>Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>
                  <div className="border-t border-stone-800 pt-3 flex justify-between font-bold text-stone-100">
                    <span>Total</span>
                    <span className="text-orange-400">${total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/checkout')}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-syne font-bold rounded-xl transition-all hover:shadow-[0_0_24px_rgba(249,115,22,0.4)] active:scale-95"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={() => router.push('/shop')}
                  className="w-full mt-3 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AIAssistant />
    </div>
  );
}
