export type AdminRole = 'super_admin' | 'product_admin' | 'price_admin' | 'company_admin';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  roles: AdminRole[];
  created_at: string;  // ISO string
  updated_at: string;  // ISO string
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;  // ISO string
}

export interface ApprovalAction {
  action: 'approve' | 'reject';
  timestamp: Date;
  admin_id: string;
  notes?: string;
}

export interface ApprovalHistory {
  _id: string;
  entity_id: string;
  entity_type: 'product' | 'company' | 'price';
  actions: ApprovalAction[];
  current_status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  submitted_at: Date;
}

export interface AdminAction {
  action_id: string;
  action_type: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  target_type: 'product' | 'price' | 'company' | 'user';
  target_id: string;
  admin_id: string;
  admin_email: string;
  timestamp: string;  // ISO string
  details?: string;
}

export const isAdmin = (user: AdminUser, role: AdminRole): boolean => {
  return user.roles.includes('super_admin') || user.roles.includes(role);
};

export const createApprovalHistory = (data: Partial<ApprovalHistory>): ApprovalHistory => {
  return {
    _id: data._id || `approval_${Date.now()}`,
    entity_id: data.entity_id || '',
    entity_type: data.entity_type || 'product',
    actions: data.actions || [],
    current_status: data.current_status || 'pending',
    submitted_by: data.submitted_by || '',
    submitted_at: data.submitted_at || new Date()
  };
};
