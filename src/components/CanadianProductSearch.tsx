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
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Alert,
  Snackbar,
  CheckCircleIcon,
  ErrorIcon,
} from '@mui/material';
// import SearchIcon from '@mui/icons-material/Search';
// import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import CircleIcon from '@mui/icons-material/Circle';
import StoreIcon from '@mui/icons-material/Store';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import VerifiedIcon from '@mui/icons-material/Verified';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
// import AddIcon from '@mui/icons-material/Add';
import debounce from 'lodash/debounce';
import { cacheService } from '../services/cacheService';
import { useAuth } from '../auth/useAuth';
import { default as LikeButton } from './LikeButton';
import { default as ShareButton } from './ShareButton';
import { searchCanadianProducts, forceSync } from '../utils/canadianProducts';
import { CanadianProduct } from '../types/product';
import { auth, db } from '../firebaseConfig';
import { collection, query, getDocs, where, doc, getDoc, limit } from 'firebase/firestore';
import { groceryDb, GroceryPreference, GroceryItem } from '../config/groceryDb';
import { ProductSelectionDialog } from './dialogs/ProductSelectionDialog';

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
  const [selectedProduct, setSelectedProduct] = useState<CanadianProduct | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [readingProductId, setReadingProductId] = useState<string | null>(null);
  const [selectedProductForGrocery, setSelectedProductForGrocery] = useState<CanadianProduct | null>(null);
  const [groceryPreferences, setGroceryPreferences] = useState<GroceryPreference[]>([]);
  const [groceryNotification, setGroceryNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedPreference, setSelectedPreference] = useState<GroceryPreference | null>(null);
  const [productSelectionDialogOpen, setProductSelectionDialogOpen] = useState(false);
  const [selectedProductsForPreference, setSelectedProductsForPreference] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

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
          email: user.email,
        });

        // Try a test read
        const testQuery = await getDocs(query(collection(db, 'canadian_products'), limit(1)));
        console.log('Auth: Test query result', {
          success: !testQuery.empty,
          count: testQuery.size,
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
      snapshot.forEach(doc => {
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
          name: error.name,
        });
      }
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadGroceryPreferences();
    }
  }, [user]);

  const loadGroceryPreferences = async () => {
    if (!user) return;
    
    try {
      const preferences = await groceryDb.groceryPreferences
        .where('userId')
        .equals(user.uid)
        .toArray();
      
      setGroceryPreferences(preferences);
      
      // If there are preferences, set the selected preference
      if (preferences.length > 0) {
        setSelectedPreference(preferences[0]);
      }
      
      return preferences;
    } catch (err) {
      console.error('Error loading grocery preferences:', err);
      return [];
    }
  };

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
          stack: error.stack,
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
    debouncedSearch(term); // Pass the current term directly
  };

  const countTotalProducts = (products: CanadianProduct[]) => {
    return products.reduce((sum, p) => {
      if (!p.products) return sum;
      
      const productCount = p.products
        .map(prod => prod?.split(',')?.map(p => p?.trim()) || [])
        .flat()
        .filter(p => p && p.length > 0).length;
      return sum + productCount;
    }, 0);
  };

  const countTotalCategories = (products: CanadianProduct[]) => {
    return products.reduce((sum, p) => {
      return sum + (p.categories?.length || 0);
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
      const matchesProduct =
        !productFilter ||
        (product.products && product.products.some(p => p && p.toLowerCase().includes(productFilter.toLowerCase())));

      // Category filter
      const matchesCategory =
        !categoryFilter ||
        (product.categories && product.categories.some(c => c && c.toLowerCase().includes(categoryFilter.toLowerCase())));

      // Location filter - check city and province
      const matchesLocation =
        !locationFilter ||
        product.city?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        product.province?.toLowerCase().includes(locationFilter.toLowerCase());

      return matchesProduct && matchesCategory && matchesLocation;
    });
  }, [products, productFilter, categoryFilter, locationFilter]);

  // Update table to use filteredProducts
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredProducts, page, rowsPerPage]);

  // Function to read text aloud
  const readNotes = useCallback((product: CanadianProduct) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const text = `Notes for ${product.brand_name}. ${product.notes || 'No notes available.'}`;
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.onstart = () => setReadingProductId(product._id);
      utterance.onend = () => setReadingProductId(null);
      utterance.onerror = () => setReadingProductId(null);

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleAddToGroceryPreferences = (event: React.MouseEvent<HTMLElement>, product: CanadianProduct) => {
    setSelectedProductForGrocery(product);
    // Open product selection dialog first
    setProductSelectionDialogOpen(true);
  };

  const handleProductsSelected = (selectedProducts: string[]) => {
    setSelectedProductsForPreference(selectedProducts);
    setProductSelectionDialogOpen(false);
    
    // Reload preferences to ensure we have the latest data before showing categories
    loadGroceryPreferences().then(() => {
      // After products are selected and preferences are refreshed, show categories
      if (groceryPreferences.length > 0) {
        setSelectedPreference(groceryPreferences[0]);
        setCategoryDialogOpen(true);
      } else {
        // If no preferences exist, create one
        handleCreateNewPreference();
      }
    });
  };

  const handleAddToCategory = async (categoryIndex: number) => {
    if (!selectedProductForGrocery || !selectedPreference || !user || selectedProductsForPreference.length === 0) {
      setCategoryDialogOpen(false);
      return;
    }

    try {
      // Get the current preference
      const preference = await groceryDb.groceryPreferences.get(selectedPreference.id as number);
      
      if (!preference) {
        throw new Error('Preference not found');
      }

      const updatedCategories = [...preference.categories || []];
      const updatedItems = [...(preference.items || [])];
      
      // Add each selected product to the category and items
      for (const productName of selectedProductsForPreference) {
        // Create a new grocery item from the selected product
        const newItem: GroceryItem = {
          id: crypto.randomUUID(),
          name: `${productName} by ${selectedProductForGrocery.brand_name}`,
          category: selectedProductForGrocery.categories[0] || 'Other',
          canadianProductId: selectedProductForGrocery._id,
        };
        
        // Add the item to the specified category
        if (categoryIndex >= 0 && categoryIndex < updatedCategories.length) {
          updatedCategories[categoryIndex].items.push(newItem.name);
        }
        
        // Also add to the items array for reference
        updatedItems.push(newItem);
      }
      
      // Update the preference
      await groceryDb.groceryPreferences.update(preference.id!, {
        ...preference,
        items: updatedItems,
        categories: updatedCategories,
        canadianProducts: [...(preference.canadianProducts || []), selectedProductForGrocery._id]
      });

      // Show success notification
      setGroceryNotification({
        open: true,
        message: `${selectedProductsForPreference.length} item(s) added to ${updatedCategories[categoryIndex].title} category`,
        severity: 'success'
      });

      // Reload preferences
      await loadGroceryPreferences();
    } catch (err) {
      console.error('Error adding to grocery category:', err);
      setGroceryNotification({
        open: true,
        message: 'Failed to add products to category',
        severity: 'error'
      });
    }

    setCategoryDialogOpen(false);
    setNewCategoryName('');
  };

  const handleCreateNewCategory = async () => {
    if (!selectedProductForGrocery || !selectedPreference || !user || selectedProductsForPreference.length === 0 || !newCategoryName.trim()) {
      return;
    }

    try {
      // Get the current preference
      const preference = await groceryDb.groceryPreferences.get(selectedPreference.id as number);
      
      if (!preference) {
        throw new Error('Preference not found');
      }

      const updatedCategories = [...preference.categories || []];
      const updatedItems = [...(preference.items || [])];
      
      // Create a new category
      const newCategoryIndex = updatedCategories.length;
      updatedCategories.push({
        title: newCategoryName.trim(),
        items: []
      });
      
      // Add each selected product to the new category and items
      for (const productName of selectedProductsForPreference) {
        // Create a new grocery item from the selected product
        const newItem: GroceryItem = {
          id: crypto.randomUUID(),
          name: `${productName} by ${selectedProductForGrocery.brand_name}`,
          category: newCategoryName.trim(),
          canadianProductId: selectedProductForGrocery._id,
        };
        
        // Add the item to the new category
        updatedCategories[newCategoryIndex].items.push(newItem.name);
        
        // Also add to the items array for reference
        updatedItems.push(newItem);
      }
      
      // Update the preference
      await groceryDb.groceryPreferences.update(preference.id!, {
        ...preference,
        items: updatedItems,
        categories: updatedCategories,
        canadianProducts: [...(preference.canadianProducts || []), selectedProductForGrocery._id]
      });

      // Show success notification
      setGroceryNotification({
        open: true,
        message: `${selectedProductsForPreference.length} item(s) added to new "${newCategoryName}" category`,
        severity: 'success'
      });

      // Reload preferences
      await loadGroceryPreferences();
      
      // Reset state
      setNewCategoryName('');
      setCategoryDialogOpen(false);
    } catch (err) {
      console.error('Error creating new category:', err);
      setGroceryNotification({
        open: true,
        message: 'Failed to create new category',
        severity: 'error'
      });
    }
  };

  const handleCloseGroceryNotification = () => {
    setGroceryNotification({ ...groceryNotification, open: false });
  };

  return (
    <Box
      sx={{
        width: '95%',
        height: 'calc(100vh - 100px)',
        position: 'fixed',
        top: 60,
        left: 0,
        right: 0,
        margin: '0 auto',
        bgcolor: 'background.paper',
        pb: 7, // padding for footer
      }}
    >
      <Typography variant="h6" component="h6" color="primary" align="center" sx={{ mt: 1 }}>
        Canadian Products Search
      </Typography>

      {/* Search Bar */}
      <Paper
        component="form"
        sx={{
          p: 0.5,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
          mb: 1,
          mt: 1,
          border: '2px solid #1976D2',
          borderRadius: '10px',
          backgroundColor: '#fff',
        }}
        onSubmit={e => e.preventDefault()}
      >
        {/* Brand Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '150px' }}>
          <StoreIcon sx={{ color: 'primary.main' }} />
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              color: 'primary.main',
              border: '1px solid #1976D2',
              borderRadius: '4px',
              pl: 0.5,
            }}
            placeholder="Search brands..."
            value={searchQuery}
            onChange={handleSearch}
            endAdornment={loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
          />
        </Box>

        {/* Product Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '150px' }}>
          <Inventory2Icon sx={{ color: 'primary.main' }} />
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              color: 'primary.main',
              border: '1px solid #1976D2',
              borderRadius: '4px',
              pl: 0.5,
            }}
            placeholder="Filter by product..."
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
          />
        </Box>

        {/* Category Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '150px' }}>
          <CategoryIcon sx={{ color: 'primary.main' }} />
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              color: 'primary.main',
              border: '1px solid #1976D2',
              borderRadius: '4px',
              pl: 0.5,
            }}
            placeholder="Filter by category..."
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          />
        </Box>

        {/* Location Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '150px' }}>
          <LocationOnIcon sx={{ color: 'primary.main' }} />
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              color: 'primary.main',
              border: '1px solid #1976D2',
              borderRadius: '4px',
              pl: 0.5,
            }}
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          />
        </Box>
      </Paper>

      {/* Results Section */}
      <Box
        sx={{
          mt: 0.5,
          height: !user ? 'calc(100% - 194px)' : 'calc(100% - 150px)', // Add 44px when user is not logged in
          overflow: 'auto',
          px: 0.5,
          pb: 0.5,
        }}
      >
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
                    fontWeight: 'bold',
                  },
                }}
              >
                <TableRow>
                  <TableCell width="22%" sx={{ fontWeight: 'bold', color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StoreIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                      <span>Brand ({filteredProducts.length})</span>
                    </Box>
                  </TableCell>
                  <TableCell width="17%" sx={{ fontWeight: 'bold', color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CategoryIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                      <span>Categories ({countTotalCategories(filteredProducts)})</span>
                    </Box>
                  </TableCell>
                  <TableCell width="8%" sx={{ fontWeight: 'bold', color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                      <span> ({countTotalStatus(filteredProducts)})</span>
                    </Box>
                  </TableCell>
                  <TableCell width="12%" sx={{ fontWeight: 'bold', color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                      <span>Location</span>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ backgroundColor: 'primary.dark' }}>
                  <TableCell colSpan={4} sx={{ fontWeight: 'bold', color: 'white', py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Inventory2Icon sx={{ color: 'white', fontSize: '1.2rem' }} />
                      <span>({countTotalProducts(filteredProducts)}) Products</span>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* ROWCSS - Alternating row colors for entire records (both rows together) */}
                {visibleProducts.map((product, index) => {
                  // Determine if this is an even or odd record for alternating colors
                  const isEven = index % 2 === 0;
                  const rowBackground = isEven ? 'white' : 'rgba(10, 10, 10, 0.1)' ;
                  // const rowcolor = isEven ? 'none' : '1px solid red';
                  
                  return (
                  <React.Fragment key={product._id}>
                    <TableRow
                      sx={{ 
                        backgroundColor: rowBackground,
                        // '& td': { borderBottom: rowcolor },
                        // '&:last-child td': { borderBottom: 'none' }

                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LikeButton
                              brandId={product._id}
                              brandName={product.brand_name}
                              initialLikeCount={product.likeStats?.totalLikes || 0}
                            />
                            {product.website && (
                              <Link href={product.website} target="_blank" rel="noopener noreferrer">
                                <IconButton size="small">
                                  <OpenInNewIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                                </IconButton>
                              </Link>
                            )}
                          </Box>
                          <Typography
                            sx={{
                              fontWeight: 500,
                              fontSize: '0.875rem',
                              color: 'text.primary',
                              cursor: 'pointer',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                            onClick={() => {
                              setSelectedProduct(product);
                              setNotesDialogOpen(true);
                            }}
                          >
                            {product.brand_name}
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
                            wordBreak: 'normal',
                            cursor: 'pointer',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                          onClick={() => {
                            setSelectedProduct(product);
                            setNotesDialogOpen(true);
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
                              fontSize: '1rem',
                            }}
                          />
                        ) : (
                          <CircleIcon
                            sx={{
                              color: '#FF9800',
                              fontSize: '0.8rem',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                          onClick={() => {
                            setSelectedProduct(product);
                            setNotesDialogOpen(true);
                          }}
                        >
                          {product.city}, {product.province}
                        </Typography>
                      </TableCell>

                    </TableRow>
                    <TableRow sx={{ 
                      backgroundColor: rowBackground,
                      '&:last-child td, &:last-child th': { border: 0 },
                      '& td': { borderBottom: 'none' }
                    }}>
                      <TableCell colSpan={4} sx={{ py: 0.5, borderTop: '1px dashed rgba(224, 224, 224, 0.5)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
                            <ShareButton
                              brandName={product.brand_name}
                              products={product.products}
                              website={product.website}
                            />
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedProduct(product);
                                setNotesDialogOpen(true);
                              }}
                              sx={{
                                padding: '4px',
                                '& .MuiSvgIcon-root': {
                                  fontSize: '1.1rem',
                                  color: 'primary.main',
                                },
                              }}
                            >
                              <InfoOutlinedIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => readNotes(product)}
                              sx={{
                                padding: '4px',
                                '& .MuiSvgIcon-root': {
                                  fontSize: '1.1rem',
                                  color: theme =>
                                    readingProductId === product._id
                                      ? theme.palette.secondary.main
                                      : theme.palette.primary.main,
                                  animation:
                                    readingProductId === product._id ? 'pulse 1s infinite' : 'none',
                                },
                                '@keyframes pulse': {
                                  '0%': {
                                    transform: 'scale(1)',
                                    opacity: 1,
                                  },
                                  '50%': {
                                    transform: 'scale(1.1)',
                                    opacity: 0.7,
                                  },
                                  '100%': {
                                    transform: 'scale(1)',
                                    opacity: 1,
                                  },
                                },
                              }}
                            >
                              <VolumeUpIcon />
                            </IconButton>
                            {user && (
                              <Tooltip title="Add to Grocery">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleAddToGroceryPreferences(e, product)}
                                  sx={{
                                    padding: '4px',
                                    '& .MuiSvgIcon-root': {
                                      fontSize: '1.1rem',
                                      color: 'primary.main',
                                    },
                                  }}
                                >
                                  <AddShoppingCartIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.875rem',
                              color: 'text.secondary',
                              display: 'inline-flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                            onClick={() => {
                              setSelectedProduct(product);
                              setNotesDialogOpen(true);
                            }}
                          >
                            {product.products.join(', ')}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                    </TableRow>
                    
                    {/* Black spacer between records */}
                    {index < visibleProducts.length - 1 && (
                      <TableRow sx={{ height: '2px', bgcolor: 'black' }}>
                        <TableCell colSpan={4} sx={{ padding: 0 }} />
                      </TableRow>
                    )}
                  </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredProducts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                height: '40px',
                maxHeight: '40px',
                minHeight: '40px',
                overflow: 'hidden',
                p: 0.5,
                '& .MuiToolbar-root': {
                  height: '40px',
                  minHeight: '40px',
                  pl: 2,
                  pr: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                '& .MuiTablePagination-select': {
                  color: 'white',
                  '&:focus': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                },
                '& .MuiTablePagination-selectIcon': {
                  color: 'white',
                },
                '& .MuiTablePagination-displayedRows': {
                  margin: 0,
                },
                '& .MuiTablePagination-actions': {
                  marginLeft: 2,
                  '& .MuiIconButton-root': {
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&.Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.3)',
                    },
                  },
                },
              }}
            />
          </TableContainer>
        )}
      </Box>

      {/* Product Selection Dialog */}
      {selectedProductForGrocery && (
        <ProductSelectionDialog
          open={productSelectionDialogOpen}
          onClose={() => setProductSelectionDialogOpen(false)}
          brandName={selectedProductForGrocery.brand_name}
          products={selectedProductForGrocery.products}
          onProductsSelected={handleProductsSelected}
        />
      )}

      {/* Category Selection Dialog */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={() => setCategoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Category</DialogTitle>
        <DialogContent>
          {/* Show selected products */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Selected Products:
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 0.5, 
              mt: 1,
              p: 1,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              {selectedProductsForPreference.map((product, index) => (
                <Chip 
                  key={index} 
                  label={product} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" fontWeight="medium">
            Select a category:
          </Typography>
          
          {/* Existing preference categories */}
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Preference Categories:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedPreference?.categories?.map((category, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  size="small"
                  sx={{ m: 0.5 }}
                  onClick={() => handleAddToCategory(index)}
                >
                  {category.title}
                </Button>
              ))}
            </Box>
          </Box>
          
          {/* Product's own categories */}
          {selectedProductForGrocery?.categories && selectedProductForGrocery.categories.length > 0 && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Product Categories:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedProductForGrocery.categories.map((category, index) => {
                  // Check if this category already exists in preferences
                  const categoryExists = selectedPreference?.categories?.some(
                    prefCat => prefCat.title.toLowerCase() === category.toLowerCase()
                  );
                  
                  if (categoryExists) {
                    return null; // Skip if category already exists
                  }
                  
                  return (
                    <Button
                      key={index}
                      variant="contained"
                      color="secondary"
                      size="small"
                      sx={{ m: 0.5 }}
                      onClick={async () => {
                        // Create this category if it doesn't exist
                        if (!selectedPreference) return;
                        
                        try {
                          const preference = await groceryDb.groceryPreferences.get(selectedPreference.id as number);
                          if (!preference) throw new Error('Preference not found');
                          
                          const updatedCategories = [...preference.categories || []];
                          const newCategoryIndex = updatedCategories.length;
                          
                          // Add the new category
                          updatedCategories.push({
                            title: category,
                            items: []
                          });
                          
                          // Update preference with new category
                          await groceryDb.groceryPreferences.update(preference.id!, {
                            ...preference,
                            categories: updatedCategories
                          });
                          
                          // Reload preferences
                          await loadGroceryPreferences();
                          
                          // Now add products to this new category
                          handleAddToCategory(newCategoryIndex);
                        } catch (err) {
                          console.error('Error creating category from product:', err);
                          setGroceryNotification({
                            open: true,
                            message: 'Failed to create category',
                            severity: 'error'
                          });
                        }
                      }}
                    >
                      {category}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}
          
          {/* Create new category */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Create New Category:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Enter new category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                variant="outlined"
              />
              <Button
                variant="contained"
                color="primary"
                disabled={!newCategoryName.trim()}
                onClick={handleCreateNewCategory}
              >
                Create
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCategoryDialogOpen(false);
            setNewCategoryName('');
          }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog
        open={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                color: 'primary.main',
                fontWeight: 500,
                fontSize: '1rem',
              }}
            >
              {selectedProduct?.brand_name} - Notes
            </Typography>
            <IconButton
              size="small"
              onClick={() => selectedProduct && readNotes(selectedProduct)}
              sx={{
                padding: '4px',
                '& .MuiSvgIcon-root': {
                  fontSize: '1.1rem',
                  color: theme =>
                    readingProductId === selectedProduct?._id
                      ? theme.palette.secondary.main
                      : theme.palette.primary.main,
                  animation:
                    readingProductId === selectedProduct?._id ? 'pulse 1s infinite' : 'none',
                },
              }}
            >
              <VolumeUpIcon />
            </IconButton>
          </Box>
          <IconButton
            aria-label="close"
            onClick={() => setNotesDialogOpen(false)}
            sx={{
              color: theme => theme.palette.grey[500],
              '&:hover': {
                color: theme => theme.palette.grey[700],
                backgroundColor: theme => theme.palette.grey[100],
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 1 }}>
          <DialogContentText
            sx={{
              whiteSpace: 'pre-line',
              color: 'text.primary',
              fontSize: '0.95rem',
              lineHeight: 1.6,
            }}
          >
            {selectedProduct?.notes || 'No notes available'}
          </DialogContentText>
        </DialogContent>
      </Dialog>


   <Snackbar
  open={groceryNotification.open}
  autoHideDuration={6000}
  onClose={handleCloseGroceryNotification}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Keeps it at the top
  sx={{ 
    position: 'absolute', // Ensures custom positioning
    marginTop: '20px', // Moves it down from the top
    zIndex: 1800  // Ensures it's above other elements
  }}
>
  <Alert 
    onClose={handleCloseGroceryNotification} 
    severity={groceryNotification.severity}
    sx={{ width: '100%' }}
  >
    {groceryNotification.message}
  </Alert>
</Snackbar>

    </Box>
  );
}
