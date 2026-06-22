// ============================================================
// LazyShop - MongoDB Connection & Models
// ============================================================

import mongoose, { Schema, model, models } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

// ── Connection Cache ─────────────────────────────────────────
let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  (global as any).mongoose = cached;
  return cached.conn;
}

// ── User Schema ──────────────────────────────────────────────
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: String,
  preferences: [String],
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = models.User || model('User', UserSchema);

// ── Cart Schema ──────────────────────────────────────────────
const CartItemSchema = new Schema({
  productId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  addedAt: { type: Date, default: Date.now },
});

const CartSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  items: [CartItemSchema],
  updatedAt: { type: Date, default: Date.now },
});

export const CartModel = models.Cart || model('Cart', CartSchema);

// ── Order Schema ─────────────────────────────────────────────
const OrderItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: String,
  price: Number,
  quantity: { type: Number, required: true },
});

const OrderSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  items: [OrderItemSchema],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  createdAt: { type: Date, default: Date.now },
});

export const OrderModel = models.Order || model('Order', OrderSchema);

// ── AI Provider Log Schema ────────────────────────────────────
const AILogSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  provider: { type: String, enum: ['openai', 'gemini', 'groq', 'fallback'] },
  success: Boolean,
  responseTime: Number,
  endpoint: String,
  userId: String,
});

export const AILogModel = models.AILog || model('AILog', AILogSchema);
