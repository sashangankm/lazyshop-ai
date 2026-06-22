// ============================================================
// LazyShop - Zustand Global Store
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, CartItem, Product, ChatMessage, SearchFilters } from '@/types';

// ── Auth Store ────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'lazyshop-auth' }
  )
);

// ── Cart Store ────────────────────────────────────────────────
interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setLoading: (loading: boolean) => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.productId === item.productId);
    if (existing) {
      return {
        items: state.items.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        ),
      };
    }
    return { items: [...state.items, item] };
  }),
  removeItem: (productId) => set((state) => ({
    items: state.items.filter(i => i.productId !== productId),
  })),
  updateQuantity: (productId, quantity) => set((state) => ({
    items: quantity <= 0
      ? state.items.filter(i => i.productId !== productId)
      : state.items.map(i => i.productId === productId ? { ...i, quantity } : i),
  })),
  clearCart: () => set({ items: [] }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  setLoading: (isLoading) => set({ isLoading }),
  getTotal: () => get().items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0),
  getCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));

// ── Chat Store ────────────────────────────────────────────────
interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isListening: boolean;
  transcript: string;
  addMessage: (message: ChatMessage) => void;
  toggleChat: () => void;
  setLoading: (loading: boolean) => void;
  setListening: (listening: boolean) => void;
  setTranscript: (text: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  isListening: false,
  transcript: '',
  addMessage: (message) => set((state) => ({
    // Keep last 20 messages in UI, but only send last 8 to AI
    messages: [...state.messages.slice(-19), message],
  })),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  setLoading: (isLoading) => set({ isLoading }),
  setListening: (isListening) => set({ isListening }),
  setTranscript: (transcript) => set({ transcript }),
  clearMessages: () => set({ messages: [] }),
}));

// ── Product Store ─────────────────────────────────────────────
interface ProductState {
  products: Product[];
  filteredProducts: Product[];
  filters: SearchFilters;
  isLoading: boolean;
  setProducts: (products: Product[]) => void;
  setFilteredProducts: (products: Product[]) => void;
  setFilters: (filters: SearchFilters) => void;
  setLoading: (loading: boolean) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  filteredProducts: [],
  filters: {},
  isLoading: false,
  setProducts: (products) => set({ products, filteredProducts: products }),
  setFilteredProducts: (filteredProducts) => set({ filteredProducts }),
  setFilters: (filters) => set({ filters }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ── UI Store ──────────────────────────────────────────────────
interface UIState {
  currentPage: string;
  notifications: Notification[];
  setCurrentPage: (page: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'home',
  notifications: [],
  setCurrentPage: (currentPage) => set({ currentPage }),
  addNotification: (notification) => set((state) => ({
    notifications: [
      ...state.notifications,
      { ...notification, id: Date.now().toString() },
    ],
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),
}));
