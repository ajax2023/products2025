import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { AdminUser } from '../../types/admin';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!auth.currentUser) {
        setError('Please log in to access admin dashboard');
        setLoading(false);
        return;
      }

      try {
        const adminDoc = await getDocs(
          query(
            collection(db, 'admins'),
            where('user_id', '==', auth.currentUser.uid)
          )
        );

        if (adminDoc.empty) {
          setError('You do not have admin privileges');
          setLoading(false);
          return;
        }

        setCurrentAdmin({
          ...adminDoc.docs[0].data(),
          _id: adminDoc.docs[0].id
        } as AdminUser);
        
      } catch (err) {
        console.error('Error fetching admin status:', err);
        setError('Error loading admin dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStatus();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentAdmin) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">Access denied. Admin privileges required.</Alert>
      </Box>
    );
  }

  const hasRole = (role: string) => {
    return currentAdmin.roles.includes('super_admin') || currentAdmin.roles.includes(role);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={0}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="admin dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {hasRole('product_admin') && (
              <Tab label="Product Moderation" />
            )}
            {hasRole('price_admin') && (
              <Tab label="Price Moderation" />
            )}
            {hasRole('company_admin') && (
              <Tab label="Company Management" />
            )}
            {currentAdmin.roles.includes('super_admin') && (
              <Tab label="Admin Management" />
            )}
          </Tabs>
        </Box>

        {hasRole('product_admin') && (
          <TabPanel value={tabValue} index={0}>
            <ProductModerationQueue adminId={currentAdmin._id} />
          </TabPanel>
        )}

        {hasRole('price_admin') && (
          <TabPanel value={tabValue} index={1}>
            <PriceModeration adminId={currentAdmin._id} />
          </TabPanel>
        )}

        {hasRole('company_admin') && (
          <TabPanel value={tabValue} index={2}>
            <CompanyManagement adminId={currentAdmin._id} />
          </TabPanel>
        )}

        {currentAdmin.roles.includes('super_admin') && (
          <TabPanel value={tabValue} index={3}>
            <AdminManagement currentAdmin={currentAdmin} />
          </TabPanel>
        )}
      </Paper>
    </Box>
  );
}
