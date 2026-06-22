'use client';

// ============================================================
// LazyShop - AI Assistant Component
// Floating orb + Chat window + Voice control
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore, useAuthStore, useCartStore, useProductStore } from '@/lib/store';
import { useVoiceRecognition, speak } from '@/lib/hooks/useVoice';
import type { ChatMessage, Product } from '@/types';
import ProductCard from '@/components/products/ProductCard';

// Strips raw JSON wrapper that Gemini sometimes returns as message text
function cleanAIMessage(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  // If the entire message is a JSON object, extract the message field
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.message) return parsed.message;
    } catch {}
  }
  // Strip inline JSON objects from text
  return trimmed
    .replace(/\{[^{}]*"message"[^{}]*\}/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .trim();
}

export default function AIAssistant() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const { messages, addMessage, isOpen, toggleChat, isLoading, setLoading, isListening, transcript } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const [providerBadge, setProviderBadge] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchResultsRef = useRef<Product[]>([]);

  // Keep ref in sync with state
  const updateSearchResults = (results: Product[]) => {
    searchResultsRef.current = results;
    setSearchResults(results);
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      provider: 'fallback',
    };
    addMessage(userMsg);
    setInputText('');
    setLoading(true);
    updateSearchResults([]);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-8),
          userId: user?.id,
        }),
      });

      const data = await res.json();

      // Show provider badge
      setProviderBadge(data.provider || '');
      setTimeout(() => setProviderBadge(''), 3000);

      // Handle function result
      if (data.functionResult) {
        const result = data.functionResult;

        if (result.type === 'products' && result.data) {
          updateSearchResults(result.data);
        }

        if (result.type === 'navigate' && result.page) {
          speak(data.message || 'Navigating...');
          setTimeout(() => router.push(`/${result.page === 'home' ? '' : result.page}`), 800);
        }

        if (result.type === 'cart_updated' && result.product) {
          addItem({
            productId: result.product.id,
            product: result.product,
            quantity: 1,
            addedAt: new Date(),
          });
        }
      }

      // If AI said it will show products but no result came back, trigger search
      if (!data.functionResult && data.functionCall) {
        const fc = data.functionCall;
        if (fc.name === 'searchProducts' || fc.name === 'recommendProducts' || fc.name === 'filterProducts') {
          try {
            const productRes = await fetch(
              `/api/products?${fc.arguments?.query ? `q=${encodeURIComponent(fc.arguments.query)}` : ''}${fc.arguments?.category ? `&category=${fc.arguments.category}` : ''}${fc.arguments?.priceRange?.max ? `&maxPrice=${fc.arguments.priceRange.max}` : ''}`
            );
            const productData = await productRes.json();
            if (productData.products) updateSearchResults(productData.products);
          } catch {
            console.error('Failed to fetch products client-side');
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanAIMessage(data.message) || "I'm not sure how to help with that. Try asking me to search for products or manage your cart!",
        timestamp: new Date(),
        provider: data.provider,
      };
      addMessage(assistantMsg);
      speak(assistantMsg.content);

      // Last resort — only trigger if AI didn't ask a question
      const isAskingQuestion = (data.message || '').includes('?') &&
        ((data.message || '').includes('budget') ||
         (data.message || '').includes('price') ||
         (data.message || '').includes('looking for') ||
         (data.message || '').includes('what kind') ||
         (data.message || '').includes('which') ||
         (data.message || '').includes('how much'));

      if (searchResultsRef.current.length === 0 && !isAskingQuestion && (data.provider === 'groq' || data.provider === 'gemini')) {
        const msg = (data.message || '').toLowerCase();
        let fallbackUrl = '';
        if (msg.includes('featured') || msg.includes('trending') || msg.includes('popular') || msg.includes('hottest')) {
          fallbackUrl = '/api/products?featured=true';
        } else if (msg.includes('electronic')) {
          fallbackUrl = '/api/products?category=electronics';
        } else if (msg.includes('cloth') || msg.includes('fashion')) {
          fallbackUrl = '/api/products?category=clothing';
        } else if (msg.includes('kitchen')) {
          fallbackUrl = '/api/products?category=kitchen';
        } else if (msg.includes('furniture')) {
          fallbackUrl = '/api/products?category=furniture';
        } else if (msg.includes('lifestyle')) {
          fallbackUrl = '/api/products?category=lifestyle';
        } else if (msg.includes('show') || msg.includes('here') || msg.includes('check out')) {
          fallbackUrl = '/api/products?featured=true';
        }

        if (fallbackUrl) {
          try {
            const r = await fetch(fallbackUrl);
            const d = await r.json();
            if (d.products?.length > 0) updateSearchResults(d.products);
          } catch {
            console.error('Fallback product fetch failed');
          }
        }
      }
    } catch (err) {
      console.error('[Assistant] API call failed:', err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. You can still browse and shop manually!",
        timestamp: new Date(),
        provider: 'fallback',
      };
      addMessage(errMsg);
    } finally {
      setLoading(false);
    }
  }, [isLoading, messages, user, addMessage, setLoading, router, addItem]);

  const { startListening, stopListening } = useVoiceRecognition({
    onResult: (text) => sendMessage(text),
    onError: (err) => console.warn('[Voice]', err),
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      if (!isOpen) toggleChat();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const QUICK_PROMPTS = [
    'Show featured products',
    'Find headphones',
    'Electronics under $100',
    'Show my cart',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Provider badge */}
      {providerBadge && (
        <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-stone-900 border border-stone-700 text-stone-400 animate-slide-up">
          via <span className={providerBadge === 'openai' ? 'text-green-400' : providerBadge === 'groq' ? 'text-blue-400' : 'text-stone-400'}>
            {providerBadge}
          </span>
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="w-[360px] max-h-[560px] flex flex-col bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-stone-800 bg-stone-900/60">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-syne font-bold text-stone-100 text-sm">LazyShop AI</p>
              <p className="text-stone-500 text-xs">Voice & text assistant</p>
            </div>
            <button
              onClick={toggleChat}
              className="text-stone-500 hover:text-stone-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-window min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-stone-500 text-sm mb-4">Hi! I'm your shopping assistant. Try asking:</p>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="block w-full text-left px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs transition-colors border border-stone-800"
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-chat-bubble`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-tr-sm'
                      : 'bg-stone-900 text-stone-200 border border-stone-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.provider && msg.role === 'assistant' && (
                    <div className={`text-xs mt-1 opacity-50 ${msg.role === 'assistant' ? 'text-stone-500' : ''}`}>
                      {msg.provider}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start animate-chat-bubble">
                <div className="bg-stone-900 border border-stone-800 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-stone-600 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-2">
                <p className="text-stone-500 text-xs mb-2">Found {searchResults.length} products:</p>
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.slice(0, 4).map(product => (
                    <div key={product.id} className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                      <img src={product.image} alt={product.name} className="w-full h-20 object-cover" />
                      <div className="p-2">
                        <p className="text-stone-200 text-xs font-medium line-clamp-1">{product.name}</p>
                        <p className="text-orange-400 text-xs font-bold">${product.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {searchResults.length > 4 && (
                  <button
                    onClick={() => router.push('/shop')}
                    className="w-full mt-2 py-2 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    View all {searchResults.length} results →
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Live transcript */}
          {isListening && transcript && (
            <div className="px-4 py-2 bg-orange-500/10 border-t border-orange-500/20">
              <p className="text-orange-300 text-xs italic">{transcript}…</p>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-stone-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:border-orange-500/60 transition-colors"
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="px-3 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating orb button */}
      <div className="relative flex items-center gap-3">
        {/* Listening label */}
        {isListening && (
          <div className="px-3 py-1.5 bg-stone-900 border border-orange-500/40 rounded-full text-orange-400 text-xs font-medium animate-pulse-glow">
            Listening…
          </div>
        )}

        {/* Mic button */}
        <button
          onClick={handleMicClick}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              : 'bg-stone-900 border border-stone-700 hover:border-orange-500/60'
          }`}
        >
          {isListening && (
            <>
              <div className="orb-ring" />
              <div className="orb-ring" />
            </>
          )}
          <svg className={`w-5 h-5 ${isListening ? 'text-white' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* Chat toggle orb */}
        <button
          onClick={toggleChat}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isOpen
              ? 'bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)]'
              : 'bg-orange-500 hover:bg-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] animate-float'
          }`}
        >
          {isOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
