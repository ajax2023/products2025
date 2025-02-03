import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { AdminUser, AdminRole, isAdmin } from '../../types/admin';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import ProductModerationQueue from './ProductModerationQueue';
import PriceModeration from './PriceModeration';
import CompanyManagement from './CompanyManagement';
import AdminManagement from './AdminManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

export default function AdminDashboard() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!auth.currentUser) {
        setError('Please sign in to access the admin dashboard');
        setLoading(false);
        return;
      }

      try {
        const adminRef = collection(db, 'admins');
        const q = query(adminRef, where('uid', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const adminData = querySnapshot.docs[0].data() as AdminUser;
          setCurrentAdmin(adminData);
        } else {
          setError('You do not have admin access');
        }
      } catch (err) {
        console.error('Error fetching admin status:', err);
        setError('An error occurred while loading the admin dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStatus();
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const hasRole = (role: AdminRole): boolean => {
    if (!currentAdmin) return false;
    return isAdmin(currentAdmin, role);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentAdmin) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">You do not have admin access.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="admin tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {hasRole('product_admin') && (
              <Tab label="Product Moderation" {...a11yProps(0)} />
            )}
            {hasRole('price_admin') && (
              <Tab label="Price Moderation" {...a11yProps(1)} />
            )}
            {hasRole('company_admin') && (
              <Tab label="Company Management" {...a11yProps(2)} />
            )}
            {hasRole('super_admin') && (
              <Tab label="Admin Management" {...a11yProps(3)} />
            )}
          </Tabs>
        </Box>
        {hasRole('product_admin') && (
          <TabPanel value={tabValue} index={0}>
            <ProductModerationQueue adminId={currentAdmin.uid} />
          </TabPanel>
        )}
        {hasRole('price_admin') && (
          <TabPanel value={tabValue} index={1}>
            <PriceModeration adminId={currentAdmin.uid} />
          </TabPanel>
        )}
        {hasRole('company_admin') && (
          <TabPanel value={tabValue} index={2}>
            <CompanyManagement adminId={currentAdmin.uid} />
          </TabPanel>
        )}
        {hasRole('super_admin') && (
          <TabPanel value={tabValue} index={3}>
            <AdminManagement currentAdmin={currentAdmin} />
          </TabPanel>
        )}
      </Paper>
    </Box>
  );
}
