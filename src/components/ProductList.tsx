// FORMAT TEST
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '../auth/useAuth';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Chip,
  IconButton,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Collapse,
  FormControlLabel,
  Checkbox,
  DialogContentText,
  InputAdornment,
  Autocomplete,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  useMediaQuery
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Clear as ClearIcon,
  CloudUpload as ImportIcon,
  Search as SearchIcon,
  CameraAlt as CameraAltIcon
} from "@mui/icons-material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InfoIcon from "@mui/icons-material/Info";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ImageIcon from "@mui/icons-material/Image";
import CameraDialog from './CameraDialog';

import { auth, db, storage } from '../firebaseConfig';
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
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Product, ProductPrice, PRODUCT_CATEGORIES, PRODUCT_UNITS } from "../types/product";
import { UserSettings } from "../types/userSettings";
import { Company } from "../types/company";
import ProductImport from "./admin/ProductImport";
import PriceImport from "./admin/PriceImport"; // Update PriceImport path to use CSV version
import CompanyForm from "./CompanyForm";
import { updateUserStats } from '../utils/userStats';

export default function ProductList() {
  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  // Auth context and state
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);

  // Update admin status when claims or user changes
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // First check claims
      if (user) {
        setIsAdmin(user.claims?.admin === true);
        setIsSuperAdmin(user.claims?.superAdmin === true);
        setIsContributor(user.claims?.contributor === true || user.claims?.admin === true || user.claims?.superAdmin === true);
      }

      try {
        // Then check Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.role === 'admin' || userData.role === 'super_admin');
          setIsSuperAdmin(userData.role === 'super_admin');
          setIsContributor(userData.role === 'contributor' || userData.role === 'admin' || userData.role === 'super_admin');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    checkUserRole();
  }, [user]);

  // Search params
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  // Update search when URL changes
  useEffect(() => {
    const query = searchParams.get("search")?.toLowerCase() || "";
    setSearchQuery(query);
  }, [searchParams]);

  // Handle search input
  const handleSearchInput = useCallback((value: string) => {
    if (value) {
      navigate(`/?search=${encodeURIComponent(value)}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Basic state
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  // Search and filters
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedCanadianOriginType, setSelectedCanadianOriginType] = useState<string>("");
  const brandFilter = location.state?.brandFilter;

  // Basic state
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductImport, setShowProductImport] = useState(false);
  const [showPriceImport, setShowPriceImport] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [flagPickerOpen, setFlagPickerOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Form states
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    brand: "",
    category: "Food & Beverage",
    company_id: "",
    origin: {
      country: "Canada",
      province: "",
      city: ""
    },
    product_tags: {},
    prices: [],
    image: "",
    canadianOriginType: null
  });
  
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null);
  const [userCompanies, setUserCompanies] = useState<string[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [filters, setFilters] = useState({
    locationEnabled: true,
    showAllPrices: false
  });
  const [uniqueLocations, setUniqueLocations] = useState<{
    countries: string[];
    provinces: string[];
    cities: string[];
  }>({
    countries: [],
    provinces: [],
    cities: []
  });
  const [newPrice, setNewPrice] = useState<Partial<ProductPrice>>({
    amount: 0,
    unit: "each",
    store: "",
    store_location: "",
    name: "",
    location: {
      country: "Canada",
      province: "",
      city: ""
    },
    date: new Date().toISOString(),
    source: "manual",
    notes: "",
    sales_link: "",
    price_tags: {}
  });
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});
  const [editingPrice, setEditingPrice] = useState<{ productId: string; priceIndex: number } | null>(null);
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [editedPrice, setEditedPrice] = useState<Partial<ProductPrice>>({
    name: "",
    amount: 0,
    unit: "",
    store: "",
    store_location: "",
    location: {
      country: "Canada",
      province: "",
      city: ""
    },
    notes: ""
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>("success");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [editCameraDialogOpen, setEditCameraDialogOpen] = useState(false);
  const attributeNameRef = React.createRef<HTMLInputElement>();
  const attributeValueRef = React.createRef<HTMLInputElement>();
  
  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica', 
    'Antigua Barbuda', 'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 
    'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 
    'Bolivia', 'Bosnia Herzegovina', 'Botswana', 'Brazil', 'British Virgin Islands', 'Brunei', 'Bulgaria', 
    'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Cape Verde', 'Cayman Islands', 'Central African Republic', 
    'Chad', 'Chile', 'China', 'Christmas Island', 'Colombia', 'Comoros', 'Congo', 'Cook Islands', 'Costa Rica', 
    'Croatia', 'Cuba', 'Curacao', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 
    'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 
    'Falkland Islands', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Polynesia', 'Gabon', 'Gambia', 
    'Georgia', 'Germany', 'Ghana', 'Gibraltar', 'Greece', 'Greenland', 'Grenada', 'Guadeloupe', 'Guam', 
    'Guatemala', 'Guinea', 'Guinea Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 
    'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 
    'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 
    'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Madagascar', 
    'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Martinique', 'Mauritania', 
    'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Montserrat', 
    'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Caledonia', 
    'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'North Korea', 'North Macedonia', 'Norway', 
    'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 
    'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 
    'Saint Lucia', 'Saint Vincent', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 
    'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 
    'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 
    'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 
    'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 
    'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 
    'Zambia', 'Zimbabwe'
  ].sort();
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setNewProduct(prev => ({ ...prev, image: base64String }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage('Failed to upload image', 'error');
    }
  };

  const handleEditImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditingProduct(prev => prev ? { ...prev, image: base64String } : null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage('Failed to upload image', 'error');
    }
  };

  // Function to show snackbar
  const showMessage = useCallback((message: string, severity: AlertColor = "success") => {
    console.log(message, severity)
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // Handle snackbar close
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

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
    setLoading(true);
    setError(null);

    try {
      // console.log("Starting data fetch...");

      // Fetch companies first
      const fetchCompanies = async () => {
        try {
          const companiesCollection = collection(db, "companies");
          const companiesSnapshot = await getDocs(companiesCollection);
          const companiesData = companiesSnapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data()
          })) as Company[];
          // console.log('Companies fetched:', companiesData);
          setCompanies(companiesData);
        } catch (error) {
          console.error("Error fetching companies:", error);
          
          showMessage("Failed to fetch companies", "error");
        }
      };

      await fetchCompanies();

      // Fetch products
      const productsSnapshot = await getDocs(collection(db, "products"));
      // console.log("Products fetched:", productsSnapshot.size);
      const productsList = productsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          _id: doc.id,
          prices: data.prices || [],
          name: data.name || "",
          description: data.description || "",
          brand: data.brand || "",
          category: data.category || "",
          tags: data.tags || [],
          product_tags: data.product_tags || {}
        };
      }) as Product[];

      // Apply filters
      let filteredProducts = filterProductsBySearch(productsList);
      if (brandFilter) {
        filteredProducts = filteredProducts.filter((product) => product.brand === brandFilter);
      }

      // console.log("Products filtered:", filteredProducts.length);
      setProducts(filteredProducts);
    } catch (error) {
      console.error("Error fetching data:", error);
      
      showMessage("Failed to load products. Please try refreshing the page.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const refreshProducts = async () => {
      // console.log("Full refresh triggered");
      setLoading(true);
      setError(null);

      try {
        if (user) {
          // Load user settings
          const userSettingsRef = doc(db, "userSettings", user.uid);
          const userSettingsDoc = await getDoc(userSettingsRef);
          if (userSettingsDoc.exists()) {
            const settings = userSettingsDoc.data() as UserSettings;
            setUserSettings(settings);
            setFilters((prev) => ({
              ...prev,
              locationEnabled: settings?.preferences?.useLocation ?? true
            }));
          }

          // Fetch companies
          const companiesCollection = collection(db, "companies");
          const companiesSnapshot = await getDocs(companiesCollection);
          const companiesData = companiesSnapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data()
          })) as Company[];
          // console.log('Companies fetched:', companiesData);
          setCompanies(companiesData);

          // Fetch products
          const productsSnapshot = await getDocs(collection(db, "products"));
          const productsList = productsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              ...data,
              _id: doc.id,
              prices: data.prices || [],
              name: data.name || "",
              description: data.description || "",
              brand: data.brand || "",
              category: data.category || "",
              tags: data.tags || [],
              product_tags: data.product_tags || {}
            };
          }) as Product[];

          let filteredProducts = filterProductsBySearch(productsList);
          if (brandFilter) {
            filteredProducts = filteredProducts.filter((product) => product.brand === brandFilter);
          }

          // console.log("Full refresh completed");
          setProducts(filteredProducts);
        } else {
          setProducts([]);
          setCompanies([]);
        }
      } catch (error) {
        console.error("Error during full refresh:", error);
        showMessage("Failed to refresh data. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    };

    refreshProducts();

    // Expose refresh function globally for debugging
    (window as any).refreshProducts = refreshProducts;

    return () => {
      delete (window as any).refreshProducts;
    };
  }, [brandFilter]);

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
        if (!user) {
          return;
        }

        // Get user settings
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserSettings(userDoc.data() as UserSettings);
        } else {
          // Create default user settings if none exist
          const defaultSettings: UserSettings = {
            _id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            role: "contributor",
            status: "active",
            preferences: {
              language: "English",
              currency: "CAD",
              useLocation: false
            },
            location: {
              country: "Canada",
              province: "",
              city: ""
            },
            sharing: {
              showPicture: true,
              showUsername: true,
              showCountry: true,
              showOnLeaderboard: false
            },
            created_at: new Date().toISOString(),
            created_by: user.uid
          };
          await setDoc(doc(db, "users", user.uid), defaultSettings);
          setUserSettings(defaultSettings);
        }
      } catch (error) {
        console.error("Error checking auth and settings:", error);
        showMessage("Error loading user settings. Please refresh the page.", "error");
      }
    };

    checkAuthAndSettings();
  }, [user]);

  useEffect(() => {
    if (userSettings?.preferences) {
      setFilters((prev) => ({
        ...prev,
        locationEnabled: userSettings.preferences.useLocation ?? true
      }));
    }
  }, [userSettings]);

  const filterPricesByLocation = (prices: ProductPrice[]) => {
    if (!filters.locationEnabled || !prices || !userSettings?.location) return prices;

    const userCountry = userSettings.location.country?.trim();
    const userProvince = userSettings.location.province?.trim();
    const userCity = userSettings.location.city?.trim();

    return prices.filter((price) => {
      try {
        // Always include online prices or prices with links
        const hasLink = price.product_link || price.sales_link;
        const isOnline = price.store_name?.toLowerCase().trim() === "online";
        if (hasLink || isOnline) return true;

        // For local store prices, check location matching
        if (!price.location) return false;

        const priceCountry = price.location.country?.trim();
        const priceProvince = price.location.province?.trim();
        const priceCity = price.location.city?.trim();

        // Match based on available location information
        // If user hasn't specified a location field, don't filter on it
        const countryMatch = !userCountry || (priceCountry && priceCountry.toLowerCase() === userCountry.toLowerCase());
        const provinceMatch = !userProvince || (priceProvince && priceProvince.toLowerCase() === userProvince.toLowerCase());
        const cityMatch = !userCity || (priceCity && priceCity.toLowerCase() === userCity.toLowerCase());

        return countryMatch && provinceMatch && cityMatch;
      } catch (error) {
        console.error("Error filtering price by location:", error, "Price:", price);
        return false;
      }
    });
  };

  const filterProductsBySearch = (products: Product[]) => {
    if (!searchQuery || !products) return products || [];

    const query = searchQuery.toLowerCase().trim();

    return products.filter((product) => {
      try {
        // Basic product info match
        const productMatch =
          (product.name?.toLowerCase().trim() || "").includes(query) ||
          (product.description?.toLowerCase().trim() || "").includes(query) ||
          (product.brand?.toLowerCase().trim() || "").includes(query) ||
          (product.category?.toLowerCase().trim() || "").includes(query) ||
          (product.tags || []).some((tag) => (tag?.toLowerCase().trim() || "").includes(query));

        // Price and location match
        const priceMatch = (product.prices || []).some(
          (price) => {
            // First check if this price should be included based on location filters
            const shouldIncludePrice = !filters.locationEnabled || filterPricesByLocation([price]).length > 0;
            
            if (!shouldIncludePrice) return false;

            return (
              (price.name?.toLowerCase().trim() || "").includes(query) ||
              (price.notes?.toLowerCase().trim() || "").includes(query) ||
              (price.location?.country?.toLowerCase().trim() || "").includes(query) ||
              (price.location?.province?.toLowerCase().trim() || "").includes(query) ||
              (price.location?.city?.toLowerCase().trim() || "").includes(query) ||
              (price.store_name?.toLowerCase().trim() || "").includes(query)
            );
          }
        );

        return productMatch || priceMatch;
      } catch (error) {
        console.error("Error filtering product:", error, "Product:", product);
        return false;
      }
    });
  };

  useEffect(() => {
    const locations = {
      countries: new Set<string>(),
      provinces: new Set<string>(),
      cities: new Set<string>()
    };

    products.forEach((product) => {
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

  const handleOpenPriceDialog = useCallback((product: Product) => {
    setSelectedProduct(product);
    setNewPrice({
      amount: 0,
      unit: "each",
      store: "",
      store_location: "",
      name: "",
      location: {
        country: "Canada",
        province: "",
        city: ""
      },
      date: new Date().toISOString(),
      source: "manual",
      notes: "",
      sales_link: "",
      price_tags: {}
    });
    setPriceDialogOpen(true);
  }, []);

  const handleClosePriceDialog = useCallback(() => {
    setSelectedProduct(null);
    setPriceDialogOpen(false);
    setPriceError(null);
    setNewPrice({
      amount: 0,
      unit: "each",
      store: "",
      store_location: "",
      name: "",
      location: {
        country: "Canada",
        province: "",
        city: ""
      },
      date: new Date().toISOString(),
      source: "manual",
      notes: "",
      sales_link: "",
      price_tags: {}
    });
  }, []);

  const handleAddPrice = (product: Product) => {
    setSelectedProduct(product);
    
    // Initialize with user's location if "Use My Location" is enabled
    const location = userSettings?.preferences?.useLocation === true && userSettings.location ? {
      country: userSettings.location.country,
      province: userSettings.location.province,
      city: userSettings.location.city
    } : {
      country: "Canada",
      province: "",
      city: ""
    };

    setNewPrice({
      amount: 0,
      unit: "each",
      store: "",
      store_location: "",
      name: product.name,
      location,
      date: new Date().toISOString(),
      source: "manual",
      notes: "",
      sales_link: "",
      price_tags: {}
    });
    setPriceDialogOpen(true);
  };

  const handleSubmitPrice = async () => {
    if (!selectedProduct || !user) return;

    // Clear any previous errors
    setPriceError(null);

    // Validate required fields
    if (!newPrice.amount || !newPrice.unit || !newPrice.location.country || !newPrice.location.city || !newPrice.store || !newPrice.store_location) {
      setPriceError("Please fill in all required fields (amount, unit, store, store location, country, and city)");
      return;
    }

    try {
      const now = new Date().toISOString();
      const productRef = doc(db, "products", selectedProduct._id);
      const updatedPrices = [
        ...(selectedProduct.prices || []),
        {
          ...newPrice,
          date: now,
          created_by: user.uid,
          created_by_email: user.email || "unknown",
          created_by_name: user.displayName || user.email?.split("@")[0] || "unknown",
        }
      ];

      await updateDoc(productRef, { prices: updatedPrices });

      // Update local state
      setProducts(prevProducts => prevProducts.map(p => 
        p._id === selectedProduct._id 
          ? { ...p, prices: updatedPrices }
          : p
      ));

      // Only close dialog and reset on success
      handleClosePriceDialog();
    } catch (error) {
      console.error("Error adding price:", error);
      setPriceError("Failed to add price. Please try again.");
      // Don't close dialog on error
    }
  };

  const handleDeletePrice = async (productId: string, priceIndex: number) => {
    try {
      const product = products.find((p) => p._id === productId);
      if (!product) return;

      const updatedPrices = [...(product.prices || [])];
      updatedPrices.splice(priceIndex, 1);

      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, {
        prices: updatedPrices,
        modified_at: new Date().toISOString(),
        modified_by: user.uid,
        modified_by_name: user.displayName || user.email || "unknown"
      });

      setProducts((prevProducts) => prevProducts.map((p) => (p._id === productId ? { ...p, prices: updatedPrices } : p)));
    } catch (error) {
      console.error("Error deleting price:", error);
      showMessage("Failed to delete price. Please try again.", "error");
    }
  };

  const handleOpenEditPriceDialog = useCallback((productId: string, priceIndex: number, price: ProductPrice) => {
    if (!user) return;

    const canEdit = isAdmin || (isContributor && price.created_by === user.uid); // TODO: implement permission check
    if (!canEdit) {
      showMessage("You can only edit prices that you created", "error");
      return;
    }

    setEditingPrice({ productId, priceIndex });
    setEditedPrice({
      ...price,
      name: price.name || "",
      amount: price.amount,
      unit: price.unit,
      store: price.store,
      store_location: price.store_location,
      location: { ...price.location },
      notes: price.notes || "",
    });
    setEditPriceDialogOpen(true);
  }, [isAdmin, isContributor, user]);

  const handleCloseEditPriceDialog = useCallback(() => {
    setEditPriceDialogOpen(false);
    setEditingPrice(null);
    setEditedPrice({
      name: "",
      amount: 0,
      unit: "",
      store: "",
      store_location: "",
      location: {
        country: "Canada",
        province: "",
        city: ""
      },
      notes: ""
    });
  }, []);

  const handleSaveEditedPrice = async () => {
    if (!editingPrice || !user) return;
    if (!editedPrice.amount || !editedPrice.unit || !editedPrice.location.country || !editedPrice.location.city || !editedPrice.store || !editedPrice.store_location) {
      
      showMessage("Please fill in all required price fields (amount, unit, store, store location, country, and city)", "error");
      return;
    }

    try {
      const token = await user.getIdTokenResult();
      // console.log("Attempting price update with roles:", {
      //   admin: token.claims.admin,
      //   superAdmin: token.claims.superAdmin,
      //   contributor: token.claims.contributor
      // });

      const product = products.find((p) => p._id === editingPrice.productId);
      if (!product) return;

      const originalPrice = product.prices?.[editingPrice.priceIndex];
      if (!originalPrice) {
        showMessage("Original price not found", "error");
        return;
      }

      const updatedPrice = {
        ...originalPrice,
        ...editedPrice,
        modified_by: user.uid,
        modified_by_name: user.displayName || user.email?.split("@")[0] || "unknown",
        modified_at: new Date().toISOString()
      };

      const productRef = doc(db, "products", editingPrice.productId);

      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        showMessage("Product not found", "error");
        return;
      }

      const prices = currentDoc.data()?.prices || [];
      prices[editingPrice.priceIndex] = updatedPrice;

      await updateDoc(productRef, {
        prices: prices,
        modified_at: new Date(),
        modified_by: user.uid,
        modified_by_name: user.displayName || user.email || "unknown"
      });

      setProducts((prevProducts) => prevProducts.map((p) => (p._id === editingPrice.productId ? { ...p, prices: prices } : p)));

      // Update user stats
      if (user.uid) {
        await updateUserStats(user.uid);
      }

      showMessage("Price updated successfully", "success");
      handleCloseEditPriceDialog();
    } catch (error) {
      console.error("Error updating price:", error);
      showMessage("Failed to update price. Please try again.", "error");
    }
  };

  const handleEditClick = (product: Product) => {
    // console.log('Starting edit for product:', product);
    setEditingProduct({ ...product, _id: product._id });
    setEditDialogOpen(true);
  };

  const handleUpdateProduct = async (product: Product, closeDialog = true) => {
    try {
      if (!product._id) {
        console.error('No product ID');
        return;
      }

      setUpdating(true);
      const productRef = doc(db, "products", product._id);
      
      const cleanProduct = {
        ...product,
        updated_at: new Date(),
        updated_by: user.uid,
        updated_by_name: user.displayName || user.email || "unknown"
      };

      // console.log('Saving product:', cleanProduct);
      await updateDoc(productRef, cleanProduct);
      
      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => p._id === product._id ? cleanProduct : p)
      );

      // Update user stats
      if (user.uid) {
        await updateUserStats(user.uid);
      }

      showMessage('Product updated successfully', 'success');
      
      if (closeDialog) {
        setEditDialogOpen(false);
        setFlagPickerOpen(false);
        setEditingProduct(null);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      showMessage('Error updating product', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    console.log('Delete requested for product:', {
      id: product._id,
      name: product.name,
      created_at: product.created_at,
      created_by: product.created_by
    });
    setDeleteConfirmProduct(product);
  };

  const confirmDelete = async () => {
    const logs: any[] = [];
    const logStep = (step: string, data: any) => {
      const log = { timestamp: new Date().toISOString(), step, data };
      logs.push(log);
      console.log('%c[DELETE LOG]', 'background: #222; color: #bada55; font-size: 12px; padding: 2px 5px;', log);
      // Also log expanded data for better visibility
      console.log('%c[DELETE DATA]', 'color: #bada55;', data);
      // On error, dump all logs to help debugging
      console.error('%c[FULL LOG HISTORY]', 'background: #222; color: #ff6b6b; font-size: 14px; padding: 2px 5px;');
      logs.forEach((log, index) => {
        console.error(`%cStep ${index + 1}: ${log.step}`, 'color: #ff6b6b; font-weight: bold;');
        console.error(log.data);
      });
    };

    if (!deleteConfirmProduct || !user) {
      logError('VALIDATION_FAILED', {
        hasProduct: !!deleteConfirmProduct,
        hasUser: !!user,
        userId: user?.uid,
        productId: deleteConfirmProduct?._id
      });
      return;
    }

    try {
      logStep('STARTING_DELETE', {
        currentUser: user ? {
          uid: user.uid,
          email: user.email,
          isAnonymous: user.isAnonymous,
        } : null,
        product: deleteConfirmProduct ? {
          id: deleteConfirmProduct._id,
          name: deleteConfirmProduct.name,
          created_by: deleteConfirmProduct.created_by
        } : null
      });

      if (!deleteConfirmProduct || !user) {
        logError('VALIDATION_FAILED', {
          hasProduct: !!deleteConfirmProduct,
          hasUser: !!user,
          userId: user?.uid,
          productId: deleteConfirmProduct?._id
        });
        return;
      }

      // First verify the user's token is valid
      logStep('VERIFYING_TOKEN', { userId: user.uid });
      const token = await user.getIdToken(true);
      const decodedToken = await user.getIdTokenResult();
      logStep('TOKEN_INFO', {
        userId: user.uid,
        email: user.email,
        tokenExpiration: decodedToken.expirationTime,
        tokenIssuedAt: decodedToken.issuedAtTime,
        claims: decodedToken.claims
      });

      // Check user role
      const userRef = doc(db, "users", user.uid);
      logStep('FETCHING_USER', {
        userRef: userRef.path,
        userId: user.uid
      });
      
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        logError('USER_NOT_FOUND', {
          userId: user.uid,
          userRef: userRef.path
        });
        throw new Error('User profile not found. Please try signing out and in again.');
      }

      const userData = userSnap.data();
      const isAdmin = userData.role === 'admin' || userData.role === 'super_admin';
      logStep('USER_AUTH_CHECK', {
        userId: user.uid,
        role: userData.role,
        isAdmin,
        userData // Log full user data for debugging
      });
      
      // Get product data
      const productRef = doc(db, "products", deleteConfirmProduct._id);
      logStep('FETCHING_PRODUCT', {
        productRef: productRef.path,
        productId: deleteConfirmProduct._id
      });
      
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) {
        logError('PRODUCT_NOT_FOUND', {
          productId: deleteConfirmProduct._id,
          productRef: productRef.path
        });
        throw new Error('Product not found in database');
      }
      
      const productData = productSnap.data();
      logStep('PRODUCT_AUTH_CHECK', {
        productId: deleteConfirmProduct._id,
        productOwner: productData.created_by,
        currentUser: user.uid,
        isAdmin,
        canDelete: isAdmin || productData.created_by === user.uid,
        productData // Log full product data for debugging
      });
      
      setUpdating(true);

      // Verify delete permission
      if (!isAdmin && productData.created_by !== user.uid) {
        logError('PERMISSION_DENIED', {
          productOwner: productData.created_by,
          currentUser: user.uid,
          isAdmin,
          userRole: userData.role,
          productId: deleteConfirmProduct._id
        });
        throw new Error('You do not have permission to delete this product. Only the creator or admins can delete products.');
      }

      // Attempt deletion
      logStep('ATTEMPTING_DELETE', {
        productId: deleteConfirmProduct._id,
        userRole: userData.role,
        isAdmin,
        productOwner: productData.created_by,
        currentUser: user.uid,
        token: token.substring(0, 10) + '...' // Log part of token for debugging
      });
      
      await deleteDoc(productRef);
      logStep('DELETE_SUCCESS', {
        productId: deleteConfirmProduct._id
      });

      setProducts((prevProducts) => prevProducts.filter((p) => p._id !== deleteConfirmProduct._id));
      await updateUserStats(user.uid);
      
    } catch (error) {
      logError('DELETE_FAILED', error);
      if (error instanceof Error) {
        logError('ERROR_DETAILS', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          productId: deleteConfirmProduct?._id,
          userId: user?.uid
        });
      }
      setError(error instanceof Error ? error.message : "Failed to delete product");
      throw error;
    } finally {
      setUpdating(false);
      setDeleteConfirmProduct(null);
    }
  };

  const uploadImageToStorage = async (imageDataUrl: string, productId: string): Promise<string> => {
    try {
      // console.log('Starting upload for product:', productId);
      
      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      // console.log('Blob created:', { size: blob.size, type: blob.type });
      
      // Create a reference to the storage location
      const storage = getStorage();
      const imagePath = `products/${productId}_${Date.now()}.jpg`;
      const imageRef = ref(storage, imagePath);
      // console.log('Storage reference created:', { path: imagePath });
      
      // Upload the image
      // console.log('Starting upload...');
      const result = await uploadBytes(imageRef, blob);
      // console.log('Upload completed:', { 
      //   fullPath: result.metadata.fullPath,
      //   size: result.metadata.size,
      //   generation: result.metadata.generation 
      // });
      
      // Get the download URL
      // console.log('Getting download URL...');
      const url = await getDownloadURL(imageRef);
      // console.log('Download URL obtained:', url.substring(0, 100) + '...');
      
      return url;
    } catch (error) {
      console.error('Upload error:', { 
        code: error.code,
        message: error.message,
        name: error.name
      });
      throw error;
    }
  };

  const handleImageCapture = async (imageUrl: string) => {
    setNewProduct(prev => ({ ...prev, image: imageUrl }));
    setShowCameraDialog(false);
  };

  const handleEditImageCapture = async (imageUrl: string) => {
    setEditingProduct(prev => prev ? { ...prev, image: imageUrl } : null);
    setEditCameraDialogOpen(false);
  };

  const toggleRow = (productId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const formatDate = (date: any) => {
    if (!date) return "No date";
    const timestamp = date?.toDate ? date.toDate() : new Date(date);
    return timestamp.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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
      .filter((product) => !filters.category || product.category === filters.category)
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
      if (!user) return;

      const newLocationEnabled = !filters.locationEnabled;
      setFilters((prev) => ({ ...prev, locationEnabled: newLocationEnabled }));

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "preferences.useLocation": newLocationEnabled
      });

      setUserSettings((prev) =>
        prev
          ? {
              ...prev,
              preferences: {
                ...prev.preferences,
                useLocation: newLocationEnabled
              }
            }
          : null
      );

      fetchData();
    } catch (error) {
      console.error("Error updating location preference:", error);
      showMessage("Failed to update location preference", "error");
    }
  };

  const handleCompanySelect = async (companyId: string) => {
    // console.log("Selected company:", companyId);

    setEditingProduct((prev) => {
      if (!prev) return null;
      // console.log("Previous state:", prev);
      const newState = {
        ...prev,
        company_id: companyId
      };
      // console.log("New state:", newState);
      return newState;
    });
  };

  const handleNewCompany = async (mode: "add" | "edit") => {
    setCompanyDialogMode(mode);
    setShowProductImport(true);
  };

  const handleCompanyDialogClose = () => {
    setShowProductImport(false);
  };

  const handleCompanySubmit = async (companyData: Partial<Company>) => {
    try {
      const companyRef = await addDoc(collection(db, "companies"), {
        ...companyData,
        created_at: new Date(),
        created_by: user.uid,
        updated_at: new Date(),
        updated_by: user.uid
      });

      // Add the new company to our local state
      const newCompany = {
        ...companyData,
        _id: companyRef.id
      } as Company;

      setCompanies((prev) => [...prev, newCompany]);

      // Select the new company
      handleCompanySelect(companyRef.id);
      handleCompanyDialogClose();
      showMessage("Company created successfully!", "success");
    } catch (error) {
      console.error("Error creating company:", error);
      showMessage("Failed to create company", "error");
    }
  };

  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [companyDialogMode, setCompanyDialogMode] = useState<"add" | "edit">("add");

  const handleViewCompany = (companyId: string) => {
    navigate(`/companies/${companyId}`);
  };

  const canEditProduct = useCallback((product: Product) => {
    return isAdmin || (isContributor && product.created_by === user?.uid);
  }, [isAdmin, isContributor, user?.uid]);

  const canDeleteProduct = useCallback((product: Product) => {
    return isAdmin || (isContributor && product.created_by === user?.uid);
  }, [isAdmin, isContributor, user?.uid]);

  const canAddProduct = useMemo(() => {
    return isAdmin || isContributor;
  }, [isAdmin, isContributor]);

  // Fetch products when user is authenticated or search changes
  const fetchProducts = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const productsRef = collection(db, "products");
      let q = query(productsRef, orderBy("created_at", "desc"));

      // Apply company filter if selected
      if (selectedCompany) {
        q = query(q, where("company_id", "==", selectedCompany));
      }

      // Apply category filter if selected
      if (selectedCategory) {
        q = query(q, where("category", "==", selectedCategory));
      }

      // Apply brand filter if provided
      if (brandFilter) {
        q = query(q, where("brand", "==", brandFilter));
      }

      const querySnapshot = await getDocs(q);
      
      let fetchedProducts = querySnapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      })) as Product[];

      // Apply search filter if needed
      const searchLower = searchQuery.toLowerCase();
      if (searchLower) {
        fetchedProducts = fetchedProducts.filter(product => 
          product.name.toLowerCase().includes(searchLower) ||
          product.brand.toLowerCase().includes(searchLower)
        );
      }

      // Apply origin filter if selected
      if (selectedOrigin) {
        fetchedProducts = fetchedProducts.filter(product => 
          product.origin.country === selectedOrigin
        );
      }

      // Apply Canadian origin type filter if selected
      if (selectedCanadianOriginType) {
        fetchedProducts = fetchedProducts.filter(product => 
          product.canadianOriginType === selectedCanadianOriginType
        );
      }
      
      setProducts(fetchedProducts);

      // Fetch companies if needed
      if (!companies.length) {
        const companiesSnapshot = await getDocs(collection(db, "companies"));
        const companiesData = companiesSnapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data()
        })) as Company[];
        setCompanies(companiesData);
      }

    } catch (error) {
      console.error("Error fetching products:", error);
      showMessage("Failed to load products. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, selectedCompany, selectedCategory, selectedOrigin, selectedCanadianOriginType, brandFilter, companies.length]);

  // Effect to fetch products when dependencies change
  useEffect(() => {
    if (user) {
      fetchProducts();
    } else {
      setProducts([]);
      setCompanies([]);
    }
  }, [user, fetchProducts]);

  // Show loading state while auth is initializing
  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If no user, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }

  // Show error if present
  if (error) {
    return (
      <Box sx={{ p: 2, color: "error.main" }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const handleAddProduct = async () => {
    if (!user) return;
    
    try {
      if (!newProduct.name || !newProduct.category || !newProduct.canadianOriginType) {
        showMessage("Name, Category, and Origin are required", "error");
        return;
      }

      // Verify user role first
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.error('User document not found:', user.uid);
        showMessage("User profile not found. Please try signing out and in again.", "error");
        return;
      }

      const userData = userSnap.data();
      console.log('Creating new product with user:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: userData.role
      });

      if (!userData.role || (userData.role !== 'contributor' && userData.role !== 'admin' && userData.role !== 'super_admin')) {
        showMessage("You don't have permission to create products. Please request contributor access.", "error");
        return;
      }

      const productData = {
        ...newProduct,
        image: "", // Initialize with empty image URL
        created_at: new Date().toISOString(),
        created_by: user.uid,
        created_by_email: user.email || '',
        created_by_name: user.displayName || '',
        updated_at: new Date().toISOString(),
        updated_by: user.uid,
        updated_by_name: user.displayName || '',
        status: 'draft',
        is_active: true,
        version: 1
      };

      console.log('Adding product with data:', productData);
      const productRef = await addDoc(collection(db, "products"), productData);
      console.log('Product added successfully with ID:', productRef.id);

      // If there's an image (in base64), upload it to storage
      if (newProduct.image && typeof newProduct.image === 'string' && newProduct.image.startsWith('data:image')) {
        console.log('Uploading product image...');
        const imageUrl = await uploadImageToStorage(newProduct.image, productRef.id);
        
        // Update the product with the image URL
        console.log('Updating product with image URL:', imageUrl);
        await updateDoc(productRef, { image: imageUrl });
        newProduct.image = imageUrl;
      }

      const productWithId = { ...newProduct, _id: productRef.id };
      setProducts((prevProducts) => [...prevProducts, productWithId]);
      
      setNewProduct({
        name: "",
        brand: "",
        category: "Food & Beverage",
        company_id: "",
        origin: {
          country: "Canada",
          province: "",
          city: ""
        },
        product_tags: {},
        prices: [],
        image: "",
        canadianOriginType: null
      });

      showMessage("Product added successfully", "success");
      setAddDialogOpen(false); // Close the dialog after successful addition
    } catch (error) {
      console.error("Error adding product:", error);
      showMessage("Failed to add product. Please try again.", "error");
    }
  };

  return (
    <Box sx={{ width: "98%", padding: 1 }}>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* PRODUCTS PAGE */}
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography variant="h5" sx={{ mr: 0 }}>
          Products
        </Typography>

        {/* IMPORT PRODUCTS */}
        <Box sx={{ display: "flex" }}>
          {(isAdmin || isContributor) && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
              Product
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          {(isAdmin) && (
            <>
              <Button variant="outlined" onClick={() => setShowProductImport(true)} startIcon={<ImportIcon />}>
                Products
              </Button>
              <Button variant="outlined" onClick={() => setShowPriceImport(true)} startIcon={<ImportIcon />}>
                Prices
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Box sx={{ width: "100%", mt: 0, p: 1 }}>
        {/* Search and Filters Container */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
            mb: 1
          }}
        >
          {/* Search Box */}
          <TextField
            sx={{
              order: { xs: 3, sm: 1 },
              flex: { xs: "1 1 100%", sm: "1 1 300px" },
              minWidth: "200px",
              "& .MuiInputBase-root": {
                height: "40px"
              }
            }}
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search products & prices..."
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleSearchInput("")} edge="end">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          {/* Filter by Location Checkbox */}
          <FormControlLabel
            sx={{
              order: { xs: 1, sm: 2 },
              m: 0,
              "& .MuiCheckbox-root": {
                p: 0.5
              }
            }}
            control={<Checkbox checked={useMyLocation} onChange={(e) => setUseMyLocation(e.target.checked)} size="small" />}
            label={
              <Box>
                <Typography variant="body2">Filter by My Location</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Show prices near me
                </Typography>
              </Box>
            }
          />

          {/* Categories */}
          <Box
            sx={{
              order: { xs: 2, sm: 3 },
              flex: { xs: "1 1 100%", sm: "1 1 300px" },
              minWidth: "200px",
              "& .MuiInputBase-root": {
                height: "40px"
              }
            }}
          >
            {!showNewCategoryInput ? (
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "add_new") {
                      setShowNewCategoryInput(true);
                      setFilters((prev) => ({ ...prev, category: "" }));
                    } else {
                      setFilters((prev) => ({ ...prev, category: value }));
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
                          setFilters((prev) => ({ ...prev, category: "" }));
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                  <MenuItem value="add_new">
                    <em>+ Add New Category</em>
                  </MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField fullWidth label="New Category" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} required />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (newCategoryInput.trim()) {
                      setFilters((prev) => ({ ...prev, category: newCategoryInput.trim() }));
                      if (!PRODUCT_CATEGORIES.includes(newCategoryInput.trim())) {
                        PRODUCT_CATEGORIES.push(newCategoryInput.trim());
                      }
                      setShowNewCategoryInput(false);
                      setNewCategoryInput("");
                    }
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategoryInput("");
                  }}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog open={showProductImport} onClose={() => setShowProductImport(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Products</DialogTitle>
        <DialogContent>
          <ProductImport
            onSuccess={() => {
              setShowProductImport(false);
              fetchData();
            }}
            onError={(error) => {
              setError(error);
              setShowProductImport(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPriceImport} onClose={() => setShowPriceImport(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Prices</DialogTitle>
        <DialogContent>
          <PriceImport onClose={() => setShowPriceImport(false)} />
        </DialogContent>
      </Dialog>

      <Paper elevation={10} sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" className="compact-table">
            <TableHead
              sx={{
                backgroundColor: "#c5c5c5",
                "& th": {
                  fontWeight: "bold",
                  color: "rgba(0, 0, 0, 0.87)",
                  whiteSpace: "nowrap"
                }
              }}
            >
              <TableRow>
                {/* Expand/Collapse */}
                <TableCell padding="none" sx={{ width: "28px" }} />
                
                {/* IMAGE */}
                <TableCell padding="none" sx={{ width: "60px" }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px' }}>
                    <ImageIcon sx={{ color: 'white.400', fontSize: 20 }} />
                  </Box>
                </TableCell>

                {/* Product Name Column */}
                <TableCell sx={{ width: "35%" }}>Product</TableCell>

                {/* Details Column */}
                <TableCell sx={{ width: "35%" }}>Details</TableCell>

                {/* Tags Column */}
                <TableCell sx={{ width: "15%" }}>Tags</TableCell>

                {/* Actions Column */}
                <TableCell align="right" sx={{ width: "15%" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product, index) => (
                <React.Fragment key={product._id}>
                  <TableRow
                    sx={{
                      "&:nth-of-type(odd)": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)"
                      },
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.1)"
                      }
                    }}
                  >
                    {/* Expand/Collapse */}
                    <TableCell padding="none">
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => toggleRow(product._id)}
                      >
                        {expandedRows[product._id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>

                    {/* Product Image */}
                    <TableCell padding="none">
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px' }}>
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }}
                            onClick={() => handleEditClick(product)}
                          />
                        ) : (
                          <Box 
                            sx={{ 
                              width: '40px', 
                              height: '40px', 
                              bgcolor: 'grey.100',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <ImageIcon sx={{ color: 'grey.400', fontSize: 20 }} />
                          </Box>
                        )}
                      </Box>
                    </TableCell>

                    {/* Product Name/Brand */}
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {product.name}
                        </Typography>
                        {product.brand && (
                          <Typography variant="body2" color="textSecondary">
                            {product.brand}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Details */}
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {product.category && (
                          <Typography variant="body2" color="textSecondary">
                            {product.category}
                          </Typography>
                        )}
                        {product.description && (
                          <Typography variant="body2" color="textSecondary">
                            {product.description}
                          </Typography>
                        )}
                        {product.canadianOriginType && (
                          <Typography variant="body2" color="textSecondary">
                            {product.canadianOriginType === 'product_of_canada' && (isSmallScreen ? '🍁 (98%+)' : '🍁 Product of Canada (98%+)')}
                            {product.canadianOriginType === 'made_in_canada' && (isSmallScreen ? '🍁 (51%+)' : '🍁 Made in Canada (51%+)')}
                            {product.canadianOriginType === 'canada_with_imports' && (isSmallScreen ? '🍁 (w imports)' : '🍁 Made in Canada w imports')}
                            {product.canadianOriginType === 'not sure - please check' && (
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span role="img" aria-label="question mark">❓</span>
                                <span>Unknown</span>
                              </Box>
                            )}
                            {product.canadianOriginType && 
                             !['product_of_canada', 'made_in_canada', 'canada_with_imports', 'not sure - please check'].includes(product.canadianOriginType) && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <img 
                                  src={`/flags/${product.canadianOriginType}.png`} 
                                  alt={product.canadianOriginType}
                                  style={{ width: '20px', height: '15px', objectFit: 'contain' }}
                                />
                                {product.canadianOriginType}
                              </Box>
                            )}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {product.product_tags && Object.entries(product.product_tags).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={`${key}: ${value}`}
                          size="small"
                          sx={{ mr: 1, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {canEditProduct(product) && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(product)}
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleAddPrice(product)}
                          sx={{ color: 'success.main' }}
                        >
                          <AttachMoneyIcon fontSize="small" />
                        </IconButton>
                        {(isAdmin || product.created_by === user.uid) && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteProduct(product)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={6}
                      sx={{
                        backgroundColor: "rgba(188, 188, 188, 0.4)",
                        borderBottom: "none"
                      }}
                    >
                      <Collapse in={expandedRows[product._id]} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="subtitle1" gutterBottom component="div" sx={{ display: "flex", alignItems: "center" }}>
                            Price History
                            {(isAdmin || isContributor) && (
                              <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddPrice(product)} sx={{ ml: 1 }}>
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
                                    bgcolor: "background.default",
                                    border: "1px solid",
                                    borderColor: "divider"
                                  }}
                                >
                                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontSize: "1.1rem" }}>
                                      ${price.amount.toFixed(2)} / {price.unit}
                                      {price.name && (
                                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                          {price.name}
                                        </Typography>
                                      )}
                                    </Typography>
                                    {(isAdmin || (isContributor && price.created_by === user.uid)) && (
                                      <Box>
                                        <IconButton size="small" onClick={() => handleOpenEditPriceDialog(product._id, index, price)}>
                                          <EditIcon />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDeletePrice(product._id, index)}>
                                          <DeleteIcon />
                                        </IconButton>
                                      </Box>
                                    )}
                                  </Box>
                                  <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                        <Typography variant="body2" color="textSecondary">
                                          📍{" "}
                                          {price.location?.city && price.location?.province
                                            ? `${price.location.city}, ${price.location.province}`
                                            : price.location?.country || ""}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                          📅 {formatDate(price.date)}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                          🏪 {price.store || "No store specified"}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                          📍 {price.store_location || "No store location specified"}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                        {price.source && (
                                          <Typography variant="body2" color="textSecondary">
                                            Source: {price.source}
                                          </Typography>
                                        )}
                                        {price.notes && (
                                          <Typography variant="body2" color="textSecondary">
                                            📝 {price.notes}
                                          </Typography>
                                        )}
                                        {Object.keys(price.price_tags || {}).length > 0 && (
                                          <Box>
                                            <Typography variant="body2" color="textSecondary">
                                              Tags:
                                            </Typography>
                                            {Object.entries(price.price_tags || {}).map(([key, value]) => (
                                              <Typography key={key} variant="body2" color="textSecondary" sx={{ pl: 1 }}>
                                                • {key}: {value}
                                              </Typography>
                                            ))}
                                          </Box>
                                        )}
                                      </Box>
                                    </Grid>
                                  </Grid>
                                  {price.sales_link && (
                                    <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => window.open(price.sales_link, "_blank")} sx={{ mt: 1 }}>
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
                    <Typography variant="body2" color="textSecondary">
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
            backgroundColor: "#c5c5c5",
            "& th": {
              fontWeight: "bold",
              color: "rgba(0, 0, 0, 0.87)"
            }
          }}
        />
      </Paper>

      <Dialog open={!!deleteConfirmProduct} onClose={() => setDeleteConfirmProduct(null)}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deleteConfirmProduct?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmProduct(null)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {updating ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingProduct} onClose={() => {
        // console.log('Closing edit dialog');
        setEditDialogOpen(false);
        setFlagPickerOpen(false);
        setEditingProduct(null);
      }} maxWidth="md" fullWidth>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          {editingProduct && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              

              {/* NAME AND BRAND INPUT */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  fullWidth
                  label="Name"
                  defaultValue={editingProduct.name}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="Brand"
                  defaultValue={editingProduct.brand}
                  onChange={(e) => setEditingProduct(prev => ({ ...prev, brand: e.target.value }))}
                />
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                {/* CATEGORY */}
                {!showNewCategoryInput ? (
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={editingProduct.category}
                      label="Category"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "add_new") {
                          setShowNewCategoryInput(true);
                          setEditingProduct(prev => ({ ...prev, category: "" }));
                        } else {
                          setEditingProduct(prev => ({ ...prev, category: value }));
                        }
                      }}
                    >
                      {PRODUCT_CATEGORIES.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                      <MenuItem value="add_new">
                        <em>+ Add New Category</em>
                      </MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField fullWidth label="New Category" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} required />
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (newCategoryInput.trim()) {
                          setEditingProduct(prev => ({ ...prev, category: newCategoryInput.trim() }));
                          if (!PRODUCT_CATEGORIES.includes(newCategoryInput.trim())) {
                            PRODUCT_CATEGORIES.push(newCategoryInput.trim());
                          }
                          setShowNewCategoryInput(false);
                          setNewCategoryInput("");
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Canadian Origin Type */}
              <Box sx={{ mt: 0 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: 'textSecondary' }}>
                  Made in:  {editingProduct.canadianOriginType}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Button
                    variant={editingProduct.canadianOriginType === 'product_of_canada' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      // console.log('Setting product_of_canada');
                      setEditingProduct({
                        ...editingProduct,
                        canadianOriginType: 'product_of_canada'
                      });
                    }}
                    sx={{ borderColor: 'success.main', color: '#444'  }}
                  >
                    🍁 Product of Canada (98%+)
                  </Button>
                  <Button
                    variant={editingProduct.canadianOriginType === 'made_in_canada' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      // console.log('Setting made_in_canada');
                      setEditingProduct({
                        ...editingProduct,
                        canadianOriginType: 'made_in_canada'
                      });
                    }}
                    sx={{ borderColor: 'primary.main', color: '#444' }}
                  >
                    🍁 Made in Canada (51%+)
                  </Button>
                  <Button
                    variant={editingProduct.canadianOriginType === 'canada_with_imports' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      // console.log('Setting canada_with_imports');
                      setEditingProduct({
                        ...editingProduct,
                        canadianOriginType: 'canada_with_imports'
                      });
                    }}
                    sx={{ borderColor: 'info.main', color: '#444' }}
                  >
                    🍁 Made in Canada w imports)
                  </Button>
                  <Button
                    variant={editingProduct.canadianOriginType === null ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      // console.log('Setting null');
                      setEditingProduct({
                        ...editingProduct,
                        canadianOriginType: 'not sure - please check'
                      });
                    }}
                    sx={{ borderColor: 'grey.500', color: '#444' }}
                  >
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span role="img" aria-label="question mark">❓</span>
                      <span>Unknown</span>
                    </Box>
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setFlagPickerOpen(true)}
                    sx={{ borderColor: 'grey.500', color: '#444' }}
                  >
                    🌐 Select Country
                  </Button>
                </Box>
                {/* {!editingProduct.canadianOriginType && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    Please select Canadian content type
                  </Typography>
                )} */}
              </Box>

              {/* Camera Button and Image Preview */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<CameraAltIcon />}
                    onClick={() => setEditCameraDialogOpen(true)}
                  >
                    Take Picture
                  </Button>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon />}
                  >
                    Upload Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleEditImageUpload}
                    />
                  </Button>
                </Box>
                {editingProduct.image && (
                  <img 
                    src={editingProduct.image} 
                    alt="Product" 
                    style={{ width: '100px', height: '100px', objectFit: 'contain', borderRadius: '4px' }}
                  />
                )}
              </Box>

              {/* COMPANY SELECT */}
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <FormControl fullWidth>
                  <InputLabel>Company</InputLabel>
                  <Select
                    value={editingProduct.company_id || ""}
                    onChange={(e) => setEditingProduct(prev => ({ ...prev, company_id: e.target.value }))}
                    label="Company"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company._id} value={company._id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* ADD NEW COMPANY */}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => handleNewCompany("edit")} variant="outlined">
                    Add New Company
                  </Button>

                  {/* VIEW COMPANY */}
                  {/* {editingProduct.company_id && (
                    <Button size="small" onClick={() => handleViewCompany(editingProduct.company_id!)} variant="outlined">
                      View Company Details
                    </Button>
                  )} */}
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0, mb: 0 }}>
                  {Object.entries(editingProduct.product_tags || {}).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      onDelete={() => {
                        setEditingProduct(prev => {
                          if (!prev) return null;
                          const newTags = { ...prev.product_tags };
                          delete newTags[key];
                          return { ...prev, product_tags: newTags };
                        });
                      }}
                      size="small"
                    />
                  ))}
                </Box>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <TextField label="Tag Name" size="small" inputRef={attributeNameRef} />
                  <TextField label="Value" size="small" fullWidth inputRef={attributeValueRef} />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const name = attributeNameRef.current?.value;
                      const value = attributeValueRef.current?.value;
                      if (name && value) {
                        setEditingProduct(prev => prev ? { ...prev, product_tags: { ...prev.product_tags, [name]: value } } : null);
                        if (attributeNameRef.current) attributeNameRef.current.value = "";
                        if (attributeValueRef.current) attributeValueRef.current.value = "";
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
          <Button 
            onClick={() => {
              setEditDialogOpen(false);
              setFlagPickerOpen(false);
              setEditingProduct(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (editingProduct) {
                // console.log('Saving edited product:', editingProduct);
                handleUpdateProduct(editingProduct, true);
              }
            }}
            disabled={updating || !editingProduct}
            color="primary"
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD NEW PRODUCT DIALOG */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        {/* PAGE TITLE */}
        <DialogTitle>Add New Product</DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {/* NAME AND BRAND INPUT */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Brand"
                value={newProduct.brand}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, brand: e.target.value }))}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {/* CATEGORY */}
              {!showNewCategoryInput ? (
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newProduct.category}
                    label="Category"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "add_new") {
                        setShowNewCategoryInput(true);
                        setNewProduct((prev) => ({ ...prev, category: "" }));
                      } else {
                        setNewProduct((prev) => ({ ...prev, category: value }));
                      }
                    }}
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                    <MenuItem value="add_new">
                      <em>+ Add New Category</em>
                    </MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField fullWidth label="New Category" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} required />
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (newCategoryInput.trim()) {
                        setNewProduct((prev) => ({ ...prev, category: newCategoryInput.trim() }));
                        if (!PRODUCT_CATEGORIES.includes(newCategoryInput.trim())) {
                          PRODUCT_CATEGORIES.push(newCategoryInput.trim());
                        }
                        setShowNewCategoryInput(false);
                        setNewCategoryInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>

            {/* Canadian Origin Type */}
            <Box sx={{ mt: 0 }}>
              {/* <Typography variant="subtitle2" gutterBottom sx={{ color: 'error.main' }}>
                Country of Origin *
              </Typography> */}
              {!newProduct.canadianOriginType && (
                <Typography variant="caption" color="error" >
                  Please select the Country or Origin
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                
                <Button
                  variant={newProduct.canadianOriginType === 'product_of_canada' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'product_of_canada'
                  }))}
                  sx={{ 
                    borderColor: 'success.main',
                    color: newProduct.canadianOriginType === 'product_of_canada' ? 'white' : 'success.main',
                    bgcolor: newProduct.canadianOriginType === 'product_of_canada' ? 'success.main' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === 'product_of_canada' ? 'success.dark' : 'success.light',
                      borderColor: 'success.main'
                    }
                  }}
                >
                  🍁 Product of Canada (98%+)
                </Button>

                <Button
                  variant={newProduct.canadianOriginType === 'made_in_canada' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'made_in_canada'
                  }))}
                  sx={{ 
                    borderColor: 'primary.main',
                    color: newProduct.canadianOriginType === 'made_in_canada' ? 'white' : 'primary.main',
                    bgcolor: newProduct.canadianOriginType === 'made_in_canada' ? 'primary.main' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === 'made_in_canada' ? 'primary.dark' : 'primary.light',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  🍁 Made in Canada (51%+)
                </Button>
                <Button
                  variant={newProduct.canadianOriginType === 'canada_with_imports' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'canada_with_imports'
                  }))}
                  sx={{ 
                    borderColor: 'info.main',
                    color: newProduct.canadianOriginType === 'canada_with_imports' ? 'white' : 'info.main',
                    bgcolor: newProduct.canadianOriginType === 'canada_with_imports' ? 'info.main' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === 'canada_with_imports' ? 'info.dark' : 'info.light',
                      borderColor: 'info.main'
                    }
                  }}
                >
                  🍁 Made in Canada (with imports)
                </Button>
                <Button
                  variant={newProduct.canadianOriginType === null ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'not sure - please check'
                  }))}
                  sx={{ 
                    borderColor: 'grey.500',
                    color: newProduct.canadianOriginType === null ? 'white' : 'grey.500',
                    bgcolor: newProduct.canadianOriginType === null ? 'grey.500' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === null ? 'grey.600' : 'grey.100',
                      borderColor: 'grey.500'
                    }
                  }}
                >
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span role="img" aria-label="question mark">❓</span>
                    <span>Unknown</span>
                  </Box>
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setFlagPickerOpen(true)}
                  sx={{ borderColor: 'grey.500', color: 'grey.500' }}
                >
                  🌐 Select Country
                </Button>
              </Box>
             
            </Box>

            {/* COMPANY SELECT */}
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <FormControl fullWidth>
                <InputLabel>Company</InputLabel>
                <Select
                  value={newProduct.company_id || ""}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, company_id: e.target.value }))}
                  label="Company"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company._id} value={company._id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* ADD NEW COMPANY */}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => handleNewCompany("add")} variant="outlined">
                  Add New Company
                </Button>

                {/* VIEW COMPANY */}
                {/* {newProduct.company_id && (
                  <Button size="small" onClick={() => handleViewCompany(newProduct.company_id!)} variant="outlined">
                    View Company Details
                  </Button>
                )} */}
              </Box>
            </Box>

            {/* Commented out province and city fields
            <TextField
              label="Province"
              value={newProduct.origin.province}
              onChange={(e) => setNewProduct((prev) => ({ ...prev, origin: { ...prev.origin, province: e.target.value } }))}
            />
            <TextField
              label="City"
              value={newProduct.origin.city}
              onChange={(e) => setNewProduct((prev) => ({ ...prev, origin: { ...prev.origin, city: e.target.value } }))}
            />
            */}

            <Box sx={{ p: 0 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Existing form fields */}
                {/* Camera Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<CameraAltIcon />}
                    onClick={() => setShowCameraDialog(true)}
                  >
                    Take Product Picture
                  </Button>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon />}
                  >
                    Upload Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                  {newProduct.image && (
                    <img 
                      src={newProduct.image} 
                      alt="Product" 
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 0 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0, mb: 0 }}>
                {Object.entries(newProduct.product_tags || {}).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => {
                      setNewProduct((prev) => {
                        const newTags = { ...prev.product_tags };
                        delete newTags[key];
                        return { ...prev, product_tags: newTags };
                      });
                    }}
                    size="small"
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <TextField label="Tag Name" size="small" inputRef={attributeNameRef} />
                <TextField label="Value" size="small" fullWidth inputRef={attributeValueRef} />
                <Button
                  variant="outlined"
                  onClick={() => {
                    const name = attributeNameRef.current?.value;
                    const value = attributeValueRef.current?.value;
                    if (name && value) {
                      setNewProduct((prev) => ({
                        ...prev,
                        product_tags: {
                          ...prev.product_tags,
                          [name]: value
                        }
                      }));
                      if (attributeNameRef.current) attributeNameRef.current.value = "";
                      if (attributeValueRef.current) attributeValueRef.current.value = "";
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

      <Dialog open={priceDialogOpen} onClose={handleClosePriceDialog}>
        <DialogTitle>Add Price for {selectedProduct?.name}</DialogTitle>
        <DialogContent>
          {priceError && (
            <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
              {priceError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name (e.g. Gala - Organic)"
                placeholder="Enter a specific name or variation"
                value={newPrice.name}
                onChange={(e) => setNewPrice((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Price"
                value={newPrice.amount}
                onChange={(e) => setNewPrice((prev) => ({ ...prev, amount: parseFloat(e.target.value) }))}
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
                  onChange={(e) => setNewPrice((prev) => ({ ...prev, unit: e.target.value }))}
                >
                  {PRODUCT_UNITS.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}
                    </MenuItem>
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Store Location"
                placeholder="e.g. Downtown, West End, etc."
                value={newPrice.store_location}
                onChange={(e) => setNewPrice(prev => ({ ...prev, store_location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  label="Country"
                  defaultValue="Canada"
                  value={newPrice.location.country}
                  onChange={(e) =>
                    setNewPrice((prev) => ({
                      ...prev,
                      location: { ...prev.location, country: e.target.value }
                    }))
                  }
                />
                {/* <Box sx={{ display: 'flex', gap: 1 }}>
                  <img 
                    src="/flags/Canada.png" 
                    alt="Canada" 
                    style={{ width: '30px', cursor: 'pointer' }}
                    onClick={() => setNewPrice((prev) => ({ ...prev, location: { ...prev.location, country: 'Canada' } }))}
                  />
                  <img 
                    src="/flags/United States.png" 
                    alt="USA" 
                    style={{ width: '30px', cursor: 'pointer' }}
                    onClick={() => setNewPrice((prev) => ({ ...prev, location: { ...prev.location, country: 'USA' } }))}
                  />
                  <Box 
                    sx={{ 
                      width: '30px', 
                      height: '30px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '20px'
                    }}
                    onClick={() => setNewPrice((prev) => ({ ...prev, location: { ...prev.location, country: 'Other' } }))}
                  >
                    🌐
                  </Box>
                </Box> */}
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Province"
                value={newPrice.location.province}
                onChange={(e) =>
                  setNewPrice((prev) => ({
                    ...prev,
                    location: { ...prev.location, province: e.target.value }
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="City"
                value={newPrice.location.city}
                onChange={(e) =>
                  setNewPrice((prev) => ({
                    ...prev,
                    location: { ...prev.location, city: e.target.value }
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={newPrice.notes}
                onChange={(e) => setNewPrice((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sales Link"
                value={newPrice.sales_link}
                onChange={(e) => setNewPrice((prev) => ({ ...prev, sales_link: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {Object.entries(newPrice.price_tags || {}).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => {
                      setNewPrice((prev) => {
                        const newTags = { ...prev.price_tags };
                        delete newTags[key];
                        return { ...prev, price_tags: newTags };
                      });
                    }}
                    size="small"
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <TextField label="Tag Name" size="small" inputRef={attributeNameRef} />
                <TextField label="Value" size="small" fullWidth inputRef={attributeValueRef} />
                <Button
                  variant="outlined"
                  onClick={() => {
                    const name = attributeNameRef.current?.value;
                    const value = attributeValueRef.current?.value;
                    if (name && value) {
                      setNewPrice((prev) => ({
                        ...prev,
                        price_tags: {
                          ...prev.price_tags,
                          [name]: value
                        }
                      }));
                      if (attributeNameRef.current) attributeNameRef.current.value = "";
                      if (attributeValueRef.current) attributeValueRef.current.value = "";
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePriceDialog}>Cancel</Button>
          <Button onClick={handleSubmitPrice} variant="contained">
            Add Price
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editPriceDialogOpen} onClose={handleCloseEditPriceDialog}>
        <DialogTitle>Edit Price</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name (e.g. Gala - Organic)"
                placeholder="Enter a specific name or variation"
                value={editedPrice.name || ""}
                onChange={(e) => setEditedPrice((prev) => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Price"
                  value={editedPrice.amount || ""}
                  onChange={(e) => setEditedPrice((prev) => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={editedPrice.unit || "each"}
                    label="Unit"
                    onChange={(e) => setEditedPrice((prev) => ({ ...prev, unit: e.target.value as (typeof PRODUCT_UNITS)[number] }))}
                  >
                    {PRODUCT_UNITS.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
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
                value={editedPrice.store || ""}
                onChange={(e) => setEditedPrice((prev) => ({ ...prev, store: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Store Location"
                placeholder="e.g. Downtown, West End, etc."
                value={editedPrice.store_location || ""}
                onChange={(e) => setEditedPrice((prev) => ({ ...prev, store_location: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  label="Country"
                  value={editedPrice.location?.country || "Canada"}
                  onChange={(e) =>
                    setEditedPrice((prev) => ({
                      ...prev,
                      location: { ...(prev.location || {}), country: e.target.value }
                    }))
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <img 
                    src="/flags/Canada.png" 
                    alt="Canada" 
                    style={{ width: '30px', cursor: 'pointer' }}
                    onClick={() => setEditedPrice((prev) => ({ ...prev, location: { ...prev.location, country: 'Canada' } }))}
                  />
                  <img 
                    src="/flags/United States.png" 
                    alt="USA" 
                    style={{ width: '30px', cursor: 'pointer' }}
                    onClick={() => setEditedPrice((prev) => ({ ...prev, location: { ...prev.location, country: 'USA' } }))}
                  />
                  <Box 
                    sx={{ 
                      width: '30px', 
                      height: '30px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '20px'
                    }}
                    onClick={() => setEditedPrice((prev) => ({ ...prev, location: { ...prev.location, country: 'Other' } }))}
                  >
                    🌐
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Province"
                value={editedPrice.location?.province || ""}
                onChange={(e) =>
                  setEditedPrice((prev) => ({
                    ...prev,
                    location: { ...(prev.location || {}), province: e.target.value }
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="City"
                value={editedPrice.location?.city || ""}
                onChange={(e) =>
                  setEditedPrice((prev) => ({
                    ...prev,
                    location: { ...(prev.location || {}), city: e.target.value }
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sales Link"
                value={editedPrice.sales_link || ""}
                onChange={(e) => setEditedPrice((prev) => ({ ...prev, sales_link: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={editedPrice.notes || ""}
                onChange={(e) => setEditedPrice((prev) => ({ ...prev, notes: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Typography variant="subtitle1" sx={{ mr: 1, ml: 1 }}>
              Tags
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
              {Object.entries(editedPrice.price_tags || {}).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  onDelete={() => {
                    setEditedPrice((prev) => {
                      const newTags = { ...prev.price_tags };
                      delete newTags[key];
                      return { ...prev, price_tags: newTags };
                    });
                  }}
                  size="small"
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField label="Tag Name" size="small" inputRef={attributeNameRef} />
              <TextField label="Value" size="small" fullWidth inputRef={attributeValueRef} />
              <Button
                variant="outlined"
                onClick={() => {
                  const name = attributeNameRef.current?.value;
                  const value = attributeValueRef.current?.value;
                  if (name && value) {
                    setEditedPrice((prev) => ({
                      ...prev,
                      price_tags: {
                        ...(prev.price_tags || {}),
                        [name]: value
                      }
                    }));
                    if (attributeNameRef.current) attributeNameRef.current.value = "";
                    if (attributeValueRef.current) attributeValueRef.current.value = "";
                  }
                }}
              >
                Add
              </Button>
            </Box>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditPriceDialog}>Cancel</Button>
          <Button onClick={handleSaveEditedPrice} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showCompanyDialog} onClose={handleCompanyDialogClose}>
        <DialogTitle>Add New Company</DialogTitle>
        <DialogContent>
          <CompanyForm onSubmit={handleCompanySubmit} onCancel={handleCompanyDialogClose} isSubmitting={false} />
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <CameraDialog
        open={showCameraDialog}
        onClose={() => setShowCameraDialog(false)}
        onCapture={handleImageCapture}
      />

      <Dialog open={editCameraDialogOpen} onClose={() => setEditCameraDialogOpen(false)}>
        <DialogTitle>Take Product Picture</DialogTitle>
        <DialogContent>
          <CameraDialog
            open={editCameraDialogOpen}
            onClose={() => setEditCameraDialogOpen(false)}
            onCapture={handleEditImageCapture}
          />
        </DialogContent>
      </Dialog>

      {/* Flag Picker Dialog */}
      <Dialog 
        open={flagPickerOpen} 
        onClose={() => setFlagPickerOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>Select Country of Origin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1, p: 1 }}>
            {countries.map((country) => (
              <Box
                key={country}
                onClick={() => {
                  if (editingProduct) {
                    setEditingProduct({
                      ...editingProduct,
                      canadianOriginType: country
                    });
                  } else {
                    setNewProduct({
                      ...newProduct,
                      canadianOriginType: country
                    });
                  }
                  setFlagPickerOpen(false);
                }}
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderRadius: 1
                  }
                }}
              >
                <Box sx={{ height: '30px', width: '40px', mb: 0.5 }}>
                  <img
                    src={`/flags/${country}.png`}
                    alt={country}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </Box>
                <Typography 
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {country}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
