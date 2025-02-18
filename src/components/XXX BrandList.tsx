import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { Company } from '../types/company';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface BrandGroup {
  name: string;
  companies: string[];
  productCount: number;
}

export default function BrandList() {
  const [brands, setBrands] = useState<Record<string, BrandGroup>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecked(true);
      if (user) {
        fetchBrands();
      } else {
        setError('Please log in to view brands');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchBrands = async () => {
    try {
      // Fetch companies to get brand information
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const brandMap: Record<string, BrandGroup> = {};

      companiesSnapshot.docs.forEach(doc => {
        const company = { ...doc.data(), _id: doc.id } as Company;
        company.brands?.forEach(brand => {
          if (!brandMap[brand]) {
            brandMap[brand] = {
              name: brand,
              companies: [company.name],
              productCount: 0
            };
          } else {
            brandMap[brand].companies.push(company.name);
          }
        });
      });

      // Fetch products to get product counts per brand
      const productsSnapshot = await getDocs(collection(db, 'products'));
      productsSnapshot.docs.forEach(doc => {
        const product = doc.data();
        if (product.brand && brandMap[product.brand]) {
          brandMap[product.brand].productCount++;
        }
      });

      setBrands(brandMap);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching brands:', error);
      setError('Error loading brands. Please try again.');
      setLoading(false);
    }
  };

  const filteredBrands = Object.values(brands).filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!authChecked || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      <Paper elevation={0} sx={{ p: 1 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Brands
          </Typography>
          <TextField
            fullWidth
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Grid container spacing={3}>
          {filteredBrands.map((brand) => (
            <Grid item xs={12} sm={6} md={4} key={brand.name}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {brand.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {brand.productCount} products
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Companies:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {brand.companies.map((company) => (
                        <Chip
                          key={company}
                          label={company}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => navigate('/', { state: { brandFilter: brand.name } })}
                  >
                    View Products ({brand.productCount})
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {filteredBrands.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" align="center">
                No brands found
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}
