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

export interface ProductTags {
  [key: string]: string;
}

export interface Price {
  _id?: string;
  amount: number;
  unit: string;
  name?: string;
  price_tags?: ProductTags;
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
  product_tags?: ProductTags;
  price_history: Price[];
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
  canadianOriginType: string;  // Can be 'product_of_canada', 'made_in_canada', 'made_in_canada_imported', or a country name
}

export interface CanadianProduct {
  _id: string;
  brand_name: string;
  website: string;
  city: string;
  province: string;
  production_verified: boolean;
  notes?: string;
  products: string[];
  categories: ProductCategory[];
  cdn_prod_tags: string[];
  added_by: string;
  added_by_email: string;
  added_by_name: string;
  date_added: string;  // ISO string
  date_modified: string;  // ISO string
  modified_by: string;
  modified_by_email: string;
  modified_by_name: string;
  is_active: boolean;
  version: number;
}

export interface CanadianProductStats {
  totalProducts: number;
  byProvince: { [key: string]: number };
  byVerificationStatus: {
    verified: number;
    unverified: number;
  };
  byCategory: { [key: string]: number };
  totalBrands: number;
  totalTags: number;
}

export interface VerificationStatusChange {
  productId: string;
  brandName: string;
  previousStatus: boolean;
  newStatus: boolean;
  changedBy: string;
  changedByEmail: string;
  changedByName: string;
  changeDate: string;
  notes?: string;
}

export interface BatchImportResult {
  successful: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    data?: Partial<CanadianProduct>;
  }>;
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
    product_tags: data.product_tags || {},
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
    version: data.version || 1,
    canadianOriginType: data.canadianOriginType || 'not_canadian'
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
  if (!product.canadianOriginType) errors.push('Canadian Origin Type is required');

  return errors;
};

export function validateCanadianProduct(product: Partial<CanadianProduct>): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!product.city?.trim()) errors.push('City is required');
  if (!product.province?.trim()) errors.push('Province is required');
  
  // Website URL validation
  if (product.website) {
    try {
      new URL(product.website);
    } catch {
      errors.push('Website must be a valid URL (e.g., https://example.com)');
    }
  }

  // Products and categories validation
  if (!product.products?.length) errors.push('At least one product is required');
  if (!product.categories?.length) errors.push('At least one category is required');

  // Production verification validation
  if (typeof product.production_verified !== 'boolean') {
    errors.push('Production verification status must be specified');
  }

  return errors;
}

// Helper function to create a new Canadian product
export function createCanadianProduct(data: Partial<CanadianProduct>): CanadianProduct {
  const now = new Date().toISOString();
  return {
    _id: data._id || '',
    brand_name: data.brand_name || '',
    website: data.website || '',
    city: data.city || '',
    province: data.province || '',
    production_verified: data.production_verified || false,
    notes: data.notes || '',
    products: data.products || [],
    categories: data.categories || [],
    cdn_prod_tags: data.cdn_prod_tags || [],
    added_by: data.added_by || '',
    added_by_email: data.added_by_email || '',
    added_by_name: data.added_by_name || '',
    date_added: data.date_added || now,
    date_modified: data.date_modified || now,
    modified_by: data.modified_by || '',
    modified_by_email: data.modified_by_email || '',
    modified_by_name: data.modified_by_name || '',
    is_active: data.is_active ?? true,
    version: data.version || 1,
  };
}
