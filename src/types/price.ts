import { Location } from './common';

export interface Price {
  _id: string;
  product_id: string;
  location: Location;
  price: number;
  user_id: string;
  timestamp: Date;
  currency?: string; // Optional, could be useful for international pricing
  notes?: string;    // Optional, for any special conditions or remarks
}

export const createPrice = (data: Partial<Price>): Price => {
  return {
    _id: data._id || `price_${Date.now()}`,
    product_id: data.product_id || '',
    location: data.location || { country: '', state: '', city: '' },
    price: data.price || 0,
    user_id: data.user_id || '',
    timestamp: data.timestamp || new Date(),
    currency: data.currency,
    notes: data.notes
  };
};

export const validatePrice = (price: Partial<Price>): string[] => {
  const errors: string[] = [];

  if (!price.product_id) errors.push('Product ID is required');
  if (!price.location?.country) errors.push('Country is required');
  if (!price.location?.state) errors.push('State/Province is required');
  if (!price.location?.city) errors.push('City is required');
  if (typeof price.price !== 'number' || price.price < 0) errors.push('Price must be a non-negative number');
  if (!price.user_id) errors.push('User ID is required');

  return errors;
};
