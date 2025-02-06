import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Paper,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility, KeyboardArrowUp as KeyboardArrowUpIcon, KeyboardArrowDown as KeyboardArrowDownIcon, Clear as ClearIcon, CloudUpload as ImportIcon } from '@mui/icons-material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InfoIcon from '@mui/icons-material/Info';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

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
  arrayRemove,
  addDoc
} from 'firebase/firestore';
import { Product, ProductPrice, PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../types/product';
import { UserSettings } from '../types/userSettings';
import { Company } from '../types/company';
import ProductImport from './admin/ProductImport';
import PriceImport from './admin/PriceImport'; // Update PriceImport path to use CSV version
import CompanyForm from './CompanyForm';

export default function ProductList() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search')?.toLowerCase() || '';
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
    name: '',
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
  const [isContributor, setIsContributor] = useState(false);
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
    locationEnabled: true,
    showAllPrices: false,
  });

  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [useMyLocation, setUseMyLocation] = useState(false);

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
    autoHideDuration: number;
  }>({
    open: false,
    message: '',
    severity: 'success',
    autoHideDuration: 3000
  });

  // Function to show snackbar
  const showMessage = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
      autoHideDuration: 3000
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

  // Initial data fetch
  const fetchData = async () => {
    if (!authChecked) return;
    
    setLoading(true);
    setError(null);
    
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

      // Fetch products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      console.log('Products fetched:', productsSnapshot.size);
      const productsList = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          _id: doc.id,
          prices: data.prices || [],
          name: data.name || '',
          description: data.description || '',
          brand: data.brand || '',
          category: data.category || '',
          tags: data.tags || []
        };
      }) as Product[];

      // Apply filters
      let filteredProducts = filterProductsBySearch(productsList);
      if (brandFilter) {
        filteredProducts = filteredProducts.filter(product => product.brand === brandFilter);
      }
      
      console.log('Products filtered:', filteredProducts.length);
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load products. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (authChecked) {
      fetchData();
    }
  }, [authChecked, searchQuery, brandFilter]);

  // Expose refresh function to window for Navbar to use
  useEffect(() => {
    (window as any).refreshProducts = fetchData;

    return () => {
      delete (window as any).refreshProducts;
    };
  }, []);

  // Auth and settings check
  useEffect(() => {
    const checkAuthAndSettings = async () => {
      try {
        // Wait for auth to initialize
        if (!auth.currentUser) {
          setAuthChecked(true);
          return;
        }

        // Get user settings
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserSettings(userDoc.data() as UserSettings);
        } else {
          // Create default user settings if none exist
          const defaultSettings: UserSettings = {
            _id: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            role: 'viewer',
            preferences: {
              useLocation: false
            },
            location: {},
            created_at: new Date().toISOString(),
            created_by: auth.currentUser.uid
          };
          await setDoc(doc(db, 'users', auth.currentUser.uid), defaultSettings);
          setUserSettings(defaultSettings);
        }
        setAuthChecked(true);
      } catch (error) {
        console.error('Error checking auth and settings:', error);
        setError('Error loading user settings. Please refresh the page.');
        setAuthChecked(true);
      }
    };

    checkAuthAndSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      setAuthChecked(true);
      if (user) {
        // Load user settings
        const userSettingsRef = doc(db, 'userSettings', user.uid);
        const userSettingsDoc = await getDoc(userSettingsRef);
        if (userSettingsDoc.exists()) {
          const settings = userSettingsDoc.data() as UserSettings;
          setUserSettings(settings);
          setFilters(prev => ({ 
            ...prev, 
            locationEnabled: settings?.preferences?.useLocation ?? true 
          }));
        }

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
          setIsContributor(isUserContributor);
          
          // Get token to check claims
          const token = await getAuthToken(user);
          if (token) {
            // Use token for API calls
          }
        } else {
          console.log('No user document found in Firestore');
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsContributor(false);
        }
        
        // Always fetch data if user is logged in, regardless of role
        console.log('Fetching data for logged in user');
        fetchData();
      } else {
        console.log('No user logged in');
        setProducts([]);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsContributor(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Debounced log function
  const debouncedLog = (() => {
    let timeout: NodeJS.Timeout | null = null;
    return (message: string, data: any) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        console.log(message, data);
        timeout = null;
      }, 100);
    };
  })();

  const filterPricesByLocation = (prices: ProductPrice[]) => {
    if (!filters.locationEnabled || !prices) return prices;
    if (!userSettings?.location) return prices;

    const userCountry = userSettings.location.country;
    const userProvince = userSettings.location.province;
    const userCity = userSettings.location.city;

    // Debug raw prices first
    // console.log('Raw prices:', prices.map(p => ({
    //   amount: p.amount,
    //   store: p.store_name,
    //   link: p.product_link,
    //   sales_link: p.sales_link,
    //   isOnline: p.store_name?.toLowerCase() === 'online'
    // })));

    return prices.filter(price => {
      // Check for any type of link
      const hasLink = price.product_link || price.sales_link;
      const isOnline = price.store_name?.toLowerCase() === 'online';

      // Show all prices with links or online store
      if (hasLink || isOnline) {
        // console.log('Keeping price with link/online:', {
        //   amount: price.amount,
        //   store: price.store_name,
        //   hasProductLink: !!price.product_link,
        //   hasSalesLink: !!price.sales_link,
        //   isOnline
        // });
        return true;
      }

      // For local store prices, apply location filtering
      if (!price.location) return false;
      
      const priceCountry = price.location.country;
      const priceProvince = price.location.province;
      const priceCity = price.location.city;

      const matches = (
        (!userCountry || userCountry === priceCountry) &&
        (!userProvince || userProvince === priceProvince) &&
        (!userCity || userCity === priceCity)
      );

      // if (!matches) {
      //   console.log('Filtered out local price:', {
      //     amount: price.amount,
      //     store: price.store_name,
      //     location: price.location
      //   });
      // }

      return matches;
    });
  };

  const filterProductsBySearch = (products: Product[]) => {
    if (!searchQuery) return products;
    if (!products) return [];

    return products.filter(product => {
      try {
        const productMatch = 
          (product.name?.toLowerCase() || '').includes(searchQuery) ||
          (product.description?.toLowerCase() || '').includes(searchQuery) ||
          (product.brand?.toLowerCase() || '').includes(searchQuery) ||
          (product.category?.toLowerCase() || '').includes(searchQuery) ||
          (product.tags || []).some(tag => (tag?.toLowerCase() || '').includes(searchQuery));

        const priceMatch = filterPricesByLocation(product.prices || []).some(price => 
          (price.name?.toLowerCase() || '').includes(searchQuery) ||
          (price.notes?.toLowerCase() || '').includes(searchQuery) ||
          (price.location?.country?.toLowerCase() || '').includes(searchQuery) ||
          (price.location?.province?.toLowerCase() || '').includes(searchQuery) ||
          (price.location?.city?.toLowerCase() || '').includes(searchQuery) ||
          (price.store_name?.toLowerCase() || '').includes(searchQuery)
        );

        return productMatch || priceMatch;
      } catch (error) {
        console.error('Error filtering product:', product, error);
        return false;
      }
    });
  };

  useEffect(() => {
    const refreshProducts = async () => {
      console.log('Full refresh triggered');
      setLoading(true);
      setError(null);

      try {
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setUserSettings(userDoc.data() as UserSettings);
          }
        }

        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        const companiesMap: Record<string, Company> = {};
        companiesSnapshot.docs.forEach(doc => {
          companiesMap[doc.id] = { ...doc.data(), _id: doc.id } as Company;
        });
        setCompanies(companiesMap);

        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsList = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            _id: doc.id,
            prices: data.prices || [],
            name: data.name || '',
            description: data.description || '',
            brand: data.brand || '',
            category: data.category || '',
            tags: data.tags || []
          };
        }) as Product[];

        let filteredProducts = filterProductsBySearch(productsList);
        if (brandFilter) {
          filteredProducts = filteredProducts.filter(product => product.brand === brandFilter);
        }
        
        setProducts(filteredProducts);
        console.log('Full refresh completed');
      } catch (error) {
        console.error('Error during full refresh:', error);
        setError('Failed to refresh data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    (window as any).refreshProducts = refreshProducts;

    return () => {
      delete (window as any).refreshProducts;
    };
  }, [brandFilter, searchQuery, userSettings]);

  useEffect(() => {
    const locations = {
      countries: new Set<string>(),
      provinces: new Set<string>(),
      cities: new Set<string>()
    };

    products.forEach(product => {
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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenPriceDialog = (product: Product) => {
    setSelectedProduct(product);
    resetNewPrice();
    setPriceDialogOpen(true);
  };

  const resetNewPrice = () => {
    const location = filters.locationEnabled && userSettings?.location ? {
      country: userSettings.location.country || 'Canada',
      province: userSettings.location.province || '',
      city: userSettings.location.city || ''
    } : {
      country: 'Canada',
      province: '',
      city: ''
    };

    setNewPrice({
      amount: 0,
      unit: 'each',
      store: '',
      name: '',
      location,
      date: new Date().toISOString(),
      source: 'manual',
      notes: '',
      sales_link: '',
      attributes: {}
    });
    setError(null);
  };

  const handleClosePriceDialog = () => {
    setSelectedProduct(null);
    setPriceDialogOpen(false);
    resetNewPrice();
    setError(null);
  };

  const handleAddPrice = async () => {
    if (!selectedProduct || !auth.currentUser) return;
    if (!newPrice.amount || !newPrice.unit || 
        !newPrice.location.country || !newPrice.location.city) {
      showMessage('Please fill in all required price fields (amount, unit, country, and city)', 'error');
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
        modified_at: now,
        modified_by: auth.currentUser.uid,
        modified_by_name: auth.currentUser.displayName || auth.currentUser.email || 'unknown'
      });

      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === selectedProduct._id 
            ? { ...p, prices: updatedPrices }
            : p
        )
      );

      showMessage('Price added successfully');
      handleClosePriceDialog();
    } catch (error) {
      console.error('Error adding price:', error);
      showMessage(`Error adding price: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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
        modified_at: new Date().toISOString(),
        modified_by: auth.currentUser?.uid || '',
        modified_by_name: auth.currentUser?.displayName || auth.currentUser?.email || 'unknown'
      });

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
    
    const canEdit = isAdmin || isSuperAdmin || (auth.currentUser && price.created_by === auth.currentUser.uid);
    if (!canEdit) {
      setError('You can only edit prices that you created');
      return;
    }

    setEditingPrice({ productId, priceIndex });
    setEditedPrice({
      ...price,  
      name: price.name || '',
      amount: price.amount,
      unit: price.unit,
      store: price.store,
      location: { ...price.location },
      notes: price.notes || '',
      sales_link: price.sales_link || '',
      attributes: { ...price.attributes }
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

      const updatedPrice = {
        ...originalPrice,  
        ...editedPrice,    
        modified_by: auth.currentUser.uid,
        modified_by_name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'unknown',
        modified_at: new Date().toISOString()
      };

      const productRef = doc(db, 'products', editingPrice.productId);
      
      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        setError('Product not found');
        return;
      }

      const prices = currentDoc.data()?.prices || [];
      prices[editingPrice.priceIndex] = updatedPrice;

      await updateDoc(productRef, {
        prices: prices,
        modified_at: new Date(),
        modified_by: auth.currentUser.uid,
        modified_by_name: auth.currentUser.displayName || auth.currentUser.email || 'unknown'
      });

      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === editingPrice.productId
            ? { ...p, prices: prices }
            : p
        )
      );

      showMessage('Price updated successfully', 'success');
      handleCloseEditPriceDialog();
    } catch (error) {
      console.error('Error updating price:', error);
      setError('Failed to update price. Please try again.');
    }
  };

  const handleEditProduct = (product: Product) => {
    // Make sure to include company_id in the initial state
    setEditingProduct({
      ...product,
      company_id: product.company_id || ''
    });
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

      const docId = deleteConfirmProduct.id || deleteConfirmProduct._id;
      if (!docId) {
        showMessage('Invalid product ID', 'error');
        return;
      }

      console.log('Deleting product with ID:', docId);
      const productRef = doc(db, 'products', docId);
      await deleteDoc(productRef);

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
      console.log('Updating product with data:', {
        company_id: updatedProduct.company_id,
        manufacturer: companies[updatedProduct.company_id]?.name
      });

      const productRef = doc(db, 'products', editingProduct._id);
      const productData = {
        ...updatedProduct,
        company_id: updatedProduct.company_id || null,
        origin: {
          ...updatedProduct.origin,
          manufacturer: updatedProduct.company_id ? companies[updatedProduct.company_id]?.name : ''
        },
        updated_at: new Date(),
        updated_by: auth.currentUser?.uid || ''
      };
      
      await updateDoc(productRef, productData);
      
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === editingProduct._id
            ? { ...productData, _id: editingProduct._id }
            : p
        )
      );
      setEditingProduct(null);
      showMessage('Product updated successfully');
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
    const timestamp = date?.toDate ? date.toDate() : new Date(date);
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocationScore = (product: Product) => {
    if (!userSettings?.location) return 0;
    if (!filters.locationEnabled) return 0;
    
    let score = 0;
    const userLocation = userSettings.location;

    if (userLocation.country && product.origin?.country === userLocation.country) {
      score += 3;
    }

    if (userLocation.province && product.origin?.province === userLocation.province) {
      score += 2;
    }

    if (userLocation.city && product.origin?.city === userLocation.city) {
      score += 1;
    }

    return score;
  };

  const getFilteredProducts = () => {
    return products
      .filter(product => !filters.category || product.category === filters.category)
      .sort((a, b) => {
        if (filters.locationEnabled) {
          const scoreA = getLocationScore(a);
          const scoreB = getLocationScore(b);
          if (scoreA !== scoreB) {
            return scoreB - scoreA; 
          }
        }
        return a.name.localeCompare(b.name); 
      });
  };

  const filteredProducts = getFilteredProducts();

  const handleLocationToggle = async () => {
    try {
      if (!auth.currentUser) return;

      const newLocationEnabled = !filters.locationEnabled;
      setFilters(prev => ({ ...prev, locationEnabled: newLocationEnabled }));

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        'preferences.useLocation': newLocationEnabled
      });

      setUserSettings(prev => prev ? {
        ...prev,
        preferences: {
          ...prev.preferences,
          useLocation: newLocationEnabled
        }
      } : null);

      fetchData();
    } catch (error) {
      console.error('Error updating location preference:', error);
      setError('Failed to update location preference');
    }
  };

  useEffect(() => {
    if (userSettings?.preferences) {
      setFilters(prev => ({
        ...prev,
        locationEnabled: userSettings.preferences.useLocation ?? true
      }));
    }
  }, [userSettings]);

  const handleAddProduct = async () => {
    try {
      if (!auth.currentUser) {
        showMessage('No authenticated user found', 'error');
        return;
      }

      console.log('Attempting to add product:', newProduct);

      if (!newProduct.name?.trim()) {
        showMessage('Please enter a product name', 'error');
        return;
      }
      if (!newProduct.brand?.trim()) {
        showMessage('Please enter a brand name', 'error');
        return;
      }

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
        company_id: newProduct.company_id,
        origin: {
          ...newProduct.origin,
          manufacturer: newProduct.company_id ? companies[newProduct.company_id]?.name : ''
        },
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
      
      if (categoryValue && !PRODUCT_CATEGORIES.includes(categoryValue)) {
        console.log('Adding new category:', categoryValue);
        PRODUCT_CATEGORIES.push(categoryValue);
      }

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
        severity: 'error',
        autoHideDuration: 3000
      });
    }
  };

  const handleCompanySelect = async (companyId: string) => {
    console.log('Selected company:', companyId);
    
    setEditingProduct(prev => {
      if (!prev) return null;
      console.log('Previous state:', prev);
      const newState = {
        ...prev,
        company_id: companyId
      };
      console.log('New state:', newState);
      return newState;
    });
  };

  const handleNewCompany = async (mode: 'add' | 'edit') => {
    setCompanyDialogMode(mode);
    setShowCompanyDialog(true);
  };

  const handleCompanyDialogClose = () => {
    setShowCompanyDialog(false);
  };

  const handleCompanySubmit = async (companyData: Partial<Company>) => {
    try {
      const companyRef = await addDoc(collection(db, 'companies'), {
        ...companyData,
        created_at: new Date(),
        created_by: auth.currentUser?.uid,
        updated_at: new Date(),
        updated_by: auth.currentUser?.uid
      });

      // Add the new company to our local state
      const newCompany = {
        ...companyData,
        _id: companyRef.id
      } as Company;

      setCompanies(prev => ({
        ...prev,
        [companyRef.id]: newCompany
      }));

      // Select the new company
      handleCompanySelect(companyRef.id);
      handleCompanyDialogClose();
      showMessage('Company created successfully!');
    } catch (error) {
      console.error('Error creating company:', error);
      showMessage('Failed to create company', 'error');
    }
  };

  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [companyDialogMode, setCompanyDialogMode] = useState<'add' | 'edit'>('add');

  const handleViewCompany = (companyId: string) => {
    navigate(`/companies/${companyId}`);
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" sx={{ mr: 1 }}>Products</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                onClick={() => setShowProductImport(true)}
                startIcon={<ImportIcon />}
              >
                Products
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowPriceImport(true)}
                startIcon={<ImportIcon />}
              >
                Prices
              </Button>
            </>
          )}
          {(isAdmin || isContributor) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
            >
              Product
            </Button>
          )}
        </Box>
      </Box>

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
        <Box className="filters-container" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.locationEnabled}
                onChange={handleLocationToggle}
                disabled={!userSettings?.location?.country}
              />
            }
            label="Use My Location"
          />
          <Box className="filter-item" sx={{ flexGrow: 1 }}>
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
              <FormControl fullWidth>
                <InputLabel>Company</InputLabel>
                <Select
                  value={editingProduct.company_id || ''}
                  onChange={(e) => handleCompanySelect(e.target.value)}
                  label="Company"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {Object.entries(companies).map(([id, company]) => (
                    <MenuItem key={id} value={id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleNewCompany('edit')}
                  variant="outlined"
                >
                  Add New Company
                </Button>
                {editingProduct.company_id && (
                  <Button
                    size="small"
                    onClick={() => handleViewCompany(editingProduct.company_id!)}
                    variant="outlined"
                  >
                    View Company Details
                  </Button>
                )}
              </Box>
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
            <FormControl fullWidth>
              <InputLabel>Company</InputLabel>
              <Select
                value={newProduct.company_id || ''}
                onChange={(e) => handleCompanySelect(e.target.value)}
                label="Company"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {Object.entries(companies).map(([id, company]) => (
                  <MenuItem key={id} value={id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleNewCompany('add')}
                variant="outlined"
              >
                Add New Company
              </Button>
              {newProduct.company_id && (
                <Button
                  size="small"
                  onClick={() => handleViewCompany(newProduct.company_id!)}
                  variant="outlined"
                >
                  View Company Details
                </Button>
              )}
            </Box>
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
            <TableHead sx={{ 
              backgroundColor: '#c5c5c5',
              '& th': {
                fontWeight: 'bold',
                color: 'rgba(0, 0, 0, 0.87)',
                whiteSpace: 'nowrap'
              }
            }}>
              <TableRow>
                <TableCell padding="none" sx={{ width: '48px' }} />
                <TableCell sx={{ width: '30%' }}>Product</TableCell>
                <TableCell sx={{ width: '50%', textAlign: 'center' }} className="hide-on-mobile">Details</TableCell>
                <TableCell sx={{ width: '20%', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((product, index) => (
                <React.Fragment key={product._id}>
                  <TableRow 
                    sx={{ 
                      '&:nth-of-type(odd)': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      }
                    }}
                  >
                    <TableCell padding="none" sx={{ width: '48px' }}>
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => toggleRow(product._id)}
                      >
                        {expandedRows[product._id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ width: '30%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1">{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{product.brand}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: '50%', textAlign: 'center' }} className="hide-on-mobile">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="body2">{product.category}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.company_id && companies[product.company_id]?.name}
                          {product.origin?.city && product.origin?.province && (
                            <span>
                              {product.company_id ? ' - ' : ''}
                              {`${product.origin.city}, ${product.origin.province}`}
                            </span>
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: '20%', textAlign: 'right' }}>
                      <Box className="action-buttons">
                        {(isAdmin || isContributor) && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenPriceDialog(product)}
                            color="primary"
                          >
                            <AttachMoneyIcon />
                          </IconButton>
                        )}
                        {(isAdmin || isContributor) && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditProduct(product)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {(isAdmin || isContributor) && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteProduct(product)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell 
                      style={{ paddingBottom: 0, paddingTop: 0 }} 
                      colSpan={4}
                      sx={{
                        backgroundColor: 'rgba(188, 188, 188, 0.4)',
                        borderBottom: 'none'
                      }}
                    >
                      <Collapse in={expandedRows[product._id]} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                            Price History
                            {(isAdmin || isContributor) && (
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenPriceDialog(product)}
                                sx={{ ml: 2 }}
                              >
                                Add Price
                              </Button>
                            )}
                          </Typography>
                          <Grid container spacing={2}>
                            {filterPricesByLocation(product.prices || []).map((price, index) => (
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
                                      {price.name && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                          {price.name}
                                        </Typography>
                                      )}
                                    </Typography>
                                    {(isAdmin || (isContributor && price.created_by === auth.currentUser?.uid)) && (
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
                                  <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          📍 {price.location?.city && price.location?.province 
                                            ? `${price.location.city}, ${price.location.province}`
                                            : price.location?.country || ''}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          📅 {formatDate(price.date)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          🏪 {price.store || 'No store specified'}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {price.source && (
                                          <Typography variant="body2" color="text.secondary">
                                            Source: {price.source}
                                          </Typography>
                                        )}
                                        {price.notes && (
                                          <Typography variant="body2" color="text.secondary">
                                            📝 {price.notes}
                                          </Typography>
                                        )}
                                        {Object.keys(price.attributes || {}).length > 0 && (
                                          <Box>
                                            <Typography variant="body2" color="text.secondary">
                                              Attributes:
                                            </Typography>
                                            {Object.entries(price.attributes || {}).map(([key, value]) => (
                                              <Typography key={key} variant="body2" color="text.secondary" sx={{ pl: 1 }}>
                                                • {key}: {value}
                                              </Typography>
                                            ))}
                                          </Box>
                                        )}
                                      </Box>
                                    </Grid>
                                  </Grid>
                                  {price.sales_link && (
                                    <Button
                                      size="small"
                                      startIcon={<OpenInNewIcon />}
                                      onClick={() => window.open(price.sales_link, '_blank')}
                                      sx={{ mt: 1 }}
                                    >
                                      View Product Link
                                    </Button>
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
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
          component="div"
          count={filteredProducts.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            backgroundColor: '#c5c5c5',
              '& th': {
                fontWeight: 'bold',
                color: 'rgba(0, 0, 0, 0.87)'
              
            },
          }}
        />

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

        {/* Add Company Dialog */}
        <Dialog open={showCompanyDialog} onClose={handleCompanyDialogClose}>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogContent>
            <CompanyForm
              onSubmit={handleCompanySubmit}
              onCancel={handleCompanyDialogClose}
              isSubmitting={false}
            />
          </DialogContent>
        </Dialog>
      </Paper>
    </Box>
  );
}
