// ============================================================
// LazyShop - Checkout API Route
// POST /api/checkout
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CartModel, OrderModel } from '@/lib/db/mongodb';
import { getProductById } from '@/lib/products';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { userId, shippingAddress } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    await connectDB();

    // Fetch cart
    const cart = await CartModel.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Build order items with product details
    const orderItems = cart.items
      .map((item: any) => {
        const product = getProductById(item.productId);
        if (!product) return null;
        return {
          productId: item.productId,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
        };
      })
      .filter(Boolean);

    const total = orderItems.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    // Create order
    const order = await OrderModel.create({
      id: uuidv4(),
      userId,
      items: orderItems,
      total,
      status: 'pending',
      shippingAddress,
    });

    // Clear cart
    await CartModel.updateOne(
      { userId },
      { $set: { items: [], updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, orderId: order.id, total });
  } catch (error) {
    console.error('[API/Checkout]', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
