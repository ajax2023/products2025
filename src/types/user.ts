export interface User {
  _id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'contributor' | 'editor' | 'viewer';
  displayName?: string;
  created_at: Date;
  created_by: string;
  updated_at?: Date;
  updated_by?: string;
  last_login?: Date;
  status: 'active' | 'inactive' | 'pending';
}

export interface UserSettings {
  location: {
    country: string;
    province: string;
    city: string;
  };
  preferences: {
    language: string;
    currency: string;
  };
  sharing: {
    showPicture: boolean;
    showUsername: boolean;
    showCountry: boolean;
  };
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    push: boolean;
  };
}

export const createUserSettings = (data: Partial<UserSettings>): UserSettings => {
  return {
    location: {
      country: data.location?.country || 'Canada',
      province: data.location?.province || '',
      city: data.location?.city || ''
    },
    preferences: {
      language: data.preferences?.language || 'English',
      currency: data.preferences?.currency || 'CAD'
    },
    sharing: {
      showPicture: data.sharing?.showPicture ?? true,
      showUsername: data.sharing?.showUsername ?? true,
      showCountry: data.sharing?.showCountry ?? true
    },
    theme: data.theme || 'light',
    notifications: {
      email: data.notifications?.email ?? true,
      push: data.notifications?.push ?? true
    }
  };
};
