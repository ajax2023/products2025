import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'super_admin' | 'contributor' | 'viewer';
  fallback?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = 'viewer',
  fallback = '/login'
}: ProtectedRouteProps) {
  const { user, claims, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute check:', { user: user?.email, loading, requiredRole, path: location.pathname });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to', fallback);
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  // Special case for ajax@online101.ca
  if (user.email === 'ajax@online101.ca') {
    return <>{children}</>;
  }

  // Check role-based access only if requiredRole is specified
  if (requiredRole && requiredRole !== 'viewer') {
    // If no claims or user doesn't have the required role
    if (!claims || (
      requiredRole === 'admin' && claims.role !== 'admin' && claims.role !== 'super_admin') || 
      (requiredRole === 'super_admin' && claims.role !== 'super_admin')
    ) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
