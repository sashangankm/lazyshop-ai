// ============================================================
// LazyShop - Orders API Route
// GET /api/orders
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, OrderModel } from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const isAdmin = request.nextUrl.searchParams.get('admin') === 'true';

  try {
    await connectDB();

    const query = isAdmin ? {} : { userId };
    const orders = await OrderModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(isAdmin ? 100 : 20);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('[API/Orders GET]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();
    await connectDB();

    await OrderModel.updateOne({ id: orderId }, { $set: { status } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/Orders PATCH]', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
