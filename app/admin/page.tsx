'use client';

// ============================================================
// LazyShop - Admin Dashboard
// ============================================================

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';

interface Order {
  id: string;
  userId: string;
  items: any[];
  total: number;
  status: string;
  createdAt: string;
}

interface ProviderStats {
  openai?: number;
  groq?: number;
  fallback?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  processing: 'text-blue-400 bg-blue-400/10',
  shipped: 'text-purple-400 bg-purple-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, logsRes] = await Promise.all([
          fetch('/api/orders?admin=true'),
          fetch('/api/ai'),
        ]);
        const ordersData = await ordersRes.json();
        const logsData = await logsRes.json();

        setOrders(ordersData.orders || []);
        setProviderStats(logsData.stats || {});
      } catch (err) {
        console.error('Admin fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const totalCalls = Object.values(providerStats).reduce((sum, v) => sum + (v || 0), 0);

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-24">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-xs font-medium mb-3">
            Admin Only
          </div>
          <h1 className="font-syne text-4xl font-black text-stone-100">Dashboard</h1>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Total Orders', value: orders.length, icon: '📦' },
            { label: 'Revenue', value: `$${totalRevenue.toFixed(0)}`, icon: '💰' },
            { label: 'AI Requests', value: totalCalls, icon: '🤖' },
            { label: 'OpenAI / Groq / Fallback', value: `${providerStats.openai || 0} / ${providerStats.groq || 0} / ${providerStats.fallback || 0}`, icon: '⚡' },
          ].map(stat => (
            <div key={stat.label} className="p-5 bg-stone-900 rounded-2xl border border-stone-800">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="font-syne font-black text-2xl text-stone-100">{stat.value}</div>
              <div className="text-stone-500 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* AI Provider distribution */}
        <div className="mb-10 p-6 bg-stone-900 rounded-2xl border border-stone-800">
          <h2 className="font-syne font-bold text-stone-200 text-lg mb-5">AI Provider Usage</h2>
          {totalCalls === 0 ? (
            <p className="text-stone-500 text-sm">No AI requests logged yet</p>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'openai', label: 'OpenAI (Primary)', color: 'bg-green-500' },
                { key: 'groq', label: 'Groq (Fallback)', color: 'bg-blue-500' },
                { key: 'fallback', label: 'Keyword (Layer 3)', color: 'bg-stone-600' },
              ].map(({ key, label, color }) => {
                const count = providerStats[key as keyof ProviderStats] || 0;
                const pct = totalCalls > 0 ? (count / totalCalls) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-stone-400">{label}</span>
                      <span className="text-stone-300 font-medium">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Orders table */}
        <div>
          <h2 className="font-syne font-bold text-stone-200 text-xl mb-6">All Orders</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 skeleton rounded-xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-stone-500 text-center py-16">No orders yet</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-800">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/50">
                    {['Order ID', 'User', 'Items', 'Total', 'Status', 'Date', 'Action'].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {orders.map(order => (
                    <tr key={order.id} className="bg-stone-900 hover:bg-stone-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <code className="text-orange-400 text-xs">{order.id.slice(0, 8)}…</code>
                      </td>
                      <td className="px-5 py-4 text-stone-400 text-sm">{order.userId.slice(0, 10)}…</td>
                      <td className="px-5 py-4 text-stone-300 text-sm">{order.items?.length || 0}</td>
                      <td className="px-5 py-4 text-stone-100 font-semibold">${order.total?.toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={order.status}
                          onChange={e => updateStatus(order.id, e.target.value)}
                          className="bg-stone-800 border border-stone-700 text-stone-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-500/60"
                        >
                          {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
