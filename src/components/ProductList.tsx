import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Grid,
  IconButton,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Snackbar,
  Autocomplete,
  Collapse,
  TablePagination,
  Tooltip,
  CircularProgress,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility, KeyboardArrowUp as KeyboardArrowUpIcon, KeyboardArrowDown as KeyboardArrowDownIcon, Clear as ClearIcon } from '@mui/icons-material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InfoIcon from '@mui/icons-material/Info';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import { useLocation } from 'react-router-dom';
import { Company } from '../types/company';
import ProductImport from './admin/ProductImport';
import PriceImport from './admin/PriceImport';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  setDoc, 
  deleteDoc,
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { Product, ProductPrice, PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../types/product';

export default function ProductList() {
  const location = useLocation();
  const brandFilter = location.state?.brandFilter;
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [newPrice, setNewPrice] = useState<Partial<ProductPrice>>({
    amount: 0,
    unit: 'each',
    store: '',
    location: {
      country: 'Canada',
      province: '',
      city: ''
    },
    date: new Date().toISOString(),
    source: 'manual',
    notes: '',
    sales_link: '',
    attributes: {}
  });
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingPrice, setEditingPrice] = useState<{productId: string, priceIndex: number} | null>(null);
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [editedPrice, setEditedPrice] = useState<Partial<ProductPrice>>({
    name: '',
    amount: 0,
    unit: 'each',
    store: '',
    location: {
      country: 'Canada',
      province: '',
      city: ''
    },
    attributes: {},
    notes: '',
    sales_link: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [showProductImport, setShowProductImport] = useState(false);
  const [showPriceImport, setShowPriceImport] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    brand: '',
    category: '',
    origin: {
      country: 'Canada',
      province: '',
      city: '',
      manufacturer: ''
    },
    attributes: {},
    prices: []
  });

  // Add filter states
  const [filters, setFilters] = useState({
    category: ''
  });

  // Add unique location lists - removed location related lists
  const [uniqueLocations, setUniqueLocations] = useState<{
    countries: string[];
    provinces: string[];
    cities: string[];
  }>({
    countries: [],
    provinces: [],
    cities: []
  });

  const attributeNameRef = React.createRef<HTMLInputElement>();
  const attributeValueRef = React.createRef<HTMLInputElement>();

  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Function to show snackbar
  const showMessage = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getAuthToken = async (user: any) => {
    try {
      // Force token refresh
      await user.getIdToken(true);
      // Get user claims without decoding locally
      const token = await user.getIdToken();
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      setAuthChecked(true);
      if (user) {
        // Check roles from Firestore first
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        console.log('User document:', userDoc.exists() ? userDoc.data() : 'No user doc');
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isUserAdmin = userData.role === 'admin' || userData.role === 'super_admin';
          const isUserSuperAdmin = userData.role === 'super_admin';
          const isUserContributor = userData.role === 'contributor' || isUserAdmin || isUserSuperAdmin;
          
          console.log('User roles:', {
            role: userData.role,
            isAdmin: isUserAdmin,
            isSuperAdmin: isUserSuperAdmin,
            isContributor: isUserContributor
          });
          
          setIsAdmin(isUserAdmin);
          setIsSuperAdmin(isUserSuperAdmin);
          
          // Get token to check claims
          const token = await getAuthToken(user);
          if (token) {
            // Use token for API calls
          }
        } else {
          console.log('No user document found in Firestore');
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
        
        // Always fetch data if user is logged in, regardless of role
        console.log('Fetching data for logged in user');
        fetchData();
      } else {
        console.log('No user logged in');
        setProducts([]);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (brandFilter) {
      setProducts(prevProducts => 
        prevProducts.filter(product => product.brand === brandFilter)
      );
    }
  }, [brandFilter]);

  useEffect(() => {
    const locations = {
      countries: new Set<string>(),
      provinces: new Set<string>(),
      cities: new Set<string>()
    };

    products.forEach(product => {
      // Add locations from origin
      if (product.origin?.country) locations.countries.add(product.origin.country);
      if (product.origin?.province) locations.provinces.add(product.origin.province);
      if (product.origin?.city) locations.cities.add(product.origin.city);
    });

    setUniqueLocations({
      countries: Array.from(locations.countries).sort(),
      provinces: Array.from(locations.provinces).sort(),
      cities: Array.from(locations.cities).sort()
    });
  }, [products]);

  const fetchData = async () => {
    try {
      console.log('Starting data fetch...');
      // Fetch companies first
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      console.log('Companies fetched:', companiesSnapshot.size);
      const companiesMap: Record<string, Company> = {};
      companiesSnapshot.docs.forEach(doc => {
        companiesMap[doc.id] = { ...doc.data(), _id: doc.id } as Company;
      });
      setCompanies(companiesMap);

      // Then fetch products
      console.log('Fetching products...');
      const productsQuery = query(collection(db, 'products'));
      const querySnapshot = await getDocs(productsQuery);
      console.log('Products fetched:', querySnapshot.size);
      
      const productList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Product data:', data);
        return {
          ...data,
          _id: doc.id
        };
      }) as Product[];

      console.log('All products:', productList);
      console.log('Brand filter:', brandFilter);

      // Apply brand filter if present
      const filteredList = brandFilter 
        ? productList.filter(product => product.brand === brandFilter)
        : productList;

      console.log('Filtered products:', filteredList);
      setProducts(filteredList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      // @ts-ignore
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please make sure you have the correct access rights.');
      } else {
        setError('Error loading products. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenPriceDialog = (product: Product) => {
    setSelectedProduct(product);
    setPriceDialogOpen(true);
  };

  const handleClosePriceDialog = () => {
    setSelectedProduct(null);
    setPriceDialogOpen(false);
    setNewPrice({
      amount: 0,
      unit: 'each',
      store: '',
      location: {
        country: 'Canada',
        province: '',
        city: ''
      },
      date: new Date().toISOString(),
      source: 'manual',
      notes: '',
      sales_link: '',
      attributes: {}
    });
    setError(null);
  };

  const handleAddPrice = async () => {
    if (!selectedProduct || !auth.currentUser) return;
    if (!newPrice.amount || !newPrice.unit || 
        !newPrice.location.country || !newPrice.location.city) {
      setError('Please fill in all required price fields (amount, unit, country, and city)');
      return;
    }

    try {
      const now = new Date().toISOString();
      const productRef = doc(db, 'products', selectedProduct._id);
      const updatedPrices = [
        ...(selectedProduct.prices || []),
        { 
          ...newPrice, 
          date: now,
          created_by: auth.currentUser.uid,
          created_by_email: auth.currentUser.email || 'unknown',
          created_by_name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'unknown',
          created_at: now,
          source: 'manual'
        } as ProductPrice
      ];

      await updateDoc(productRef, {
        prices: updatedPrices,
        updated_at: new Date()
      });

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === selectedProduct._id 
            ? { ...p, prices: updatedPrices }
            : p
        )
      );

      // Automatically expand the price section for this product
      setExpandedRows(prev => ({
        ...prev,
        [selectedProduct._id]: true
      }));

      handleClosePriceDialog();
    } catch (error) {
      console.error('Error adding price:', error);
      setError('Failed to add price. Please try again.');
    }
  };

  const handleDeletePrice = async (productId: string, priceIndex: number) => {
    try {
      const product = products.find(p => p._id === productId);
      if (!product) return;

      const updatedPrices = [...(product.prices || [])];
      updatedPrices.splice(priceIndex, 1);

      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        prices: updatedPrices,
        updated_at: new Date()
      });

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === productId
            ? { ...p, prices: updatedPrices }
            : p
        )
      );
    } catch (error) {
      console.error('Error deleting price:', error);
      setError('Failed to delete price. Please try again.');
    }
  };

  const handleOpenEditPriceDialog = (productId: string, priceIndex: number, price: ProductPrice) => {
    if (!auth.currentUser) return;
    
    // Check if user can edit this price
    const canEdit = isAdmin || isSuperAdmin || (auth.currentUser && price.created_by === auth.currentUser.uid);
    if (!canEdit) {
      setError('You can only edit prices that you created');
      return;
    }

    setEditingPrice({ productId, priceIndex });
    setEditedPrice({
      name: price.name,
      amount: price.amount,
      unit: price.unit,
      store: price.store,
      location: { ...price.location },
      notes: price.notes,
      sales_link: price.sales_link
    });
    setEditPriceDialogOpen(true);
  };

  const handleCloseEditPriceDialog = () => {
    setEditPriceDialogOpen(false);
    setEditingPrice(null);
    setEditedPrice({
      name: '',
      amount: 0,
      unit: 'each',
      store: '',
      location: {
        country: 'Canada',
        province: '',
        city: ''
      },
      notes: '',
      sales_link: ''
    });
    setError(null);
  };

  const handleSaveEditedPrice = async () => {
    if (!editingPrice || !auth.currentUser) return;
    if (!editedPrice.amount || !editedPrice.unit || 
        !editedPrice.location.country || !editedPrice.location.city) {
      setError('Please fill in all required price fields (amount, unit, country, and city)');
      return;
    }

    try {
      const token = await auth.currentUser.getIdTokenResult();
      console.log('Attempting price update with roles:', {
        admin: token.claims.admin,
        superAdmin: token.claims.superAdmin,
        contributor: token.claims.contributor
      });

      const product = products.find(p => p._id === editingPrice.productId);
      if (!product) return;

      const originalPrice = product.prices?.[editingPrice.priceIndex];
      if (!originalPrice) {
        setError('Original price not found');
        return;
      }

      console.log('Original price:', originalPrice);

      // Create the updated price object
      const updatedPrice = {
        ...originalPrice,
        name: editedPrice.name,
        amount: editedPrice.amount,
        unit: editedPrice.unit,
        store: editedPrice.store,
        location: editedPrice.location,
        notes: editedPrice.notes,
        sales_link: editedPrice.sales_link,
        modified_by: auth.currentUser.uid,
        modified_by_name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'unknown',
        modified_at: new Date().toISOString()
      };

      console.log('Updated price:', updatedPrice);

      // Get a fresh reference to the document
      const productRef = doc(db, 'products', editingPrice.productId);
      
      // Try a simpler update first - just update the specific price in the array
      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        setError('Product not found');
        return;
      }

      const prices = currentDoc.data()?.prices || [];
      prices[editingPrice.priceIndex] = updatedPrice;

      console.log('Updating with prices:', prices);

      // Update with the modified prices array
      await updateDoc(productRef, {
        prices: prices
      });

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === editingPrice.productId
            ? { ...p, prices: prices }
            : p
        )
      );

      handleCloseEditPriceDialog();
    } catch (error) {
      console.error('Error updating price:', error);
      setError('Failed to update price. Please try again.');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleDeleteProduct = async (product: Product) => {
    setDeleteConfirmProduct(product);
  };

  const confirmDelete = async () => {
    try {
      if (!deleteConfirmProduct) {
        showMessage('No product selected for deletion', 'error');
        return;
      }

      // Get the document ID (which might be in id or _id)
      const docId = deleteConfirmProduct.id || deleteConfirmProduct._id;
      if (!docId) {
        showMessage('Invalid product ID', 'error');
        return;
      }

      console.log('Deleting product with ID:', docId);
      const productRef = doc(db, 'products', docId);
      await deleteDoc(productRef);

      // Update the local state using the same ID field
      setProducts(prevProducts => prevProducts.filter(p => (p.id || p._id) !== docId));
      
      setDeleteConfirmProduct(null);
      showMessage('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      showMessage(`Error deleting product: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (!editingProduct) return;
    
    try {
      const productRef = doc(db, 'products', editingProduct._id);
      await updateDoc(productRef, {
        ...updatedProduct,
        updated_at: new Date(),
        updated_by: auth.currentUser?.uid || ''
      });
      
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === editingProduct._id
            ? { ...updatedProduct, _id: editingProduct._id }
            : p
        )
      );
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product. Please try again.');
    }
  };

  const toggleRow = (productId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    // Handle Firestore Timestamp
    const timestamp = date?.toDate ? date.toDate() : new Date(date);
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add filter handler
  const handleFilterChange = (type: keyof typeof filters, value: string | null) => {
    setFilters(prev => ({
      ...prev,
      [type]: value || ''
    }));
  };

  // Add filtered products computation
  const filteredProducts = products
    .filter(product => {
      const matchCategory = !filters.category || product.category === filters.category;
      return matchCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort by product name ascending

  const handleAddProduct = async () => {
    try {
      if (!auth.currentUser) {
        showMessage('No authenticated user found', 'error');
        return;
      }

      console.log('Attempting to add product:', newProduct);

      // Validate required fields
      if (!newProduct.name?.trim()) {
        showMessage('Please enter a product name', 'error');
        return;
      }
      if (!newProduct.brand?.trim()) {
        showMessage('Please enter a brand name', 'error');
        return;
      }

      // Get the actual category value, whether it's from the list or new
      const categoryValue = newProduct.category?.trim();
      console.log('Category value:', categoryValue);

      if (!categoryValue) {
        showMessage('Please select or enter a category', 'error');
        return;
      }

      const productRef = doc(collection(db, 'products'));
      const productData = {
        ...newProduct,
        category: categoryValue,
        created_by: auth.currentUser.uid,
        created_by_name: auth.currentUser.displayName || auth.currentUser.email,
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
        modified_by: auth.currentUser.uid,
        modified_by_name: auth.currentUser.displayName || auth.currentUser.email,
        prices: [],
        attributes: newProduct.attributes || {}
      };

      console.log('Saving product data:', productData);
      await setDoc(productRef, productData);
      
      // Add new category to PRODUCT_CATEGORIES if it's not already there
      if (categoryValue && !PRODUCT_CATEGORIES.includes(categoryValue)) {
        console.log('Adding new category:', categoryValue);
        PRODUCT_CATEGORIES.push(categoryValue);
      }

      // Update products list immediately
      setProducts(prevProducts => [...prevProducts, { ...productData, id: productRef.id }]);

      setAddDialogOpen(false);
      setNewProduct({
        name: '',
        brand: '',
        category: '',
        origin: {
          country: 'Canada',
          province: '',
          city: '',
          manufacturer: ''
        },
        attributes: {},
        prices: []
      });

      showMessage('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      showMessage(`Error adding product: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleExport = async () => {
    try {
      if (!auth.currentUser) {
        console.error('No user logged in');
        return;
      }

      const token = await getAuthToken(auth.currentUser);
      if (!token) {
        throw new Error('Failed to get auth token');
      }

      // Rest of your export logic...
    } catch (error) {
      console.error('Error during export:', error);
      setSnackbar({
        open: true,
        message: 'Error exporting data. Please try again.',
        severity: 'error'
      });
    }
  };

  if (!authChecked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
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
    <Box sx={{ width: '100%', padding: 1 }}>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5">Products</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                onClick={() => setShowProductImport(true)}
                startIcon={<AddIcon />}
              >
                Import Products
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowPriceImport(true)}
                startIcon={<AddIcon />}
              >
                Import Prices
              </Button>
            </>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Product Import Dialog */}
      <Dialog
        open={showProductImport}
        onClose={() => setShowProductImport(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Products</DialogTitle>
        <DialogContent>
          <ProductImport onClose={() => setShowProductImport(false)} />
        </DialogContent>
      </Dialog>

      {/* Price Import Dialog */}
      <Dialog
        open={showPriceImport}
        onClose={() => setShowPriceImport(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Prices</DialogTitle>
        <DialogContent>
          <PriceImport onClose={() => setShowPriceImport(false)} />
        </DialogContent>
      </Dialog>

      <Box sx={{ width: '100%', padding: { xs: 1, sm: 3 } }}>
        {/* Filters Section */}
        <Box className="filters-container">
          <Box className="filter-item">
            {!showNewCategoryInput ? (
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'add_new') {
                      setShowNewCategoryInput(true);
                      setFilters(prev => ({ ...prev, category: '' }));
                    } else {
                      setFilters(prev => ({ ...prev, category: value }));
                    }
                  }}
                  displayEmpty
                  endAdornment={
                    filters.category ? (
                      <IconButton
                        size="small"
                        sx={{ mr: 4 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilters(prev => ({ ...prev, category: '' }));
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                  <MenuItem value="add_new"><em>+ Add New Category</em></MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="New Category"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  required
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (newCategoryInput.trim()) {
                      setFilters(prev => ({ ...prev, category: newCategoryInput.trim() }));
                      if (!PRODUCT_CATEGORIES.includes(newCategoryInput.trim())) {
                        PRODUCT_CATEGORIES.push(newCategoryInput.trim());
                      }
                      setShowNewCategoryInput(false);
                      setNewCategoryInput('');
                    }
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategoryInput('');
                  }}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteConfirmProduct}
        onClose={() => setDeleteConfirmProduct(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deleteConfirmProduct?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmProduct(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit product dialog */}
      <Dialog
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          {editingProduct && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Name"
                defaultValue={editingProduct.name}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
              <TextField
                label="Brand"
                defaultValue={editingProduct.brand}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, brand: e.target.value } : null)}
              />
              {!showNewCategoryInput ? (
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editingProduct.category}
                    label="Category"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'add_new') {
                        setShowNewCategoryInput(true);
                        setEditingProduct(prev => prev ? { ...prev, category: '' } : null);
                      } else {
                        setEditingProduct(prev => prev ? { ...prev, category: value } : null);
                      }
                    }}
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                    <MenuItem value="add_new"><em>+ Add New Category</em></MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="New Category"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    required
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (newCategoryInput.trim()) {
                        setEditingProduct(prev => prev ? { ...prev, category: newCategoryInput.trim() } : null);
                        if (!PRODUCT_CATEGORIES.includes(newCategoryInput.trim())) {
                          PRODUCT_CATEGORIES.push(newCategoryInput.trim());
                        }
                        setShowNewCategoryInput(false);
                        setNewCategoryInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryInput('');
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}

              <Typography variant="subtitle1" gutterBottom>
                Origin
              </Typography>
              <TextField
                label="Country"
                defaultValue="Canada"
                onChange={(e) => setEditingProduct(prev => prev ? { 
                  ...prev, 
                  origin: { ...prev.origin, country: e.target.value }
                } : null)}
              />
              <TextField
                label="Province"
                defaultValue={editingProduct.origin.province}
                onChange={(e) => setEditingProduct(prev => prev ? { 
                  ...prev, 
                  origin: { ...prev.origin, province: e.target.value }
                } : null)}
              />
              <TextField
                label="City"
                defaultValue={editingProduct.origin.city}
                onChange={(e) => setEditingProduct(prev => prev ? { 
                  ...prev, 
                  origin: { ...prev.origin, city: e.target.value }
                } : null)}
              />
              <TextField
                label="Manufacturer"
                defaultValue={editingProduct.origin.manufacturer}
                onChange={(e) => setEditingProduct(prev => prev ? { 
                  ...prev, 
                  origin: { ...prev.origin, manufacturer: e.target.value }
                } : null)}
              />

              {/* Product Attributes Section */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Attributes
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, mb: 0 }}>
                  {Object.entries(editingProduct.attributes || {}).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      onDelete={() => {
                        setEditingProduct(prev => {
                          if (!prev) return null;
                          const newAttributes = { ...prev.attributes };
                          delete newAttributes[key];
                          return { ...prev, attributes: newAttributes };
                        });
                      }}
                      size="small"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    label="Attribute Name"
                    size="small"
                    inputRef={attributeNameRef}
                  />
                  <TextField
                    label="Value"
                    size="small"
                    inputRef={attributeValueRef}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const name = attributeNameRef.current?.value;
                      const value = attributeValueRef.current?.value;
                      if (name && value) {
                        setEditingProduct(prev => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            attributes: {
                              ...prev.attributes,
                              [name]: value
                            }
                          };
                        });
                        if (attributeNameRef.current) attributeNameRef.current.value = '';
                        if (attributeValueRef.current) attributeValueRef.current.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingProduct(null)}>Cancel</Button>
          <Button onClick={() => editingProduct && handleUpdateProduct(editingProduct)} color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={newProduct.name}
              onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Brand"
              value={newProduct.brand}
              onChange={(e) => setNewProduct(prev => ({ ...prev, brand: e.target.value }))}
            />
            {!showNewCategoryInput ? (
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newProduct.category}
                  label="Category"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'add_new') {
                      setShowNewCategoryInput(true);
                      setNewProduct(prev => ({ ...prev, category: '' }));
                    } else {
                      setNewProduct(prev => ({ ...prev, category: value }));
                    }
                  }}
                >
                  {PRODUCT_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                  <MenuItem value="add_new"><em>+ Add New Category</em></MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="New Category"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  required
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (newCategoryInput.trim()) {
                      setNewProduct(prev => ({ ...prev, category: newCategoryInput.trim() }));
                      if (!PRODUCT_CATEGORIES.includes(newCategoryInput.trim())) {
                        PRODUCT_CATEGORIES.push(newCategoryInput.trim());
                      }
                      setShowNewCategoryInput(false);
                      setNewCategoryInput('');
                    }
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategoryInput('');
                  }}
                >
                  Cancel
                </Button>
              </Box>
            )}

            <Typography variant="subtitle1" gutterBottom>
              Origin
            </Typography>
            <TextField
              label="Country"
              defaultValue="Canada"
              value={newProduct.origin.country}
              onChange={(e) => setNewProduct(prev => ({ 
                ...prev, 
                origin: { ...prev.origin, country: e.target.value }
              }))}
            />
            <TextField
              label="Province"
              value={newProduct.origin.province}
              onChange={(e) => setNewProduct(prev => ({ 
                ...prev, 
                origin: { ...prev.origin, province: e.target.value }
              }))}
            />
            <TextField
              label="City"
              value={newProduct.origin.city}
              onChange={(e) => setNewProduct(prev => ({ 
                ...prev, 
                origin: { ...prev.origin, city: e.target.value }
              }))}
            />
            <TextField
              label="Manufacturer"
              value={newProduct.origin.manufacturer}
              onChange={(e) => setNewProduct(prev => ({ 
                ...prev, 
                origin: { ...prev.origin, manufacturer: e.target.value }
              }))}
            />

            {/* Product Attributes Section */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Attributes
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, mb: 0 }}>
                {Object.entries(newProduct.attributes || {}).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => {
                      setNewProduct(prev => {
                        const newAttributes = { ...prev.attributes };
                        delete newAttributes[key];
                        return { ...prev, attributes: newAttributes };
                      });
                    }}
                    size="small"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="Attribute Name"
                  size="small"
                  inputRef={attributeNameRef}
                />
                <TextField
                  label="Value"
                  size="small"
                  inputRef={attributeValueRef}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const name = attributeNameRef.current?.value;
                    const value = attributeValueRef.current?.value;
                    if (name && value) {
                      setNewProduct(prev => ({
                        ...prev,
                        attributes: {
                          ...prev.attributes,
                          [name]: value
                        }
                      }));
                      if (attributeNameRef.current) attributeNameRef.current.value = '';
                      if (attributeValueRef.current) attributeValueRef.current.value = '';
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddProduct} variant="contained" color="primary">
            Add Product
          </Button>
        </DialogActions>
      </Dialog>

      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" className="compact-table">
            <TableHead className="table-header">
              <TableRow>
                <TableCell padding="none" sx={{ width: '48px' }} />
                <TableCell>Product</TableCell>
                <TableCell className="hide-on-mobile">Details</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((product) => (
                <React.Fragment key={product._id}>
                  <TableRow>
                    <TableCell padding="none" sx={{ width: '48px' }}>
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => toggleRow(product._id)}
                      >
                        {expandedRows[product._id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1">{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{product.brand}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell className="hide-on-mobile">
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2">{product.category}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.origin?.city && product.origin?.province 
                            ? `${product.origin.city}, ${product.origin.province}`
                            : product.origin?.country || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box className="action-buttons">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenPriceDialog(product)}
                          color="primary"
                        >
                          <AttachMoneyIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditProduct(product)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteProduct(product)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                      <Collapse in={expandedRows[product._id]} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Price History
                          </Typography>
                          <Grid container spacing={2}>
                            {(product.prices || []).map((price, index) => (
                              <Grid item xs={12} sm={6} key={index}>
                                <Paper 
                                  elevation={0} 
                                  sx={{ 
                                    p: 1.5, 
                                    bgcolor: 'background.default',
                                    border: '1px solid',
                                    borderColor: 'divider'
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                                      ${price.amount.toFixed(2)} / {price.unit}
                                    </Typography>
                                    {isAdmin && (
                                      <Box>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleOpenEditPriceDialog(product._id, index, price)}
                                        >
                                          <EditIcon />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDeletePrice(product._id, index)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Box>
                                    )}
                                  </Box>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      {price.location?.city && price.location?.province 
                                        ? `📍 ${price.location.city}, ${price.location.province}`
                                        : price.location?.country || ''}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      📅 {formatDate(price.date)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      👤 {price.created_by_name}
                                    </Typography>
                                  </Box>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                          {isAdmin && (
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenPriceDialog(product)}
                              sx={{ mt: 2 }}
                            >
                              Add Price
                            </Button>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No products found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredProducts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        {/* Price Entry Dialog */}
        <Dialog open={priceDialogOpen} onClose={handleClosePriceDialog}>
          <DialogTitle>
            Add Price for {selectedProduct?.name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name (e.g. Gala - Organic)"
                  placeholder="Enter a specific name or variation"
                  value={newPrice.name}
                  onChange={(e) => setNewPrice(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Price"
                  value={newPrice.amount}
                  onChange={(e) => setNewPrice(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={newPrice.unit}
                    label="Unit"
                    onChange={(e) => setNewPrice(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    {PRODUCT_UNITS.map((unit) => (
                      <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Store"
                  value={newPrice.store}
                  onChange={(e) => setNewPrice(prev => ({ ...prev, store: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Country"
                  defaultValue="Canada"
                  value={newPrice.location.country}
                  onChange={(e) => setNewPrice(prev => ({
                    ...prev,
                    location: { ...prev.location, country: e.target.value }
                  }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Province"
                  value={newPrice.location.province}
                  onChange={(e) => setNewPrice(prev => ({
                    ...prev,
                    location: { ...prev.location, province: e.target.value }
                  }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={newPrice.location.city}
                  onChange={(e) => setNewPrice(prev => ({
                    ...prev,
                    location: { ...prev.location, city: e.target.value }
                  }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={newPrice.notes}
                  onChange={(e) => setNewPrice(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Sales Link"
                  value={newPrice.sales_link}
                  onChange={(e) => setNewPrice(prev => ({ ...prev, sales_link: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Attributes
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Object.entries(newPrice.attributes || {}).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      onDelete={() => {
                        setNewPrice(prev => {
                          const newAttributes = { ...prev.attributes };
                          delete newAttributes[key];
                          return { ...prev, attributes: newAttributes };
                        });
                      }}
                      size="small"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    label="Attribute Name"
                    size="small"
                    inputRef={attributeNameRef}
                  />
                  <TextField
                    label="Value"
                    size="small"
                    inputRef={attributeValueRef}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const name = attributeNameRef.current?.value;
                      const value = attributeValueRef.current?.value;
                      if (name && value) {
                        setNewPrice(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            [name]: value
                          }
                        }));
                        if (attributeNameRef.current) attributeNameRef.current.value = '';
                        if (attributeValueRef.current) attributeValueRef.current.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Grid>
            </Grid>
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePriceDialog}>Cancel</Button>
            <Button onClick={handleAddPrice} variant="contained">
              Add Price
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Price Dialog */}
        <Dialog open={editPriceDialogOpen} onClose={handleCloseEditPriceDialog}>
          <DialogTitle>Edit Price</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editedPrice.name || ''}
                  onChange={(e) => setEditedPrice(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Price"
                    type="number"
                    value={editedPrice.amount || ''}
                    onChange={(e) => setEditedPrice(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={editedPrice.unit || 'each'}
                      label="Unit"
                      onChange={(e) => setEditedPrice(prev => ({ ...prev, unit: e.target.value as typeof PRODUCT_UNITS[number] }))}
                    >
                      {PRODUCT_UNITS.map((unit) => (
                        <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Store"
                  placeholder="Store Name - Address"
                  value={editedPrice.store || ''}
                  onChange={(e) => setEditedPrice(prev => ({ ...prev, store: e.target.value }))}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Country"
                    value={editedPrice.location?.country || 'Canada'}
                    onChange={(e) => setEditedPrice(prev => ({ 
                      ...prev, 
                      location: { ...(prev.location || {}), country: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Province"
                    value={editedPrice.location?.province || ''}
                    onChange={(e) => setEditedPrice(prev => ({ 
                      ...prev, 
                      location: { ...(prev.location || {}), province: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={editedPrice.location?.city || ''}
                    onChange={(e) => setEditedPrice(prev => ({ 
                      ...prev, 
                      location: { ...(prev.location || {}), city: e.target.value }
                    }))}
                  />
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Sales Link"
                  value={editedPrice.sales_link || ''}
                  onChange={(e) => setEditedPrice(prev => ({ ...prev, sales_link: e.target.value }))}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={editedPrice.notes || ''}
                  onChange={(e) => setEditedPrice(prev => ({ ...prev, notes: e.target.value }))}
                  sx={{ mb: 2 }}
                />
              </Grid>

              {/* Product Attributes Section */}
              <Typography variant="subtitle1" gutterBottom>
                Attributes
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {Object.entries(editedPrice.attributes || {}).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => {
                      setEditedPrice(prev => {
                        const newAttributes = { ...prev.attributes };
                        delete newAttributes[key];
                        return { ...prev, attributes: newAttributes };
                      });
                    }}
                    size="small"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="Attribute Name"
                  size="small"
                  inputRef={attributeNameRef}
                />
                <TextField
                  label="Value"
                  size="small"
                  inputRef={attributeValueRef}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    const name = attributeNameRef.current?.value;
                    const value = attributeValueRef.current?.value;
                    if (name && value) {
                      setEditedPrice(prev => ({
                        ...prev,
                        attributes: {
                          ...(prev.attributes || {}),
                          [name]: value
                        }
                      }));
                      if (attributeNameRef.current) attributeNameRef.current.value = '';
                      if (attributeValueRef.current) attributeValueRef.current.value = '';
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Grid>
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditPriceDialog}>Cancel</Button>
            <Button onClick={handleSaveEditedPrice} variant="contained" color="primary">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
