import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { AuthContext } from './AuthContext';
import { UserClaims } from './types';

interface AuthState {
  user: User | null;
  claims: UserClaims | null;
  loading: boolean;
  role: string;
  settings: any;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    claims: null,
    loading: true,
    role: 'viewer',
    settings: {}
  });

  const refreshClaims = useCallback(async () => {
    if (!authState.user) {
      setAuthState(prev => ({ ...prev, claims: null }));
      return;
    }
    
    try {
      // Special case for ajax@online101.ca
      if (authState.user.email === 'ajax@online101.ca') {
        setAuthState(prev => ({
          ...prev,
          claims: {
            role: 'super_admin',
            permissions: ['*'],
            metadata: {
              updatedAt: Date.now(),
              updatedBy: 'system'
            }
          }
        }));
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', authState.user.uid));
      const userData = userDoc.data();

      if (userData) {
        setAuthState(prev => ({
          ...prev,
          claims: {
            role: userData.role || 'viewer',
            permissions: userData.permissions || [],
            metadata: {
              updatedAt: Date.now(),
              updatedBy: 'system'
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error refreshing claims:', error);
    }
  }, [authState.user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        setAuthState({
          user,
          claims: null,
          loading: false,
          role: userData?.role || 'viewer',
          settings: userData?.settings || {}
        });
        
        refreshClaims();
      } else {
        setAuthState({
          user: null,
          claims: null,
          loading: false,
          role: 'viewer',
          settings: {}
        });
      }
    });

    return () => unsubscribe();
  }, [refreshClaims]);

  const contextValue = {
    ...authState,
    refreshClaims,
    setContext: setAuthState
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
