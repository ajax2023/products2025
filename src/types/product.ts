import { Location } from './common';

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverage',
  'Home & Garden',
  'Health & Beauty',
  'Sports & Outdoors',
  'Toys & Games',
  'Books & Media',
  'Automotive',
  'Pet Supplies',
  'Office Supplies',
  'Miscellaneous'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];
export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ProductOrigin extends Location {
  manufacturer?: string;
  facility_id?: string;
}

export interface ProductAttributes {
  [key: string]: string | number | boolean;
}

export interface ProductPrice {
  name: string;  // e.g. "Gala - Organic"
  amount: number;
  unit: typeof PRODUCT_UNITS[number];
  store: string;  // Store name and address (e.g., "Walmart - 123 Main St")
  location: {
    country: string;
    province: string;
    city: string;
  };
  date: string;  // ISO string
  source: typeof PRICE_SOURCES[number];
  notes?: string;
  sales_link?: string;  // URL to purchase the product
  created_by: string;  // User ID
  created_by_name: string;  // Display name or username
  created_at: string;  // ISO string
  modified_by?: string;  // User ID of last editor
  modified_by_name?: string;  // Display name of last editor
  modified_at?: string;  // ISO string of last edit
}

export const PRICE_SOURCES = ['manual', 'import', 'api'] as const;

export interface Product {
  _id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  company_id: string;
  origin: ProductOrigin;
  attributes: ProductAttributes;
  prices?: ProductPrice[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  status: ProductStatus;
  submitted_by?: string;
  submitted_at?: Date;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  is_active: boolean;
  version: number;
}

export const COMMON_ATTRIBUTES = {
  Electronics: ['screen_size', 'battery_life', 'storage', 'ram', 'processor'],
  Clothing: ['size', 'color', 'material', 'gender', 'age_group'],
  'Food & Beverage': ['weight', 'volume', 'calories', 'ingredients', 'allergens'],
  'Home & Garden': ['dimensions', 'weight', 'material', 'color', 'warranty'],
  'Health & Beauty': ['volume', 'weight', 'ingredients', 'skin_type', 'age_range'],
  'Sports & Outdoors': ['size', 'weight', 'material', 'age_group', 'skill_level'],
  'Toys & Games': ['age_range', 'number_of_players', 'battery_required', 'dimensions'],
  'Books & Media': ['format', 'language', 'length', 'genre', 'release_date'],
  'Automotive': ['make', 'model', 'year', 'part_number', 'warranty'],
  'Pet Supplies': ['pet_type', 'age_range', 'size', 'weight', 'material'],
  'Office Supplies': ['dimensions', 'color', 'material', 'quantity', 'compatibility'],
  'Miscellaneous': ['dimensions', 'weight', 'material', 'color', 'warranty']
};

export const PRODUCT_UNITS = [
  'each',
  'per kg',
  'per oz',
  'per g',
  'each',
  'per case',
  'per box'
] as const;

export type ProductUnit = typeof PRODUCT_UNITS[number];

export const createProduct = (data: Partial<Product>): Product => {
  return {
    _id: data._id || `prod_${Date.now()}`,
    name: data.name || '',
    brand: data.brand || '',
    category: data.category || 'Miscellaneous',
    company_id: data.company_id || '',
    origin: {
      country: data.origin?.country || 'Canada',
      province: data.origin?.province || '',
      city: data.origin?.city || '',
      manufacturer: data.origin?.manufacturer || '',
      facility_id: data.origin?.facility_id || ''
    },
    attributes: data.attributes || {},
    prices: data.prices || [],
    created_at: data.created_at || new Date(),
    updated_at: data.updated_at || new Date(),
    created_by: data.created_by || '',
    status: data.status || 'draft',
    submitted_by: data.submitted_by,
    submitted_at: data.submitted_at,
    approved_by: data.approved_by,
    approved_at: data.approved_at,
    rejection_reason: data.rejection_reason,
    is_active: data.is_active ?? true,
    version: data.version || 1
  };
};

export const validateProduct = (product: Partial<Product>): string[] => {
  const errors: string[] = [];

  if (!product.name) errors.push('Name is required');
  if (!product.brand) errors.push('Brand is required');
  if (!product.category) errors.push('Category is required');
  if (!product.company_id) errors.push('Company ID is required');
  if (!product.origin?.country) errors.push('Country is required');
  if (!product.origin?.province) errors.push('Province is required');
  if (!product.origin?.city) errors.push('City is required');

  return errors;
};
