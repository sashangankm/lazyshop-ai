// ============================================================
// LazyShop - Products API Route
// GET /api/products
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, searchProducts, getFeaturedProducts } from '@/lib/products';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sortBy = searchParams.get('sortBy') as any;
  const featured = searchParams.get('featured') === 'true';

  try {
    if (featured) {
      return NextResponse.json({ products: getFeaturedProducts() });
    }

    const products = searchProducts({
      query,
      category: category || undefined,
      priceRange: minPrice && maxPrice
        ? { min: parseFloat(minPrice), max: parseFloat(maxPrice) }
        : undefined,
      sortBy: sortBy || undefined,
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[API/Products]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
