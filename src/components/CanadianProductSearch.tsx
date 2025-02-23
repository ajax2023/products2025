import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  InputBase,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Link,
  Stack,
  Chip,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckIcon from '@mui/icons-material/Check';
import CircleIcon from '@mui/icons-material/Circle';
import StoreIcon from '@mui/icons-material/Store';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import debounce from 'lodash/debounce';
import { cacheService } from '../services/cacheService';
import { useAuth } from '../auth/useAuth';
import { default as LikeButton } from './LikeButton';
import { default as ShareButton } from './ShareButton';
import { searchCanadianProducts, forceSync } from '../utils/canadianProducts';
import { CanadianProduct } from '../types/product';
import { auth, db } from '../firebaseConfig';
import { collection, query, getDocs, where, doc, getDoc, limit } from 'firebase/firestore';

export default function CanadianProductSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<CanadianProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    verified: number;
    pending: number;
    products: { [key: string]: CanadianProduct };
  } | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [allProducts, setAllProducts] = useState<CanadianProduct[]>([]);
  const [productFilter, setProductFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const { user } = useAuth();

  // Debug log user state
  useEffect(() => {
    const verifyAuth = async () => {
      if (!user?.uid) {
        console.log('Auth: No user');
        return;
      }

      try {
        // Check user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        console.log('Auth: User document check', {
          exists: userDoc.exists(),
          data: userDoc.exists() ? userDoc.data() : null,
          uid: user.uid,
          email: user.email
        });

        // Try a test read
        const testQuery = await getDocs(query(collection(db, 'canadian_products'), limit(1)));
        console.log('Auth: Test query result', {
          success: !testQuery.empty,
          count: testQuery.size
        });
      } catch (error) {
        console.error('Auth: Verification failed', error);
      }
    };

    verifyAuth();
  }, [user]);

  // Simple direct Firestore query
  const fetchStats = async () => {
    if (!user?.uid) {
      console.log('fetchStats: No user', { uid: user?.uid });
      return;
    }
    
    console.log('fetchStats: Starting', { uid: user?.uid, email: user?.email });
    try {
      const snapshot = await getDocs(collection(db, 'canadian_products'));
      console.log('fetchStats: Got data', { count: snapshot.size });

      const products: { [key: string]: CanadianProduct } = {};
      let total = 0;
      let verified = 0;

      const productsList: CanadianProduct[] = [];
      snapshot.forEach((doc) => {
        const product = { ...doc.data(), _id: doc.id } as CanadianProduct;
        products[doc.id] = product;
        productsList.push(product);
        total++;
        if (product.production_verified) {
          verified++;
        }
      });

      console.log('fetchStats: Processed', { total, verified, pending: total - verified });

      const newStats = {
        total,
        verified,
        pending: total - verified,
        products,
      };
      setStats(newStats);
      setAllProducts(productsList);
    } catch (error) {
      console.error('fetchStats: Error', error);
      // Log the full error details
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchStats();
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        console.log('Loading initial data');
        console.log('User state:', user ? 'Logged in' : 'Not logged in');
        
        const results = await searchCanadianProducts({});
        console.log('Initial data loaded, results:', results.length);
        setProducts(results);
        setAllProducts(results);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user]); // Reload when user auth state changes

  // Search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        // Only reset to initial data if the search is actually empty
        const results = await searchCanadianProducts({});
        setProducts(results);
        setAllProducts(results);
        return;
      }

      // Check if search query contains only special characters
      if (!/[a-zA-Z0-9]/.test(term)) {
        setProducts([]);
        setAllProducts([]);
        return;
      }

      console.log('Starting search with query:', term);
      console.log('User state:', user ? 'Logged in' : 'Not logged in');
      
      setLoading(true);
      try {
        console.log('Attempting search with:', {
          isAuthenticated: !!user,
          searchQuery: term,
        });
        
        const results = await searchCanadianProducts({ brand_name: term });
        console.log('Search completed, results:', results.length);
        setProducts(results);
        setAllProducts(results);
      } catch (error) {
        console.error('Search error:', error);
        console.error('Full error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
      } finally {
        setLoading(false);
      }
    }, 300),
    [user]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchQuery(term);
    debouncedSearch(term);  // Pass the current term directly
  };

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

  const countTotalCategories = (products: CanadianProduct[]) => {
    return products.reduce((sum, p) => {
      return sum + p.categories.length;
    }, 0);
  };

  const countTotalStatus = (products: CanadianProduct[]) => {
    return products.reduce((sum, p) => {
      return sum + (p.production_verified ? 1 : 0);
    }, 0);
  };

  const countTotalTags = (products: CanadianProduct[]) => {
    return products.reduce((sum, p) => {
      return sum + p.cdn_prod_tags.length;
    }, 0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter products based on all criteria
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Product filter
      const matchesProduct = !productFilter || 
        product.products.some(p => 
          p.toLowerCase().includes(productFilter.toLowerCase())
        );

      // Category filter
      const matchesCategory = !categoryFilter ||
        product.categories.some(c =>
          c.toLowerCase().includes(categoryFilter.toLowerCase())
        );

      // Location filter - check city and province
      const matchesLocation = !locationFilter ||
        (product.city?.toLowerCase().includes(locationFilter.toLowerCase()) ||
         product.province?.toLowerCase().includes(locationFilter.toLowerCase()));

      return matchesProduct && matchesCategory && matchesLocation;
    });
  }, [products, productFilter, categoryFilter, locationFilter]);

  // Update table to use filteredProducts
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredProducts, page, rowsPerPage]);

  return (
    <Box sx={{ 
      width: '95%',
      height: 'calc(100vh - 164px)',
      position: 'fixed',
      top: 60,
      left: 0,
      right: 0,
      margin: '0 auto',
      bgcolor: 'background.paper',
      pb: 7 // padding for footer
    }}>
      {/* Header Section */}
      <Box sx={{ mt: 1, px: 1 }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 1
        }}>
          <img src="/2.png" alt="Canada Flag" style={{ width: '100px', height: 'auto' }} />
        </Box>

        <Typography variant="h6" component="h6" color="primary" align="center" gutterBottom>
          Canadian Products Search
        </Typography>

        {/* Stats Display */}
        {stats && (
          <Card sx={{p: 0, mb: 1.5, mt: 0, width: '100%'}}>
            <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
              <Grid container spacing={0}>
              <Grid item xs={2.4}>
                  <Box>
                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                      Totals
                    </Typography>
                    
                  </Box>
                </Grid>
                <Grid item xs={2.4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                      Products
                    </Typography>
                    <Typography variant="body2">
                      {stats ? countTotalProducts(Object.values(stats.products || {})) : <CircularProgress size={12} />}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={2.4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                      Brands
                    </Typography>
                    <Typography variant="body2">
                      {stats.total ?? <CircularProgress size={12} />}
                    </Typography>
                  </Box>
              </Grid>
    
                <Grid item xs={2.4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                      Verified
                    </Typography>
                    <Typography variant="body2">
                      {stats.verified ?? <CircularProgress size={12} />}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={2.4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                      Pending
                    </Typography>
                    <Typography variant="body2">
                      {stats.pending ?? <CircularProgress size={12} />}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        <Paper
          component="form"
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            mt: 2,
            border: '2px solid #1976D2',
            borderRadius: '10px',
            backgroundColor: '#fff'
          }}
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Brand Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <StoreIcon sx={{ color: 'action.active' }} />
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Search brands..."
              value={searchQuery}
              onChange={handleSearch}
              endAdornment={loading && (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              )}
            />
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Product Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Inventory2Icon sx={{ color: 'action.active' }} />
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Filter by product..."
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            />
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Category Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <CategoryIcon sx={{ color: 'action.active' }} />
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Filter by category..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Location Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <LocationOnIcon sx={{ color: 'action.active' }} />
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </Box>

          <IconButton 
            sx={{ ml: 1 }}
            onClick={async () => {
              setLoading(true);
              try {
                await forceSync();
                debouncedSearch(searchQuery);
              } finally {
                setLoading(false);
              }
            }}
            aria-label="refresh"
          >
            <RefreshIcon />
          </IconButton>
        </Paper>
      </Box>

      {/* Results Section */}
      <Box sx={{ 
        mt: 2,
        height: 'calc(100% - 280px)', // increased space for header and footer
        overflow: 'auto',
        px: 2,
        pb: 2
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead
                sx={{
                  '& th': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              >
                <TableRow>
                  <TableCell width="20%" sx={{ fontWeight: 'bold', color: 'white' }}>Brand ({filteredProducts.length})</TableCell>
                  <TableCell width="25%" sx={{ fontWeight: 'bold', color: 'white' }}>Products ({countTotalProducts(filteredProducts)})</TableCell>
                  <TableCell width="20%" sx={{ fontWeight: 'bold', color: 'white' }}>Categories ({countTotalCategories(filteredProducts)})</TableCell>
                  <TableCell width="8%" sx={{ fontWeight: 'bold', color: 'white' }}>Verified ({countTotalStatus(filteredProducts)})</TableCell>
                  <TableCell width="17%" sx={{ fontWeight: 'bold', color: 'white' }}>Location</TableCell>
                  <TableCell width="10%" sx={{ fontWeight: 'bold', color: 'white' }}>Link</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleProducts.map((product, index) => (
                  <TableRow 
                    key={product._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LikeButton 
                            brandId={product._id}
                            brandName={product.brand_name}
                            initialLikeCount={product.likeStats?.totalLikes || 0}
                          />
                          
                        </Box>
                        <Typography 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            color: 'text.primary'
                          }}
                        >
                          {product.brand_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ShareButton
                          brandName={product.brand_name}
                          products={product.products}
                          website={product.website}
                        />
                        <Typography 
                          sx={{ 
                            fontSize: '0.875rem',
                            color: 'text.secondary',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          {product.products.join(', ')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        sx={{ 
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          maxWidth: '200px',
                          whiteSpace: 'normal',
                          wordBreak: 'normal'
                        }}
                      >
                        {product.categories.join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {product.production_verified ? (
                        <CheckIcon 
                          sx={{ 
                            color: '#4CAF50',
                            fontSize: '1rem'
                          }} 
                        />
                      ) : (
                        <CircleIcon 
                          sx={{ 
                            color: '#FF9800',
                            fontSize: '0.8rem'
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {product.city}, {product.province}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {product.website && (
                          <Link
                            href={product.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <IconButton size="small">
                              <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </Link>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredProducts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
