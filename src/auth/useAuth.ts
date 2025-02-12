import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { ActionType, ResourceType } from './types';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  const { user, claims, loading } = context;

  const checkPermission = (action: ActionType, resource: ResourceType, ownerId?: string): boolean => {
    if (!claims || !user) return false;

    // Super admin can do anything
    if (claims.role === 'super_admin') return true;

    // Admin can do anything except modify super_admin
    if (claims.role === 'admin' && resource !== 'users') return true;

    // Contributors can manage their own content
    if (claims.role === 'contributor') {
      if (ownerId) {
        return ownerId === user.uid;
      }
      // Contributors can create new content
      return action === 'create';
    }

    // Viewers can only read
    if (claims.role === 'viewer') {
      return action === 'read';
    }

    return false;
  };

  return {
    ...context,
    checkPermission,
    isAdmin: claims?.role === 'admin' || claims?.role === 'super_admin',
    isContributor: claims?.role === 'contributor' || claims?.role === 'admin' || claims?.role === 'super_admin'
  };
};
