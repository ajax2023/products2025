export interface Location {
  country: string;
  state: string;  // Using state consistently instead of province
  city: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
  currency: string;
  location: Location;
}

export const validateLocation = (location: Partial<Location>): string[] => {
  const errors: string[] = [];
  
  if (!location.country) errors.push('Country is required');
  if (!location.state) errors.push('State is required');
  if (!location.city) errors.push('City is required');
  
  return errors;
};
