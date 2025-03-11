import { Timestamp } from 'firebase/firestore';
import { ProductCategory, MasterCategory } from './product';

/**
 * Interface for product submissions awaiting approval
 */
export interface CanadianProduct {
  _id: string;
  brand_name: string;
  website: string;
  city: string;
  province: string;
  country: string;
  products: string[];
  categories: string[];
  masterCategory?: string;
  notes: string;
  added_by: string;
  added_by_email?: string;
  added_by_name?: string;
  date_added: string;
  date_modified: string;
  is_active: boolean;
  version: number;
  isPubliclyVisible: boolean;
  production_verified: boolean;
  site_verified: boolean;
  site_verified_by?: string;
  site_verified_at?: string;
  cdn_prod_tags?: string[];
}

export interface ProductSubmission extends CanadianProduct {
  status: SubmissionStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  adminNotes?: string;
  cdn_prod_tags?: string[];
}

/**
 * Possible statuses for a product submission
 */
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

/**
 * Interface for the submission form state
 * (Simplified version of ProductSubmission without the metadata fields)
 */
export interface ProductSubmissionFormData extends Omit<CanadianProduct, 
  '_id' | 'site_verified_by' | 'site_verified_at' | 
  'date_added' | 'date_modified' | 'modified_by' | 
  'modified_by_email' | 'modified_by_name' | 'likeStats'> {}

/**
 * Interface for the extended submission form state
 */
export interface ExtendedProductSubmissionFormData extends CanadianProduct {
  // Additional fields for the form
  modified_by: string;
  modified_by_email: string;
  modified_by_name: string;
  likeStats?: any;
}

/**
 * Constants for product categories
 */
export const PRODUCT_CATEGORIES = [
  'Food & Beverages',
  'Clothing & Apparel',
  'Home & Garden',
  'Health & Beauty',
  'Electronics',
  'Sports & Outdoors',
  'Toys & Games',
  'Automotive',
  'Pet Supplies',
  'Other'
];

/**
 * Constants for common certifications
 */
export const COMMON_CERTIFICATIONS = [
  'Organic',
  'Fair Trade',
  'Non-GMO',
  'Vegan',
  'Gluten-Free',
  'Eco-Friendly',
  'Cruelty-Free',
  'B Corp',
  'Made in Canada'
];
