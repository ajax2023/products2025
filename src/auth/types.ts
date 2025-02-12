export type UserRole = 'super_admin' | 'admin' | 'contributor' | 'viewer';
export type ResourceType = 'products' | 'companies' | 'users' | 'stats';
export type ActionType = 'create' | 'read' | 'update' | 'delete';

export interface UserClaims {
  role: UserRole;
  permissions: string[];  // Format: "products:create", "products:delete", etc.
  metadata: {
    updatedAt: number;
    updatedBy: string;
  };
}
