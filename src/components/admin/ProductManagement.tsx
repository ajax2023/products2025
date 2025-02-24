import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  TablePagination,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Link,
  Tooltip,
  Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VerifiedIcon from '@mui/icons-material/Verified';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StoreIcon from '@mui/icons-material/Store';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import { CanadianProduct, PRODUCT_CATEGORIES, ProductCategory } from '../../types/product';
import { searchCanadianProducts, updateCanadianProduct, deleteCanadianProduct, updateVerificationStatus, addCanadianProduct } from '../../utils/canadianProducts';
import { useAuth } from '../../auth';
import CanadianProductUpload from './CanadianProductUpload'; // Import the CanadianProductUpload component

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
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SearchBar = React.memo(({ 
  searchQuery,
  productFilter,
  categoryFilter,
  locationFilter,
  loading,
  onSearchChange,
  onProductChange,
  onCategoryChange,
  onLocationChange
}: {
  searchQuery: string;
  productFilter: string;
  categoryFilter: string;
  locationFilter: string;
  loading: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProductChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
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
      <TextField
        size="small"
        sx={{ ml: 1, flex: 1 }}
        placeholder="Search brands..."
        value={searchQuery}
        onChange={onSearchChange}
        InputProps={{
          endAdornment: loading && (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          )
        }}
      />
    </Box>

    <Divider orientation="vertical" flexItem />

    {/* Product Search */}
    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
      <Inventory2Icon sx={{ color: 'action.active' }} />
      <TextField
        size="small"
        sx={{ ml: 1, flex: 1 }}
        placeholder="Filter by product..."
        value={productFilter}
        onChange={onProductChange}
      />
    </Box>

    <Divider orientation="vertical" flexItem />

    {/* Category Search */}
    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
      <CategoryIcon sx={{ color: 'action.active' }} />
      <TextField
        size="small"
        sx={{ ml: 1, flex: 1 }}
        placeholder="Filter by category..."
        value={categoryFilter}
        onChange={onCategoryChange}
      />
    </Box>

    <Divider orientation="vertical" flexItem />

    {/* Location Search */}
    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
      <LocationOnIcon sx={{ color: 'action.active' }} />
      <TextField
        size="small"
        sx={{ ml: 1, flex: 1 }}
        placeholder="Filter by location..."
        value={locationFilter}
        onChange={onLocationChange}
      />
    </Box>
  </Paper>
));

export default function ProductManagement() {
  const { user, claims } = useAuth();
  const [products, setProducts] = useState<CanadianProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CanadianProduct | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addNewProductOpen, setAddNewProductOpen] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Partial<CanadianProduct>>({});
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<keyof CanadianProduct>('brand_name');
  const [page, setPage] = useState(0);
  const [newCategory, setNewCategory] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(25);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<CanadianProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const loadProducts = useCallback(async () => {
    if (!user || !claims || (claims.role !== 'admin' && claims.role !== 'super_admin')) return;
    
    setLoading(true);
    try {
      const allProducts = await searchCanadianProducts({});
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [user, claims]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search query filter (brand name)
      const matchesSearch = !searchQuery || 
        product.brand_name.toLowerCase().includes(searchQuery.toLowerCase());

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

      // Location filter
      const matchesLocation = !locationFilter ||
        (product.city?.toLowerCase().includes(locationFilter.toLowerCase()) ||
         product.province?.toLowerCase().includes(locationFilter.toLowerCase()));

      return matchesSearch && matchesProduct && matchesCategory && matchesLocation;
    });
  }, [products, searchQuery, productFilter, categoryFilter, locationFilter]);

  const sortedProducts = useMemo(() => {
    const comparator = (a: CanadianProduct, b: CanadianProduct) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Handle arrays (like products, categories)
      if (Array.isArray(aValue)) aValue = aValue.join(', ');
      if (Array.isArray(bValue)) bValue = bValue.join(', ');

      // Handle location special case
      if (orderBy === 'city') {
        aValue = `${a.city}, ${a.province}`;
        bValue = `${b.city}, ${b.province}`;
      }

      if (bValue < aValue) return order === 'desc' ? -1 : 1;
      if (bValue > aValue) return order === 'desc' ? 1 : -1;
      return 0;
    };

    return [...filteredProducts].sort(comparator);
  }, [filteredProducts, order, orderBy]);

  const paginatedProducts = useMemo(() => {
    const startIndex = page * pageSize;
    return sortedProducts.slice(startIndex, startIndex + pageSize);
  }, [sortedProducts, page, pageSize]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEdit = (product: CanadianProduct) => {
    setSelectedProduct(product);
    setEditedProduct({
      brand_name: product.brand_name,
      website: product.website,
      city: product.city,
      province: product.province,
      country: product.country || 'Canada',
      products: product.products,
      categories: product.categories,
      cdn_prod_tags: product.cdn_prod_tags,
      notes: product.notes,
      isPubliclyVisible: product.isPubliclyVisible || false,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, product: CanadianProduct) => {
    e.stopPropagation(); // Prevent row click
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedProduct(null);
    setEditedProduct({});
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete || !user) return;

    try {
      await deleteCanadianProduct(productToDelete._id);
      setProducts(products.filter(p => p._id !== productToDelete._id));
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedProduct || !user) return;

    try {
      const updatedProduct = {
        ...editedProduct,
        country: editedProduct.country || 'Canada'
      };

      await updateCanadianProduct(
        selectedProduct._id,
        updatedProduct,
        user.uid,
        user.email || '',
        user.displayName || ''
      );

      setProducts(products.map(p => 
        p._id === selectedProduct._id ? { ...p, ...updatedProduct } : p
      ));
      
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleVerificationToggle = async (product: CanadianProduct) => {
    if (!user) return;

    setUpdatingProducts(prev => new Set(prev).add(product._id));

    try {
      const updates = {
        isPubliclyVisible: product.isPubliclyVisible,
        brand_name: product.brand_name,
        website: product.website,
        city: product.city,
        province: product.province,
        country: product.country,
        categories: product.categories,
        products: product.products,
        production_verified: product.production_verified,
        cdn_prod_tags: product.cdn_prod_tags || []
      };

      await updateCanadianProduct(
        product._id,
        updates,
        user?.uid || '',
        user?.email || '',
        user?.displayName || ''
      );

      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === product._id ? {
            ...p,
            ...updates,
            modified_by: user?.uid || '',
            modified_by_email: user?.email || '',
            modified_by_name: user?.displayName || '',
            date_modified: new Date().toISOString()
          } : p
        )
      );
    } catch (error) {
      console.error('Error updating verification status:', error);
      setProducts(prev => prev.map(p => p._id === product._id ? product : p));
    } finally {
      setUpdatingProducts(prev => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }
  };

  const handleCategoryEdit = (index: number, newValue: string) => {
    setEditedProduct(prev => ({
      ...prev,
      categories: prev.categories?.map((cat, i) => i === index ? newValue as ProductCategory : cat) || []
    }));
  };

  const handleRemoveCategory = (index: number) => {
    setEditedProduct(prev => ({
      ...prev,
      categories: prev.categories?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setEditedProduct(prev => ({
        ...prev,
        categories: [...(prev.categories || []), newCategory.trim() as ProductCategory]
      }));
      setNewCategory('');
    }
  };

  const handleProductEdit = (index: number, value: string) => {
    if (!editedProduct.products) return;
    const newProducts = [...editedProduct.products];
    newProducts[index] = value;
    setEditedProduct(prev => ({
      ...prev,
      products: newProducts
    }));
  };

  const handleAddProduct = () => {
    if (!newProduct.trim()) return;
    setEditedProduct(prev => ({
      ...prev,
      products: [...(prev.products || []), newProduct.trim()]
    }));
    setNewProduct('');
  };

  const handleRemoveProduct = (index: number) => {
    setEditedProduct(prev => ({
      ...prev,
      products: prev.products?.filter((_, i) => i !== index) || []
    }));
  };

  const handleRequestSort = (property: keyof CanadianProduct) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleOpenNewProduct = () => {
    setEditedProduct({
      brand_name: '',
      city: '',
      province: '',
      country: 'Canada',
      website: '',
      products: [''],
      categories: ['Medical Supplies'],
      notes: '',
      production_verified: false,
      cdn_prod_tags: [],
      is_active: true,
      version: 1
    });
    setAddNewProductOpen(true);
  };

  const handleAddNewProduct = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const newProductData = {
        ...editedProduct,
        products: (editedProduct.products || []).filter(p => p.trim()),
        categories: (editedProduct.categories || []).filter(c => c.trim())
      };

      if (!newProductData.products?.length) {
        throw new Error('At least one product is required');
      }

      if (!newProductData.categories?.length) {
        throw new Error('At least one category is required');
      }

      const newProduct: CanadianProduct = {
        _id: '', // Will be set by the backend
        brand_name: newProductData.brand_name || '',
        website: newProductData.website || '',
        city: newProductData.city || '',
        province: newProductData.province || '',
        country: newProductData.country || 'Canada',
        production_verified: newProductData.production_verified || false,
        site_verified: false,
        products: newProductData.products || [],
        categories: newProductData.categories || [],
        cdn_prod_tags: [],
        added_by: user?.uid || '',
        added_by_email: user?.email || '',
        added_by_name: user?.displayName || '',
        modified_by: user?.uid || '',
        modified_by_email: user?.email || '',
        modified_by_name: user?.displayName || '',
        date_added: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        is_active: newProductData.is_active ?? true,
        version: newProductData.version || 1,
        isPubliclyVisible: true
      };

      const docRef = await addCanadianProduct(
        newProduct,
        user.uid,
        user.email || '',
        user.displayName || ''
      );

      setProducts([...products, { ...newProduct, _id: docRef }]);
      setAddNewProductOpen(false);
      setEditedProduct({});
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Implement CSV export logic here
  };

  const handleCopyDetails = () => {
    if (!selectedProduct) return;

    const details = `Brand Name: ${selectedProduct.brand_name}
City: ${selectedProduct.city}
Province: ${selectedProduct.province}
Website: ${selectedProduct.website || 'N/A'}
Products: ${selectedProduct.products?.join(', ') || 'None'}
Categories: ${selectedProduct.categories?.join(', ') || 'None'}
Notes: ${selectedProduct.notes || 'N/A'}
Production Verified: ${selectedProduct.production_verified ? 'Yes' : 'No'}
Site Verified: ${selectedProduct.site_verified ? 'Yes' : 'No'}
${selectedProduct.site_verified ? `Site Verified By: ${selectedProduct.site_verified_by}
Site Verified Date: ${new Date(selectedProduct.site_verified_at || '').toLocaleDateString()}` : ''}`;

    navigator.clipboard.writeText(details).then(() => {
      // Show success message
      // alert('Product details copied to clipboard!');
    });
  };

  const renderUploadButton = () => {
    if (!user || !claims || (claims.role !== 'admin' && claims.role !== 'super_admin')) return null;
    
    return (
      <Box sx={{ mb: 2 }}>
        <CanadianProductUpload 
          userId={user.uid}
          userEmail={user.email || ''}
          userName={user.displayName || user.email || 'Unknown User'}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', mt: 2 }}>
      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5"  color="primary">Product Management</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.href = '/admin/canadian-product-upload'}
            startIcon={<CloudUploadIcon />}
          >
            Import
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportCSV}
            startIcon={<FileDownloadIcon />}
          >
            Export
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenNewProduct}
            startIcon={<AddIcon />}
          >
            Product
          </Button>
        </Stack>
      </Box>

      <SearchBar
        searchQuery={searchQuery}
        productFilter={productFilter}
        categoryFilter={categoryFilter}
        locationFilter={locationFilter}
        loading={loading}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        onProductChange={(e) => setProductFilter(e.target.value)}
        onCategoryChange={(e) => setCategoryFilter(e.target.value)}
        onLocationChange={(e) => setLocationFilter(e.target.value)}
      />

      <Box sx={{ width: '100%', mt: 2 }}>
        <Paper sx={{ width: '100%', mb: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('brand_name')}
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    Brand Name {orderBy === 'brand_name' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell>
                  <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('website')}
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    Website {orderBy === 'website' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell>
                  <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('city')}
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    Location {orderBy === 'city' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell>
                  <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('products')}
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    Products {orderBy === 'products' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell>
                  <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('categories')}
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    Categories {orderBy === 'categories' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell>
                  <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('production_verified')}
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    Status {orderBy === 'production_verified' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell>
                  <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('isPubliclyVisible')}
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    Public {orderBy === 'isPubliclyVisible' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell>
                  <TableCell 
                    padding="none" 
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <React.Fragment key={product._id}>
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        '& td': {
                          borderBottom: 'none',
                        }
                      }}
                      onClick={(e) => {
                        // Only open edit dialog if not clicking a switch or button
                        if (!(e.target as HTMLElement).closest('.MuiSwitch-root') && 
                            !(e.target as HTMLElement).closest('.MuiIconButton-root')) {
                          handleEdit(product);
                        }
                      }}
                    >
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {product.brand_name}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                          {product.site_verified ? (
                            <Tooltip title={`Verified by ${product.site_verified_by} on ${new Date(product.site_verified_at || '').toLocaleDateString()}`}>
                              <CheckCircleIcon color="success" />
                            </Tooltip>
                          ) : null}
                          {product.website ? (
                            <>
                              <Link 
                                href={product.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                sx={{ 
                                  textDecoration: 'none',
                                  color: 'inherit',
                                  '&:hover': { color: 'primary.main' }
                                }}
                              >
                                {product.website}
                              </Link>
                              <IconButton
                                size="small"
                                onClick={() => window.open(product.website, '_blank')}
                                sx={{ 
                                  p: 0.5,
                                  '&:hover': { color: 'primary.main' }
                                }}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            'No website'
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {`${product.city}, ${product.province}`}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {product.products?.join(', ')}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {product.categories?.join(', ')}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={product.production_verified || false}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const newStatus = e.target.checked;
                              setUpdatingProducts(prev => new Set([...prev, product._id]));
                              try {
                                await updateVerificationStatus(
                                  product._id,
                                  newStatus,
                                  user?.uid || '',
                                  user?.email || '',
                                  user?.displayName || '',
                                  '' // Empty notes
                                );
                                
                                setProducts(prevProducts => 
                                  prevProducts.map(p => 
                                    p._id === product._id ? {
                                      ...p,
                                      production_verified: newStatus,
                                      modified_by: user?.uid || '',
                                      modified_by_email: user?.email || '',
                                      modified_by_name: user?.displayName || '',
                                      date_modified: new Date().toISOString()
                                    } : p
                                  )
                                );
                              } catch (error) {
                                console.error('Error updating verification status:', error);
                                setProducts(prev => prev.map(p => p._id === product._id ? product : p));
                              } finally {
                                setUpdatingProducts(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(product._id);
                                  return newSet;
                                });
                              }
                            }}
                            disabled={updatingProducts.has(product._id)}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        <Switch
                          checked={product.isPubliclyVisible || false}
                          onChange={async (e) => {
                            e.stopPropagation();
                            const newStatus = e.target.checked;
                            setUpdatingProducts(prev => new Set([...prev, product._id]));
                            try {
                              const updatedProduct = {
                                ...product,
                                isPubliclyVisible: newStatus,
                                modified_by: user?.uid || '',
                                modified_by_email: user?.email || '',
                                modified_by_name: user?.displayName || '',
                                date_modified: new Date().toISOString()
                              };

                              await updateCanadianProduct(
                                product._id,
                                updatedProduct,
                                user?.uid || '',
                                user?.email || '',
                                user?.displayName || ''
                              );
                              
                              setProducts(prevProducts => 
                                prevProducts.map(p => 
                                  p._id === product._id ? updatedProduct : p
                                )
                              );
                            } catch (error) {
                              console.error('Error updating public visibility:', error);
                              setProducts(prev => prev.map(p => p._id === product._id ? product : p));
                            } finally {
                              setUpdatingProducts(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(product._id);
                                return newSet;
                              });
                            }
                          }}
                          disabled={updatingProducts.has(product._id)}
                        />
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(product)}
                            sx={{ 
                              p: 0.5,
                              '&:hover': { color: 'primary.main' }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(product);
                              setDeleteDialogOpen(true);
                            }}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    <TableRow 
                      sx={{ 
                        bgcolor: 'grey.300',
                        color: 'red',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          cursor: 'pointer',
                          color: 'white'
                        },
                        '& > td': { 
                          borderBottom: '2px solid black',
                          borderColor: 'divider',
                          py: 0,
                          mb: 0
                        },
                        mb: 2
                      }}
                      onClick={() => handleEdit(product)}
                    >
                      <TableCell colSpan={8} padding="none" sx={{ pl: 1, bgcolor: 'grey.300' }}>
                        <Typography variant="body2" color="black">
                          {product.notes || 'No notes'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {/* Add a small gap row */}
                    <TableRow>
                      <TableCell colSpan={9} sx={{ border: 'none', bgcolor: 'primary.main', maxheight: '0.5px', minheight: '0.5px'}} />
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    colSpan={9}
                    count={filteredProducts.length}
                    rowsPerPage={pageSize}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                      bgcolor: 'primary.main',
                      borderTop: '2px solid blue',
                      borderColor: 'divider',
                      color: 'white'
                    }}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Brand Name"
                value={editedProduct.brand_name || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, brand_name: e.target.value })}
                fullWidth
                required
                sx={{ mt: 2 }}
              />
              <TextField
                label="Website"
                value={editedProduct.website || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, website: e.target.value })}
                fullWidth
                required
                sx={{ mt: 2 }}
                InputProps={{
                  endAdornment: editedProduct.website && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => window.open(editedProduct.website, '_blank')}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                value={editedProduct.city || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, city: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Province"
                value={editedProduct.province || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, province: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Country"
                value={editedProduct.country || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, country: e.target.value })}
                fullWidth
                required
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={editedProduct.isPubliclyVisible || false}
                  onChange={(e) => setEditedProduct({ ...editedProduct, isPubliclyVisible: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography>Publicly Visible</Typography>
                  <Typography variant="caption" color="text.secondary">
                    When enabled, this product will be visible to non-logged-in users
                  </Typography>
                </Box>
              }
            />
            <TextField
              label="Notes"
              value={editedProduct.notes || ''}
              onChange={(e) => setEditedProduct({ ...editedProduct, notes: e.target.value })}
              multiline
              rows={4}
              sx={{ p: 0.0 }}
              fullWidth
              size="small"
              margin="none"
              placeholder="Add any notes about this product..."
            />

            <Box sx={{ mt: 0.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.0 }}>Products</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>Product Name - Note you must add the product after entering the text. Format - product 1, product 2, etc </TableCell>
                      <TableCell align="right" width={100} sx={{ py: 0.0 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(editedProduct.products || []).map((product, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ py: 0.0 }}>
                          <TextField
                            value={product}
                            onChange={(e) => handleProductEdit(index, e.target.value)}
                            variant="standard"
                            fullWidth
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.0 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveProduct(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>
                        <TextField
                          value={newProduct}
                          onChange={(e) => setNewProduct(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddProduct();
                            }
                          }}
                          placeholder="Add new product"
                          variant="standard"
                          fullWidth
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.0 }}>
                        <IconButton
                          size="small"
                          onClick={handleAddProduct}
                          color="primary"
                          disabled={!newProduct.trim()}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ mt: 0.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.0 }}>Categories</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>Category Name- Note you must add the category after entering the text. Format - category 1, category 2, etc</TableCell>
                      <TableCell align="right" width={100} sx={{ py: 0.0 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(editedProduct.categories || []).map((category, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ py: 0.0 }}>
                          <TextField
                            value={category}
                            onChange={(e) => handleCategoryEdit(index, e.target.value)}
                            variant="standard"
                            fullWidth
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.0 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveCategory(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>
                        <TextField
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                          placeholder="Add new category"
                          variant="standard"
                          fullWidth
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.0 }}>
                        <IconButton
                          size="small"
                          onClick={handleAddCategory}
                          color="primary"
                          disabled={!newCategory.trim()}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Site Verification</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={editedProduct.site_verified || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditedProduct(prev => ({
                          ...prev,
                          site_verified: true,
                          site_verified_by: user?.email || '',
                          site_verified_at: new Date().toISOString()
                        }));
                      } else {
                        setEditedProduct(prev => ({
                          ...prev,
                          site_verified: false,
                          site_verified_by: undefined,
                          site_verified_at: undefined
                        }));
                      }
                    }}
                  />
                }
                label="Site Verified"
              />
              {editedProduct.site_verified && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Verified by {editedProduct.site_verified_by} on {new Date(editedProduct.site_verified_at || '').toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleCopyDetails}
            startIcon={<ContentCopyIcon />}
            sx={{ mr: 'auto' }}
          >
            Copy Details
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={addNewProductOpen} 
        onClose={() => {
          setAddNewProductOpen(false);
          setEditedProduct({});
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Brand Name"
                value={editedProduct.brand_name || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, brand_name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Website"
                value={editedProduct.website || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, website: e.target.value })}
                fullWidth
                required
                InputProps={{
                  endAdornment: editedProduct.website && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => window.open(editedProduct.website, '_blank')}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                value={editedProduct.city || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, city: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Province"
                value={editedProduct.province || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, province: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Country"
                value={editedProduct.country || ''}
                onChange={(e) => setEditedProduct({ ...editedProduct, country: e.target.value })}
                fullWidth
                required
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={editedProduct.isPubliclyVisible || false}
                  onChange={(e) => setEditedProduct({ ...editedProduct, isPubliclyVisible: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography>Publicly Visible</Typography>
                  <Typography variant="caption" color="text.secondary">
                    When enabled, this product will be visible to non-logged-in users
                  </Typography>
                </Box>
              }
            />
            <TextField
              label="Notes"
              value={editedProduct.notes || ''}
              onChange={(e) => setEditedProduct({ ...editedProduct, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
              size="small"
              margin="none"
              placeholder="Add any notes about this product..."
            />

            <Box sx={{ mt: 0.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.0 }}>Products</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>Product Name</TableCell>
                      <TableCell align="right" width={100} sx={{ py: 0.0 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(editedProduct.products || []).map((product, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ py: 0.0 }}>
                          <TextField
                            value={product}
                            onChange={(e) => handleProductEdit(index, e.target.value)}
                            variant="standard"
                            fullWidth
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.0 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveProduct(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>
                        <TextField
                          value={newProduct}
                          onChange={(e) => setNewProduct(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddProduct();
                            }
                          }}
                          placeholder="Add new product"
                          variant="standard"
                          fullWidth
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.0 }}>
                        <IconButton
                          size="small"
                          onClick={handleAddProduct}
                          color="primary"
                          disabled={!newProduct.trim()}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ mt: 0.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.0 }}>Categories</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>Category Name</TableCell>
                      <TableCell align="right" width={100} sx={{ py: 0.0 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(editedProduct.categories || []).map((category, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ py: 0.0 }}>
                          <TextField
                            value={category}
                            onChange={(e) => handleCategoryEdit(index, e.target.value)}
                            variant="standard"
                            fullWidth
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.0 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveCategory(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ py: 0.0 }}>
                        <TextField
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                          placeholder="Add new category"
                          variant="standard"
                          fullWidth
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.0 }}>
                        <IconButton
                          size="small"
                          onClick={handleAddCategory}
                          color="primary"
                          disabled={!newCategory.trim()}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Site Verification</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={editedProduct.site_verified || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditedProduct(prev => ({
                          ...prev,
                          site_verified: true,
                          site_verified_by: user?.email || '',
                          site_verified_at: new Date().toISOString()
                        }));
                      } else {
                        setEditedProduct(prev => ({
                          ...prev,
                          site_verified: false,
                          site_verified_by: undefined,
                          site_verified_at: undefined
                        }));
                      }
                    }}
                  />
                }
                label="Site Verified"
              />
              {editedProduct.site_verified && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Verified by {editedProduct.site_verified_by} on {new Date(editedProduct.site_verified_at || '').toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddNewProductOpen(false);
            setEditedProduct({});
          }}>Cancel</Button>
          <Button onClick={handleAddNewProduct} variant="contained" color="primary">Add Product</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the product "{productToDelete?.brand_name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
