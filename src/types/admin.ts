export type AdminRole = 'super_admin' | 'product_admin' | 'company_admin' | 'price_admin';

export interface AdminUser {
  _id: string;
  user_id: string;
  roles: AdminRole[];
  created_at: Date;
  created_by: string;
  updated_at: Date;
  status: 'active' | 'inactive';
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
