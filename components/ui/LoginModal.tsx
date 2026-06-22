'use client';

// ============================================================
// LazyShop - Login Modal Component
// ============================================================

import { useState } from 'react';
import { useAuthStore, useCartStore } from '@/lib/store';

interface LoginModalProps {
  onClose: () => void;
}

const DEMO_USERS = [
  { email: 'demo@lazyshop.com', name: 'Alex Demo' },
  { email: 'user@example.com', name: 'Jane User' },
];

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login } = useAuthStore();
  const { setItems } = useCartStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (emailVal: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login failed');

      login(data.user);

      // Fetch cart for user
      const cartRes = await fetch(`/api/cart?userId=${data.user.id}`);
      const cartData = await cartRes.json();
      if (cartData.items) setItems(cartData.items);

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) handleLogin(email.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-stone-950 border border-stone-800 rounded-3xl p-8 shadow-2xl animate-slide-up">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-600 hover:text-stone-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="font-syne font-black text-2xl text-stone-100">Welcome to LazyShop</h2>
          <p className="text-stone-500 text-sm mt-1">Sign in to save your cart and orders</p>
        </div>

        {/* Demo users */}
        <div className="mb-6">
          <p className="text-stone-600 text-xs uppercase tracking-wider mb-3">Quick Demo Access</p>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_USERS.map(u => (
              <button
                key={u.email}
                onClick={() => handleLogin(u.email)}
                disabled={loading}
                className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-orange-500/40 rounded-xl text-left transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold mb-2">
                  {u.name[0]}
                </div>
                <p className="text-stone-200 text-sm font-medium">{u.name}</p>
                <p className="text-stone-600 text-xs">{u.email}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-stone-950 text-stone-600 text-xs">or enter email</span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/60 transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-syne font-bold rounded-xl transition-all active:scale-95"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-stone-600 text-xs mt-4">
          No password needed · Demo mode
        </p>
      </div>
    </div>
  );
}
