import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../auth/useAuth';
import { Company } from '../types/company';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Link,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Language as WebsiteIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  DateRange as DateIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import CompanyForm from './CompanyForm';

export default function CompanyInfo() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!id) {
        setError('No company ID provided');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(collection(db, 'companies'), id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCompany({ ...docSnap.data(), _id: docSnap.id } as Company);
        } else {
          setError('Company not found');
        }
      } catch (err) {
        console.error('Error fetching company:', err);
        setError('Error loading company information');
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [id]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      const token = await user.getIdTokenResult();
      const role = token.claims.admin ? 'admin' : token.claims.contributor ? 'contributor' : 'viewer';
      setUserRole(role);
    };
    checkUserRole();
  }, [user]);

  const formatEmployeeCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M employees`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K employees`;
    }
    return `${count.toLocaleString()} employees`;
  };

  const handleEditCompany = async (updatedCompany: Partial<Company>) => {
    if (!id || !company) return;
    setIsSubmitting(true);
    try {
      const companyRef = doc(collection(db, 'companies'), id);
      await updateDoc(companyRef, {
        ...updatedCompany,
        updated_at: new Date(),
        updated_by: user?.uid || ''
      });

      // Update local state
      setCompany(prev => prev ? { ...prev, ...updatedCompany } : null);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Failed to update company');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !company) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography color="error">{error || 'Company not found'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BusinessIcon fontSize="large" color="primary" />
            <Typography variant="h5" component="h1">
              {company.name}
            </Typography>
          </Box>
          {(userRole === 'admin' || userRole === 'contributor') && (
            <Button
              startIcon={<EditIcon />}
              variant="outlined"
              onClick={() => setIsEditing(true)}
            >
              Edit Company
            </Button>
          )}
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {company.description && (
              <Typography variant="body1" color="text.secondary" paragraph>
                {company.description}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Company Details
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon color="action" />
                <Typography>
                  {formatEmployeeCount(company.employee_count)}
                </Typography>
              </Box>

              {company.founded_year && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DateIcon color="action" />
                  <Typography>
                    Founded in {company.founded_year}
                  </Typography>
                </Box>
              )}

              {company.website && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WebsiteIcon color="action" />
                  <Link
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                  >
                    {company.website}
                  </Link>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Headquarters
                </Typography>
                <Typography>
                  {company.headquarters.city}
                  {company.headquarters.state && `, ${company.headquarters.state}`}
                  {company.headquarters.country && `, ${company.headquarters.country}`}
                </Typography>
              </Box>

              {company.industry && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Industry
                  </Typography>
                  <Typography>{company.industry}</Typography>
                </Box>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Brands
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {company.brands?.map((brand) => (
                <Chip
                  key={brand}
                  label={brand}
                  variant="outlined"
                />
              ))}
              {(!company.brands || company.brands.length === 0) && (
                <Typography color="text.secondary">
                  No brands listed
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        maxWidth="md"
        fullWidth
      >
        {/* <DialogTitle>Edit Company</DialogTitle> */}
        <DialogContent>
          <CompanyForm
            company={company}
            onSubmit={handleEditCompany}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
