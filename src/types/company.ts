export interface Headquarters {
  country: string;
  state?: string;
  city: string;
}

export interface Company {
  _id: string;
  name: string;
  headquarters: {
    country: string;
    state?: string;
    city: string;
  };
  brands: string[];
  employee_count: number;
  industry?: string;
  website?: string;
  founded_year?: number;
  description?: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}

// Example validation function
export function isValidCompany(company: Partial<Company>): company is Company {
  return (
    typeof company._id === 'string' &&
    typeof company.name === 'string' &&
    typeof company.headquarters?.country === 'string' &&
    typeof company.headquarters?.city === 'string' &&
    Array.isArray(company.brands) &&
    typeof company.employee_count === 'number'
  );
}

// Helper function to create a new company
export function createCompany(
  name: string,
  headquarters: {
    country: string;
    state?: string;
    city: string;
  },
  brands: string[] = [],
  employee_count: number = 0,
  industry?: string,
  website?: string,
  founded_year?: number,
  description?: string
): Company {
  return {
    _id: `comp_${Date.now()}`, // Simple ID generation
    name,
    headquarters,
    brands,
    employee_count,
    industry,
    website,
    founded_year,
    description,
    created_at: new Date(),
    created_by: '',
    updated_at: new Date(),
    updated_by: '',
  };
}
