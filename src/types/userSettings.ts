export interface UserSettings {
  location?: {
    country?: string;
    province?: string;
    city?: string;
  };
  preferences: {
    useLocation: boolean;
    theme?: string;
    language?: string;
    locationFilter?: {
      enabled: boolean;
      lastUpdated: string;
    };
    filterByMyLocation?: boolean; 
  };
}
