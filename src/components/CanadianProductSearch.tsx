import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Link,
  CircularProgress,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import RefreshIcon from '@mui/icons-material/Refresh';
import { searchCanadianProducts, forceSync } from '../utils/canadianProducts';
import { CanadianProduct } from '../types/product';
import CanadianProductUpload from './admin/CanadianProductUpload';
import { auth, db } from '../firebaseConfig';
import { collection, query, getDocs, where } from 'firebase/firestore';
import debounce from 'lodash/debounce';

export default function CanadianProductSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<CanadianProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [allProducts, setAllProducts] = useState<CanadianProduct[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    verified: number;
    unverified: number;
    products: { [key: string]: CanadianProduct };
  } | null>(null);

  const countTotalProducts = (products: CanadianProduct[]) => {
    return products.reduce((sum, p) => {
      const productCount = p.products
        .map(prod => prod.split(',').map(p => p.trim()))
        .flat()
        .filter(p => p.length > 0)
        .length;
      return sum + productCount;
    }, 0);
  };

  const fetchStats = async () => {
    try {
      const productsRef = collection(db, 'canadian_products');
      
      // Get total count
      const totalQuery = query(productsRef);
      const totalSnapshot = await getDocs(totalQuery);
      const total = totalSnapshot.size;

      // Get verified count
      const verifiedQuery = query(productsRef, where('production_verified', '==', true));
      const verifiedSnapshot = await getDocs(verifiedQuery);
      const verified = verifiedSnapshot.size;

      const productsQuery = query(productsRef);
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data() as CanadianProduct;
        return acc;
      }, {});

      setStats({
        total,
        verified,
        unverified: total - verified,
        products
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!auth.currentUser) return;
      
      // Automatically set ajax@online101.ca as admin
      if (auth.currentUser.email === 'ajax@online101.ca') {
        setIsAdmin(true);
        return;
      }
      
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('_id', '==', auth.currentUser.uid))
      );
      
      if (!userDoc.empty) {
        setIsAdmin(userDoc.docs[0].data().role === 'admin');
      }
    };

    checkUserRole();
  }, []);

  // Initial cache population
  useEffect(() => {
    const initializeCache = async () => {
      setLoading(true);
      try {
        const results = await searchCanadianProducts({});
        setAllProducts(results);
      } catch (error) {
        console.error('Cache initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeCache();
  }, []);

  // Periodic background sync
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const results = await searchCanadianProducts({}); 
        setAllProducts(results);
      } catch (error) {
        console.error('Background sync error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(syncInterval);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        const results = await searchCanadianProducts({
          brand_name: term,
        });
        setProducts(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    setLoading(true);
    debouncedSearch(term);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ maxWidth: '100%', margin: '0 auto', p: 0}}>
      {/* Search Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 1,
          mt: 1,
        }}
      >
        <Typography variant="h6" component="h6" gutterBottom>
          Canadian Products Search
        </Typography>

        {/* Stats Display */}
        {stats && (
          <Card sx={{p: 0, mb: 0.5, mt: 1, width: '100%', maxWidth: 700}}>
            <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
              <Grid container spacing={0}>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                      Total Brands
                    </Typography>
                    <Typography variant="body2">
                      {stats.total ?? <CircularProgress size={12} />}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                      Products
                    </Typography>
                    <Typography variant="body2">
                      {stats ? countTotalProducts(Object.values(stats.products || {})) : <CircularProgress size={12} />}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                      Verified
                    </Typography>
                    <Typography variant="body2">
                      {stats.verified ?? <CircularProgress size={12} />}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                      Pending
                    </Typography>
                    <Typography variant="body2">
                      {stats.unverified ?? <CircularProgress size={12} />}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Admin Upload Button */}
        {isAdmin && auth.currentUser && (
          <Box sx={{ width: '100%', maxWidth: 700, mb: 1 }}>
            <CanadianProductUpload
              userId={auth.currentUser.uid}
              userEmail={auth.currentUser.email || ''}
              userName={auth.currentUser.displayName || ''}
            />
          </Box>
        )}
        
        {/* Search Bar */}
        <Paper
          component="form"
          elevation={10}
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: 600,
            mb: 1,
            border: '2px solid #F3A847'
          }}
          onSubmit={(e) => e.preventDefault()}
        >
          <TextField
            fullWidth
            placeholder="Search for Canadian products..."
            value={searchTerm}
            onChange={handleSearch}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: loading && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ),
            }}
            sx={{ ml: 1, flex: 1 }}
          />
          <IconButton
            sx={{ ml: 1 }}
            onClick={async () => {
              setLoading(true);
              try {
                await forceSync();
                debouncedSearch(searchTerm);
              } finally {
                setLoading(false);
              }
            }}
            aria-label="refresh"
          >
            <RefreshIcon />
          </IconButton>
        </Paper>

        {/* Stats Section */}
        <Paper sx={{ p: 0, mb: 0.5, mt: 1, width: '100%', maxWidth: 700 }}>
          <Grid container spacing={0}>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                  Brands-Companies
                </Typography>
                <Typography variant="body2">
                  {products.length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                  Products
                </Typography>
                <Typography variant="body2">
                  {countTotalProducts(products)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                  Verified
                </Typography>
                <Typography variant="body2">
                  {products.filter(p => p.production_verified).length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  Pending
                </Typography>
                <Typography variant="body2">
                  {products.filter(p => !p.production_verified).length}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Results */}
        <TableContainer component={Paper} sx={{ mt: 3 , width: '96%' }}>
          <Table sx={{ minWidth: 650 }} aria-label="product results">
            <TableHead>
              <TableRow>
                <TableCell>Brand Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Categories</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <Typography variant="subtitle1">
                        {product.brand_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {product.city}, {product.province}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {product.products.slice(0, 3).map((prod, index) => (
                          <Chip
                            key={index}
                            label={prod}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {product.products.length > 3 && (
                          <Chip
                            label={`+${product.products.length - 3}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {product.categories.slice(0, 2).map((category, index) => (
                          <Chip
                            key={index}
                            label={category}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                        {product.categories.length > 2 && (
                          <Chip
                            label={`+${product.categories.length - 2}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {product.production_verified ? (
                        <Chip
                          icon={<VerifiedIcon />}
                          label="Verified"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="Pending"
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {product.website && (
                        <Link
                          href={product.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit Website
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={products.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Box>
    </Box>
  );
}
