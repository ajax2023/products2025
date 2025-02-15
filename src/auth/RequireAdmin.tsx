import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { CircularProgress, Box } from '@mui/material';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkUserRole = async () => {
      if (!auth.currentUser) {
        setIsAdmin(false);
        return;
      }

      // Auto-set ajax@online101.ca as admin
      if (auth.currentUser.email === 'ajax@online101.ca') {
        setIsAdmin(true);
        return;
      }

      const userDoc = await getDocs(
        query(collection(db, 'users'), where('_id', '==', auth.currentUser.uid))
      );

      if (!userDoc.empty) {
        setIsAdmin(userDoc.docs[0].data().role === 'admin');
      } else {
        setIsAdmin(false);
      }
    };

    checkUserRole();
  }, []);

  if (isAdmin === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
