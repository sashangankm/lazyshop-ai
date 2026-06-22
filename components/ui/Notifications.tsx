'use client';

// ============================================================
// LazyShop - Toast Notifications
// ============================================================

import { useEffect } from 'react';
import { useUIStore } from '@/lib/store';

export default function Notifications() {
  const { notifications, removeNotification } = useUIStore();

  return (
    <div className="fixed top-20 right-4 z-[90] flex flex-col gap-2">
      {notifications.map(n => (
        <Toast key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
      ))}
    </div>
  );
}

function Toast({ notification, onClose }: { notification: any; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'border-green-500/40 bg-green-500/10 text-green-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
    info: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'i',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium max-w-xs animate-slide-up shadow-lg ${
        colors[notification.type as keyof typeof colors]
      }`}
    >
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
        {icons[notification.type as keyof typeof icons]}
      </span>
      <span className="flex-1">{notification.message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity ml-1">
        ×
      </button>
    </div>
  );
}
