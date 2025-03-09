import { Timestamp } from 'firebase/firestore';

/**
 * Interface for product submissions awaiting approval
 */
export interface ProductSubmission {
  id: string;                      // Auto-generated submission ID
  
  // Product Information
  brandName: string;               // Brand name for the product
  productName: string;             // Name of the product
  description: string;             // Product description
  category: string;                // Product category (e.g., "Food", "Clothing")
  subCategory?: string;            // Optional subcategory
  images: string[];                // Array of image URLs
  
  // Canadian Status
  canadianOwned: boolean;          // Is the company Canadian-owned?
  canadianMade: boolean;           // Is the product made in Canada?
  locationManufactured?: string;   // Where it's manufactured
  locationHeadquarters?: string;   // Company HQ location
  
  // Additional Product Details
  certifications?: string[];       // Any certifications (e.g., "Organic", "Fair Trade")
  website?: string;                // Company website
  price?: number;                  // Approximate price (optional)
  whereToFind?: string[];          // Places to purchase (stores, online)
  
  // Submission Metadata
  submittedBy: string;             // User ID of submitter
  submittedAt: Timestamp;          // When the product was submitted
  status: SubmissionStatus;        // Current status
  
  // Review Information
  reviewedBy?: string;             // Admin user ID who reviewed submission
  reviewedAt?: Timestamp;          // When the review occurred
  rejectionReason?: string;        // If rejected, why
  adminNotes?: string;             // Private notes for admins
  
  // Additional fields
  tags?: string[];                 // Searchable tags
  sourceData?: any;                // Optional data source information
}

/**
 * Possible statuses for a product submission
 */
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

/**
 * Interface for the submission form state
 * (Simplified version of ProductSubmission without the metadata fields)
 */
export interface ProductSubmissionFormData {
  brandName: string;
  productName: string;
  description: string;
  category: string;
  subCategory?: string;
  canadianOwned: boolean;
  canadianMade: boolean;
  locationManufactured?: string;
  locationHeadquarters?: string;
  certifications?: string[];
  website?: string;
  price?: number;
  whereToFind?: string[];
  tags?: string[];
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
