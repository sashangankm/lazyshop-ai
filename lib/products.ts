// ============================================================
// LazyShop - Product Utilities
// ============================================================

import productsData from '@/data/products.json';
import type { Product, SearchFilters } from '@/types';

const products = productsData as Product[];

export function getAllProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export function getFeaturedProducts(): Product[] {
  return products.filter(p => p.featured);
}

export function getCategories(): string[] {
  return [...new Set(products.map(p => p.category))];
}

export function searchProducts(filters: SearchFilters): Product[] {
  let result = [...products];

  if (filters.query) {
    const query = filters.query.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query)) ||
      p.category.toLowerCase().includes(query)
    );
  }

  if (filters.category) {
    result = result.filter(p => p.category === filters.category);
  }

  if (filters.priceRange) {
    result = result.filter(p =>
      p.price >= (filters.priceRange!.min || 0) &&
      p.price <= (filters.priceRange!.max || Infinity)
    );
  }

  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
  }

  return result;
}

export function getRecommendations(currentProductId: string, count = 4): Product[] {
  const current = getProductById(currentProductId);
  if (!current) return getFeaturedProducts().slice(0, count);

  // Recommend same category first, then by tags
  const sameCat = products
    .filter(p => p.id !== currentProductId && p.category === current.category)
    .sort((a, b) => b.rating - a.rating);

  return sameCat.slice(0, count);
}
