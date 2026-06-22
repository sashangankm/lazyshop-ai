// ============================================================
// LazyShop - Auth API Route (Mock Authentication)
// POST /api/auth
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, UserModel } from '@/lib/db/mongodb';
import { v4 as uuidv4 } from 'uuid';

// Mock users for demo
const MOCK_USERS = [
  { email: 'demo@lazyshop.com', name: 'Alex Demo', avatar: 'AD' },
  { email: 'user@example.com', name: 'Jane User', avatar: 'JU' },
];

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    await connectDB();

    // Find or create user
    let user = await UserModel.findOne({ email });
    if (!user) {
      const mock = MOCK_USERS.find(u => u.email === email);
      user = await UserModel.create({
        id: uuidv4(),
        email,
        name: name || mock?.name || email.split('@')[0],
        avatar: mock?.avatar || email[0].toUpperCase(),
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('[API/Auth]', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
