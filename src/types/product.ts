import { Location } from './common';
import { ProductLikeStats, BrandLikeStats } from './likes';

export const PRODUCT_CATEGORIES = [
  'Automotive',
  'Books & Media',
  'Clothing',
  'Electronics',
  'Food & Beverage',
  'Health & Beauty',
  'Home & Garden',
  'Household Supplies',
  'Office Supplies',
  'Pet Supplies',
  'Medical Supplies',
  'Sports & Outdoors',
  'Toys & Games',
  'Miscellaneous'
] as const;

export const MASTER_CATEGORIES = [
  'Alcoholic Beverages',
  'Automotive & Industrial',
  'Clothing & Accessories',
  'Electronics & Technology',
  'Food & Beverage',
  'Health & Beauty',
  'Home & Garden',
  'Household Supplies',
  'Office & School',
  'Pet Supplies',
  'Sports & Outdoors',
  'Toys & Entertainment',
  'Miscellaneous'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];
export type MasterCategory = typeof MASTER_CATEGORIES[number];

export interface CanadianProduct {
  _id: string;
  brand_name: string;
  website: string;
  city: string;
  province: string;
  country: string;
  production_verified: boolean;
  site_verified: boolean;
  site_verified_by?: string;
  site_verified_at?: string;
  notes?: string;
  products: string[];
  categories: ProductCategory[];
  masterCategory?: MasterCategory;
  cdn_prod_tags: string[];
  added_by: string;
  added_by_email: string;
  added_by_name: string;
  date_added: string;
  date_modified: string;
  modified_by: string;
  modified_by_email: string;
  modified_by_name: string;
  is_active: boolean;
  version: number;
  isPubliclyVisible: boolean;
  likeStats?: BrandLikeStats;
}

export interface CanadianProductStats {
  totalProducts: number;
  byProvince: { [key: string]: number };
  byVerificationStatus: {
    verified: number;
    unverified: number;
  };
  verified: number;
  unverified: number;
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
  'Electronics': ['screen_size', 'battery_life', 'storage', 'ram', 'processor'],
  'Clothing': ['size', 'color', 'material', 'gender', 'age_group'],
  'Home & Garden': ['dimensions', 'material', 'color', 'weight'],
  'Health & Beauty': ['size', 'volume', 'ingredients', 'skin_type'],
  'Sports & Outdoors': ['size', 'color', 'material', 'weight', 'age_group'],
  'Toys & Games': ['age_group', 'material', 'dimensions', 'battery_required'],
  'Books & Media': ['format', 'language', 'length', 'release_date'],
  'Automotive': ['make', 'model', 'year', 'part_number'],
  'Pet Supplies': ['pet_type', 'size', 'age_group', 'material'],
  'Office Supplies': ['color', 'dimensions', 'material', 'quantity'],
  'Miscellaneous': ['size', 'color', 'material', 'weight']
};

export function validateCanadianProduct(product: Partial<CanadianProduct>): string[] {
  const errors: string[] = [];

  if (!product.brand_name) errors.push('Brand name is required');
  if (!product.website) errors.push('Website is required');
  if (!product.city) errors.push('City is required');
  if (!product.province) errors.push('Province is required');
  if (!product.country) errors.push('Country is required');
  if (!product.categories || product.categories.length === 0) errors.push('At least one category is required');
  if (!product.products || product.products.length === 0) errors.push('At least one product is required');

  return errors;
}

export function createCanadianProduct(data: Partial<CanadianProduct>): CanadianProduct {
  const now = new Date().toISOString();
  return {
    _id: '',
    brand_name: '',
    website: '',
    city: '',
    province: '',
    country: '',
    production_verified: false,
    site_verified: false,
    products: [],
    categories: [],
    masterCategory: undefined,
    cdn_prod_tags: [],
    added_by: '',
    added_by_email: '',
    added_by_name: '',
    date_added: now,
    date_modified: now,
    modified_by: '',
    modified_by_email: '',
    modified_by_name: '',
    is_active: true,
    version: 1,
    isPubliclyVisible: false,
    ...data
  };
}
