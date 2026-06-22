'use client';

// ============================================================
// LazyShop - Checkout Page
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import AIAssistant from '@/components/assistant/AIAssistant';
import { useCartStore, useAuthStore } from '@/lib/store';

interface ShippingForm {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { items, getTotal, clearCart } = useCartStore();
  const [form, setForm] = useState<ShippingForm>({
    name: user?.name || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');

  const total = getTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, shippingAddress: form }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      clearCart();
      setSuccess(data.orderId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mb-6 animate-float">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-syne text-4xl font-black text-stone-100 mb-3">Order Placed! 🎉</h1>
          <p className="text-stone-400 mb-2">Your order ID:</p>
          <code className="text-orange-400 font-mono text-sm bg-stone-900 px-4 py-2 rounded-lg block mb-8">
            {success}
          </code>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/shop')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
            >
              Keep Shopping
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold rounded-xl border border-stone-800 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
        <AIAssistant />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-24">
        <h1 className="font-syne text-4xl font-bold text-stone-100 mb-10">Checkout</h1>

        {!isAuthenticated ? (
          <div className="text-center py-24">
            <p className="text-stone-400 text-lg">Please sign in to checkout</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-stone-400 text-lg mb-4">Your cart is empty</p>
            <button onClick={() => router.push('/shop')} className="px-6 py-3 bg-orange-500 text-white rounded-xl">Shop Now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Shipping form */}
            <div>
              <h2 className="font-syne font-bold text-stone-200 text-xl mb-6">Shipping Details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { id: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
                  { id: 'street', label: 'Street Address', type: 'text', placeholder: '123 Main St' },
                  { id: 'city', label: 'City', type: 'text', placeholder: 'San Francisco' },
                  { id: 'state', label: 'State', type: 'text', placeholder: 'CA' },
                  { id: 'zip', label: 'ZIP Code', type: 'text', placeholder: '94102' },
                ].map(field => (
                  <div key={field.id}>
                    <label className="block text-stone-400 text-sm mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.id as keyof ShippingForm]}
                      onChange={e => setForm(prev => ({ ...prev, [field.id]: e.target.value }))}
                      required
                      className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/60 transition-colors"
                    />
                  </div>
                ))}

                {/* Payment placeholder */}
                <div>
                  <h2 className="font-syne font-bold text-stone-200 text-xl mt-8 mb-4">Payment</h2>
                  <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">VISA</div>
                      <span className="text-stone-400 text-sm">•••• •••• •••• 4242</span>
                      <span className="ml-auto text-stone-500 text-xs">Demo Mode</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-syne font-bold text-lg rounded-xl transition-all hover:shadow-[0_0_24px_rgba(249,115,22,0.4)] active:scale-95"
                >
                  {loading ? 'Placing Order...' : `Place Order · $${total.toFixed(2)}`}
                </button>
              </form>
            </div>

            {/* Order summary */}
            <div>
              <h2 className="font-syne font-bold text-stone-200 text-xl mb-6">Order Summary</h2>
              <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
                <div className="divide-y divide-stone-800">
                  {items.map(item => (
                    <div key={item.productId} className="flex items-center gap-4 p-4">
                      <img src={item.product?.image} alt={item.product?.name} className="w-14 h-14 rounded-xl object-cover bg-stone-800" />
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-200 text-sm font-medium truncate">{item.product?.name}</p>
                        <p className="text-stone-500 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-orange-400 font-bold text-sm">
                        ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-stone-800">
                  <div className="flex justify-between text-stone-400 text-sm mb-2">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400 text-sm mb-3">
                    <span>Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-100 text-lg">
                    <span>Total</span>
                    <span className="text-orange-400">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AIAssistant />
    </div>
  );
}
