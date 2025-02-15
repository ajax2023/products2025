import React, { useState, useEffect, useCallback } from 'react';
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
  InputBase
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import CircleIcon from '@mui/icons-material/Circle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { searchCanadianProducts, forceSync } from '../utils/canadianProducts';
import { CanadianProduct } from '../types/product';
import CanadianProductUpload from './admin/CanadianProductUpload';
import { auth, db } from '../firebaseConfig';
import { collection, query, getDocs, where } from 'firebase/firestore';
import debounce from 'lodash/debounce';
import { cacheService } from '../services/cacheService';

export default function CanadianProductSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<CanadianProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    verified: number;
    pending: number;
    products: { [key: string]: CanadianProduct };
  } | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [allProducts, setAllProducts] = useState<CanadianProduct[]>([]);

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
        pending: total - verified,
        products
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Try to get cached data first
        const cachedStats = await cacheService.get('product-stats');
        if (cachedStats) {
          setStats(cachedStats);
        }

        // Get fresh data
        await fetchStats();
        
        // Cache the fresh data
        if (stats) {
          await cacheService.set('product-stats', stats);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
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

  // Debounced search with cache
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        // Try to get cached search results first
        const cacheKey = `search-${term}`;
        const cachedResults = await cacheService.get(cacheKey);
        if (cachedResults) {
          setProducts(cachedResults);
          setLoading(false);
        }

        // Get fresh results
        const results = await searchCanadianProducts({
          brand_name: term,
        });
        setProducts(results);
        
        // Cache the fresh results
        await cacheService.set(cacheKey, results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchQuery(term);
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
  
        {/* Admin Upload Button */}
        {isAdmin && auth.currentUser && (
          <Box sx={{ width: '100%', maxWidth: 700,  mt: 1 }}>
            <CanadianProductUpload
              userId={auth.currentUser.uid}
              userEmail={auth.currentUser.email || ''}
              userName={auth.currentUser.displayName || ''}
            />
          </Box>
        )}

        {/* Stats Display */}
        {stats && (
          <Card sx={{p: 0, mb: 1.5, mt: 0, width: '100%', maxWidth: 700}}>
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
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: 700,
            mb: 2
          }}
          onSubmit={(e) => e.preventDefault()}
        >
          <SearchIcon sx={{ ml: 1, color: 'action.active' }} />
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search for products or categories..."
            value={searchQuery}
            onChange={handleSearch}
            endAdornment={loading && (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            )}
          />
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

        {!searchQuery && (
          <Box sx={{ 
            width: '100%', 
            maxWidth: 700, 
            textAlign: 'center',
            mt: 1
          }}>
            <Typography variant="h6" color="text.secondary">
              Enter text to get a list of brands and products...
            </Typography>
          </Box>
        )}

        {/* Stats and Results - Only show if there's a search query */}
        {searchQuery && (
          <>
            {/* Stats Section */}
            <Paper sx={{ p: 0, mb: 0.5, mt: 1, width: '100%', maxWidth: 700 }}>
              <Grid container spacing={0}>
                <Grid item xs={2.4}>
                  <Box>
                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                      Search Results
                    </Typography>
                    
                  </Box>
                </Grid>
                <Grid item xs={2.4}>
                 
                  <Box textAlign="center">
                    <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                      Brands-Companies
                    </Typography>
                    <Typography variant="body2">
                      {products.length}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={2.4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                      Products
                    </Typography>
                    <Typography variant="body2">
                      {countTotalProducts(products)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={2.4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                      Verified
                    </Typography>
                    <Typography variant="body2">
                      {products.filter(p => p.production_verified).length}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={2.4}>
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

            {/* Results Table */}
            <TableContainer 
              component={Paper} 
              sx={{ 
                width: '100%',
                maxWidth: 700,
                overflowX: 'auto',
                mb: 2
              }} 
              aria-label="product results"
            >
              <Table 
                size="small"
                sx={{ 
                  minWidth: {
                    xs: 400,     
                    sm: 650      
                  },
                  tableLayout: 'fixed'
                }} 
                aria-label="product results"
              >
                <TableHead
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white'
                }}
                >
                  <TableRow>
                    <TableCell width="15%" sx={{ fontWeight: 'bold', color: 'white' }}>Brand Name</TableCell>
                    
                    <TableCell width="25%" sx={{ fontWeight: 'bold', color: 'white' }}>Products</TableCell>
                    <TableCell width="20%" sx={{ fontWeight: 'bold', color: 'white' }}>Categories</TableCell>
                    <TableCell width="10%" sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                    <TableCell width="10%" sx={{ fontWeight: 'bold', color: 'white' }}>Actions</TableCell>
                    <TableCell width="15%" sx={{ fontWeight: 'bold', color: 'white' }}>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((product) => (
                      <TableRow 
                        key={product._id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>
                          <Typography 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: '0.875rem',
                              color: 'text.primary'
                            }}
                          >
                            {product.brand_name}
                          </Typography>
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
                            {product.products.join(', ')}
                          </Typography>
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
                        <TableCell>
                          <Typography 
                            sx={{ 
                              fontSize: '0.875rem',
                              color: 'text.secondary'
                            }}
                          >
                            {product.city}, {product.province}
                          </Typography>
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
          </>
        )}
      </Box>
    </Box>
  );
}
