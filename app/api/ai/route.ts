// ============================================================
// LazyShop - AI Chat API Route
// POST /api/ai
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { processAIRequest, getProviderLogs } from '@/lib/ai/service';
import { connectDB, AILogModel } from '@/lib/db/mongodb';
import { searchProducts, getProductById } from '@/lib/products';
import type { ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [], userId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Process with AI service (OpenAI → Groq → Fallback)
    const aiResponse = await processAIRequest(message, history as ChatMessage[]);

    // Log provider usage
    try {
      await connectDB();
      await AILogModel.create({
        provider: aiResponse.provider,
        success: true,
        responseTime: 0,
        endpoint: '/api/ai',
        userId,
      });
    } catch {
      // Non-critical: DB logging failure shouldn't break the response
    }

    // Execute function if AI called one
    let functionResult = null;
    if (aiResponse.functionCall) {
      functionResult = await executeFunctionCall(aiResponse.functionCall, userId);
    }

    return NextResponse.json({
      message: aiResponse.message,
      functionCall: aiResponse.functionCall,
      functionResult,
      provider: aiResponse.provider,
    });
  } catch (error) {
    console.error('[API/AI] Error:', error);
    return NextResponse.json({ error: 'AI service error' }, { status: 500 });
  }
}

// ── Execute Function Calls ─────────────────────────────────────
async function executeFunctionCall(
  functionCall: { name: string; arguments: Record<string, any> },
  userId?: string
) {
  const { name, arguments: args } = functionCall;

  try {
    switch (name) {
      case 'searchProducts': {
        let results = searchProducts({
          query: args.query,
          category: args.category,
          priceRange: args.priceRange,
        });

        // If query is specific but results are too broad, filter strictly
        if (args.query && results.length > 0) {
          const queryLower = args.query.toLowerCase();
          const strictResults = results.filter(p =>
            p.name.toLowerCase().includes(queryLower) ||
            p.tags.some((t: string) => t.toLowerCase().includes(queryLower)) ||
            p.description.toLowerCase().includes(queryLower)
          );
          // Only use strict results if we found some
          if (strictResults.length > 0) results = strictResults;
        }

        // If no query (featured request), return featured only
        if (!args.query && !args.category && !args.priceRange) {
          results = results.filter(p => p.featured);
        }

        return { type: 'products', data: results.slice(0, 12) };
      }

      case 'filterProducts': {
        const results = searchProducts({
          category: args.category,
          priceRange: args.priceRange,
          sortBy: args.sortBy,
        });
        return { type: 'products', data: results.slice(0, 12) };
      }

      case 'addToCart': {
        if (!userId) return { type: 'error', message: 'Must be logged in' };
        const product = getProductById(args.productId);
        if (!product) return { type: 'error', message: 'Product not found' };

        await connectDB();
        const { CartModel } = await import('@/lib/db/mongodb');

        let cart = await CartModel.findOne({ userId });
        if (!cart) {
          cart = new CartModel({ userId, items: [] });
        }

        const existingIdx = cart.items.findIndex((i: any) => i.productId === args.productId);
        if (existingIdx >= 0) {
          cart.items[existingIdx].quantity += (args.quantity || 1);
        } else {
          cart.items.push({ productId: args.productId, quantity: args.quantity || 1 });
        }
        cart.updatedAt = new Date();
        await cart.save();

        return { type: 'cart_updated', product, message: `Added ${product.name} to cart!` };
      }

      case 'removeFromCart': {
        if (!userId) return { type: 'error', message: 'Must be logged in' };
        await connectDB();
        const { CartModel } = await import('@/lib/db/mongodb');

        await CartModel.updateOne(
          { userId },
          { $pull: { items: { productId: args.productId } } }
        );
        return { type: 'cart_updated', message: 'Item removed from cart' };
      }

      case 'updateCart': {
        if (!userId) return { type: 'error', message: 'Must be logged in' };
        await connectDB();
        const { CartModel } = await import('@/lib/db/mongodb');

        if (args.quantity <= 0) {
          await CartModel.updateOne(
            { userId },
            { $pull: { items: { productId: args.productId } } }
          );
        } else {
          await CartModel.updateOne(
            { userId, 'items.productId': args.productId },
            { $set: { 'items.$.quantity': args.quantity } }
          );
        }
        return { type: 'cart_updated' };
      }

      case 'getCart': {
        if (!userId) return { type: 'error', message: 'Must be logged in' };
        return { type: 'navigate', page: 'cart' };
      }

      case 'checkout': {
        if (!userId) return { type: 'error', message: 'Must be logged in' };
        return { type: 'navigate', page: 'checkout' };
      }

      case 'navigateTo': {
        return { type: 'navigate', page: args.page };
      }
      case 'recommendProducts': {
        const results = searchProducts({
          category: args.category || undefined,
        }).filter(p => p.featured).slice(0, 8);
        return { type: 'products', data: results.length > 0 ? results : searchProducts({}).slice(0, 8) };
      }

      case 'compareProducts': {
        const products = (args.productIds || [])
          .map((id: string) => getProductById(id))
          .filter(Boolean);
        return { type: 'products', data: products };
      }

      case 'trackOrder': {
        return {
          type: 'message',
          message: args.orderId
            ? `Your order ${args.orderId} is currently being processed and will be delivered within 3-5 business days!`
            : 'Please provide your order ID to track your order.',
        };
      }

      default:
        return null;
    }
  } catch (error) {
    console.error('[FunctionCall] Error:', error);
    return { type: 'error', message: 'Function execution failed' };
  }
}

// GET - Provider logs (for analytics)
export async function GET() {
  const logs = getProviderLogs();
  const stats = logs.reduce((acc: any, log) => {
    acc[log.provider] = (acc[log.provider] || 0) + 1;
    return acc;
  }, {});
  return NextResponse.json({ logs: logs.slice(-50), stats });
}
