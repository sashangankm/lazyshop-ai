// ============================================================
// LazyShop - Cart API Routes
// GET/POST/DELETE /api/cart
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CartModel } from '@/lib/db/mongodb';
import { getProductById } from '@/lib/products';

// GET /api/cart?userId=xxx
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    await connectDB();
    const cart = await CartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // Hydrate with product data
    const items = cart.items
      .map((item: any) => {
        const product = getProductById(item.productId);
        if (!product) return null;
        return { productId: item.productId, product, quantity: item.quantity, addedAt: item.addedAt };
      })
      .filter(Boolean);

    const total = items.reduce((sum: number, item: any) => sum + item.product.price * item.quantity, 0);
    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('[API/Cart GET]', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

// POST /api/cart - Add item
export async function POST(request: NextRequest) {
  try {
    const { userId, productId, quantity = 1 } = await request.json();
    if (!userId || !productId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    await connectDB();
    let cart = await CartModel.findOne({ userId });
    if (!cart) cart = new CartModel({ userId, items: [] });

    const existingIdx = cart.items.findIndex((i: any) => i.productId === productId);
    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }
    cart.updatedAt = new Date();
    await cart.save();

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('[API/Cart POST]', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

// PATCH /api/cart - Update quantity
export async function PATCH(request: NextRequest) {
  try {
    const { userId, productId, quantity } = await request.json();
    if (!userId || !productId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    await connectDB();

    if (quantity <= 0) {
      await CartModel.updateOne({ userId }, { $pull: { items: { productId } } });
    } else {
      await CartModel.updateOne(
        { userId, 'items.productId': productId },
        { $set: { 'items.$.quantity': quantity, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/Cart PATCH]', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

// DELETE /api/cart - Remove item or clear cart
export async function DELETE(request: NextRequest) {
  try {
    const { userId, productId, clearAll } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    await connectDB();

    if (clearAll) {
      await CartModel.updateOne({ userId }, { $set: { items: [], updatedAt: new Date() } });
    } else if (productId) {
      await CartModel.updateOne({ userId }, { $pull: { items: { productId } } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/Cart DELETE]', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}
