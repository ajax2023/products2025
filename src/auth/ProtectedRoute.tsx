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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  // Special case for ajax@online101.ca
  if (user.email === 'ajax@online101.ca') {
    return <>{children}</>;
  }

  // Check role-based access
  if (!claims || claims.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
