import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { AuthContext } from './AuthContext';
import { UserClaims } from './types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<UserClaims | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshClaims = useCallback(async () => {
    if (!user) {
      setClaims(null);
      return;
    }
    
    try {
      // Special case for ajax@online101.ca
      if (user.email === 'ajax@online101.ca') {
        setClaims({
          role: 'super_admin',
          permissions: ['*'],
          metadata: {
            updatedAt: Date.now(),
            updatedBy: 'system'
          }
        });
        return;
      }

      // Get user document for role
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('_id', '==', user.uid))
      );
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        const customClaims: UserClaims = {
          role: userData.role || 'viewer',
          permissions: [],  // We'll add specific permissions later
          metadata: {
            updatedAt: Date.now(),
            updatedBy: 'system'
          }
        };
        
        setClaims(customClaims);
      } else {
        // Default to viewer if no user document
        setClaims({
          role: 'viewer',
          permissions: [],
          metadata: {
            updatedAt: Date.now(),
            updatedBy: 'system'
          }
        });
      }
    } catch (error) {
      console.error('Error refreshing claims:', error);
      setClaims(null);
      // On error, sign out
      await auth.signOut();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        await refreshClaims();
      } else {
        setClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshClaims]);

  return (
    <AuthContext.Provider value={{ user, claims, loading, refreshClaims }}>
      {children}
    </AuthContext.Provider>
  );
};
