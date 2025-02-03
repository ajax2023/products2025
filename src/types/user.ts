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
