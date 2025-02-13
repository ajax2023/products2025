import { Location } from './common';

export interface Price {
  _id: string;
  product_id: string;
  
  // Price Information
  amount: number;
  unit: string;
  name?: string;
  currency?: string;
  
  // Store Information
  store: string;
  store_location: string;
  sales_link?: string;
  
  // Location Information
  location: {
    country: string;
    province?: string;
    city: string;
  };
  
  // Source Information
  source: string;  // e.g., "manual", "import", etc.
  notes?: string;
  
  // Attribution
  created_by: string;         // User ID
  created_by_email: string;
  created_by_name: string;
  created_at: string;         // ISO timestamp
  
  // Optional custom tags
  custom_tags?: { [key: string]: string };
}

export const createPrice = (data: Partial<Price>): Price => {
  return {
    _id: data._id || `price_${Date.now()}`,
    product_id: data.product_id || '',
    amount: data.amount || 0,
    unit: data.unit || '',
    name: data.name,
    currency: data.currency,
    store: data.store || '',
    store_location: data.store_location || '',
    sales_link: data.sales_link,
    location: data.location || { country: '', province: '', city: '' },
    source: data.source || '',
    notes: data.notes,
    created_by: data.created_by || '',
    created_by_email: data.created_by_email || '',
    created_by_name: data.created_by_name || '',
    created_at: data.created_at || new Date().toISOString(),
    custom_tags: data.custom_tags
  };
};

export const validatePrice = (price: Partial<Price>): string[] => {
  const errors: string[] = [];

  if (!price.product_id) errors.push('Product ID is required');
  if (!price.amount) errors.push('Amount is required');
  if (!price.unit) errors.push('Unit is required');
  if (!price.store) errors.push('Store is required');
  if (!price.store_location) errors.push('Store location is required');
  if (!price.location?.country) errors.push('Country is required');
  if (!price.location?.city) errors.push('City is required');
  if (!price.source) errors.push('Source is required');
  if (!price.created_by) errors.push('Created by is required');
  if (!price.created_by_email) errors.push('Created by email is required');
  if (!price.created_by_name) errors.push('Created by name is required');

  return errors;
};
