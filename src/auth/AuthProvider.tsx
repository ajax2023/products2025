import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { AuthContext } from './AuthContext';
import { UserClaims } from './types';
import { handleRedirectResult } from './auth';

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
  const [redirectHandled, setRedirectHandled] = useState(false);

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
    // Complete redirect-based auth flows (mobile/PWA)
    handleRedirectResult()
      .then((user) => {
        console.log('Redirect result processed:', user ? 'User signed in' : 'No redirect result');
      })
      .catch((e) => {
        console.log('Redirect result error:', e);
      })
      .finally(() => {
        setRedirectHandled(true);
      });

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        console.log('User data from Firestore:', userData);
        
        setAuthState({
          user,
          claims: null,
          loading: false, 
          role: userData?.role || 'viewer',
          settings: userData?.settings || {}
        });
        
        // Refresh claims after setting the user
        setTimeout(() => refreshClaims(), 100);
      } else {
        // Avoid declaring loading complete until redirect handling finished
        if (!redirectHandled) {
          console.log('No user yet, waiting for redirect handling...');
          setAuthState(prev => ({ ...prev, user: null, claims: null, loading: true, role: 'viewer', settings: {} }));
        } else {
          console.log('No user - setting auth state to logged out');
          setAuthState({
            user: null,
            claims: null,
            loading: false,
            role: 'viewer',
            settings: {}
          });
        }
      }
    });

    return () => unsubscribe();
  }, [refreshClaims, redirectHandled]);

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
