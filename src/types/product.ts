import { Location } from './common';

export const PRODUCT_CATEGORIES = [
  'Medical Supplies',
  'Food & Beverage',
  'Electronics',
  'Clothing',
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

export const PRICE_SOURCES = ['manual', 'import', 'api'] as const;

export const PRODUCT_UNITS = [
  'each',
  'per kg',
  'per oz',
  'per g',
  'per case',
  'per box'
] as const;

export type ProductUnit = typeof PRODUCT_UNITS[number];

export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface Location {
  country: string;
  state: string;
  city: string;
}

export interface ProductAttributes {
  [key: string]: string;
}

export interface ProductPrice {
  amount: number;
  unit: ProductUnit;
  date: string;  // ISO string
  store: string;
  location: Location;
  created_by: string;
  created_by_email: string;
  created_by_name: string;
  notes?: string;
  attributes?: ProductAttributes;
  sales_link?: string;
}

export interface ProductOrigin extends Location {
  manufacturer?: string;
  facility_id?: string;
}

export interface Product {
  _id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  company_id?: string;
  origin: ProductOrigin;
  attributes?: ProductAttributes;
  price_history: ProductPrice[];
  created_at: string;  // ISO string
  created_by: string;
  created_by_email: string;
  created_by_name: string;
  updated_at: string;  // ISO string
  updated_by: string;
  updated_by_name: string;
  status: ProductStatus;
  submitted_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  is_active: boolean;
  version: number;
}

export const COMMON_ATTRIBUTES = {
  'Medical Supplies': ['size', 'color', 'material', 'gender', 'age_group'],
  'Food & Beverage': ['weight', 'volume', 'calories', 'ingredients', 'allergens'],
  Electronics: ['screen_size', 'battery_life', 'storage', 'ram', 'processor'],
  Clothing: ['size', 'color', 'material', 'gender', 'age_group'],
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

export const createProduct = (data: Partial<Product>): Product => {
  return {
    _id: data._id || `prod_${Date.now()}`,
    name: data.name || '',
    brand: data.brand || '',
    category: data.category || 'Miscellaneous',
    company_id: data.company_id || '',
    origin: {
      country: data.origin?.country || 'Canada',
      state: data.origin?.state || '',
      city: data.origin?.city || '',
      manufacturer: data.origin?.manufacturer || '',
      facility_id: data.origin?.facility_id || ''
    },
    attributes: data.attributes || {},
    price_history: data.price_history || [],
    created_at: data.created_at || new Date().toISOString(),
    created_by: data.created_by || '',
    created_by_email: data.created_by_email || '',
    created_by_name: data.created_by_name || '',
    updated_at: data.updated_at || new Date().toISOString(),
    updated_by: data.updated_by || '',
    updated_by_name: data.updated_by_name || '',
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
  if (!product.origin?.state) errors.push('State is required');
  if (!product.origin?.city) errors.push('City is required');

  return errors;
};
