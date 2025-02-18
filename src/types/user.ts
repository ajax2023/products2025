export interface User {
  _id: string;
  email: string;
  displayName: string | null;
  role: 'super_admin' | 'admin' | 'viewer';
  status: 'active' | 'inactive' | 'banned';
  created_at: Date;
  created_by: string;
  last_login: Date;
  updated_at?: Date;
}

export interface UserSettings {
  _id: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'contributor' | 'viewer';
  status: 'active' | 'inactive' | 'banned';
  preferences: {
    language: string;
    currency: string;
    useLocation: boolean;
  };
  location: {
    country: string;
    province: string;
    city: string;
  };
  sharing: {
    showPicture?: boolean;
    showUsername?: boolean;
    showCountry?: boolean;
    showOnLeaderboard?: boolean;
  };
  created_at: string;
  created_by: string;
}