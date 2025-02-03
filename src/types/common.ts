export interface Location {
  country: string;
  state: string;
  city: string;
}

export const validateLocation = (location: Partial<Location>): string[] => {
  const errors: string[] = [];
  
  if (!location.country) errors.push('Country is required');
  if (!location.state) errors.push('State/Province is required');
  if (!location.city) errors.push('City is required');
  
  return errors;
};
