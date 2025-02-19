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
  Tooltip
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
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase().trim();
    return products.filter(product => {
      return (
        product.brand_name?.toLowerCase().includes(query) ||
        product.city?.toLowerCase().includes(query) ||
        product.province?.toLowerCase().includes(query) ||
        product.website?.toLowerCase().includes(query) ||
        product.notes?.toLowerCase().includes(query) ||
        product.products?.some(p => p.toLowerCase().includes(query)) ||
        product.categories?.some(c => c.toLowerCase().includes(query))
      );
    });
  }, [products, searchQuery]);

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
    setEditedProduct({ ...product });
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
      await deleteCanadianProduct(
        productToDelete._id,
        user.uid,
        user.email || '',
        user.displayName || ''
      );
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
      const updatedProduct = { ...product, production_verified: !product.production_verified };
      setProducts(prev => prev.map(p => p._id === product._id ? updatedProduct : p));

      await updateVerificationStatus(
        product._id,
        !product.production_verified,
        user.uid,
        user.email || '',
        user.displayName || ''
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
      categories: prev.categories?.map((cat, i) => i === index ? newValue : cat) || []
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
        categories: [...(prev.categories || []), newCategory.trim()]
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

      const docRef = await addCanadianProduct(
        newProductData,
        user.uid,
        user.email || '',
        user.displayName || ''
      );

      const newProduct: CanadianProduct = {
        _id: docRef,
        ...newProductData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.uid,
        updated_by: user.uid,
        added_by: user.uid,
        added_by_email: user.email || '',
        added_by_name: user.displayName || '',
        modified_by: user.uid,
        modified_by_email: user.email || '',
        modified_by_name: user.displayName || '',
        date_added: new Date().toISOString(),
        date_modified: new Date().toISOString()
      };

      setProducts([...products, newProduct]);
      setAddNewProductOpen(false);
      setEditedProduct({});
    } catch (error) {
      console.error('Error adding product:', error);
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
            Import Products
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportCSV}
            startIcon={<FileDownloadIcon />}
          >
            Export to CSV
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenNewProduct}
            startIcon={<AddIcon />}
          >
            New Product
          </Button>
        </Stack>
        <TextField
          size="small"
          placeholder="Search all fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { bgcolor: 'background.paper' }
          }}
          sx={{ width: 300 }}
        />
      </Box>

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
                  {/* <TableCell 
                    padding="none" 
                    onClick={() => handleRequestSort('site_verified')}
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
                    Site Verified {orderBy === 'site_verified' && (order === 'desc' ? '▼' : '▲')}
                  </TableCell> */}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <React.Fragment key={product._id}>
                    <TableRow 
                      sx={{ 
                        bgcolor: 'common.white',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          cursor: 'pointer',
                          color: 'white'
                        },
                        '& > td': { py: 0.0 }
                      }}
                      onClick={() => handleEdit(product)}
                    >
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {product.brand_name}
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
                        <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={product.production_verified}
                            onChange={(e) => {
                              const updatedProduct = { ...product, production_verified: e.target.checked };
                              setProducts(prev => prev.map(p => p._id === product._id ? updatedProduct : p));

                              updateCanadianProduct(
                                product._id,
                                { production_verified: e.target.checked },
                                user?.uid || '',
                                user?.email || '',
                                user?.displayName || ''
                              );
                            }}
                            size="small"
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => handleDeleteClick(e, product)}
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { 
                                bgcolor: 'error.light',
                                color: 'error.contrastText'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
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
                      <TableCell colSpan={6} padding="none" sx={{ pl: 1, bgcolor: 'grey.300' }}>
                        <Typography variant="body2" color="black">
                          {product.notes || 'No notes'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {/* Add a small gap row */}
                    <TableRow>
                      <TableCell colSpan={6} sx={{ border: 'none', bgcolor: '#primary.main', maxheight: '1px', minheight: '1px' }} />
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    colSpan={7}
                    count={filteredProducts.length}
                    rowsPerPage={pageSize}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                      bgcolor: 'primary.main',
                      borderTop: '1px solid blue',
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <TextField
              label="Brand Name"
              value={editedProduct.brand_name || ''}
              onChange={(e) => setEditedProduct(prev => ({ ...prev, brand_name: e.target.value }))}
              fullWidth
              size="small"
              margin="none"
              sx={{ '& .MuiOutlinedInput-root': { py: 0.0 } }}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <TextField
                label="City"
                value={editedProduct.city || ''}
                onChange={(e) => setEditedProduct(prev => ({ ...prev, city: e.target.value }))}
                fullWidth
                size="small"
                margin="none"
                sx={{ '& .MuiOutlinedInput-root': { py: 0.0 } }}
              />
              <TextField
                label="Province"
                value={editedProduct.province || ''}
                onChange={(e) => setEditedProduct(prev => ({ ...prev, province: e.target.value }))}
                fullWidth
                size="small"
                margin="none"
                sx={{ '& .MuiOutlinedInput-root': { py: 0.0 } }}
              />
              <TextField
                label="Country"
                value={editedProduct.country || 'Canada'}
                onChange={(e) => setEditedProduct(prev => ({ ...prev, country: e.target.value }))}
                fullWidth
                size="small"
                margin="none"
                sx={{ '& .MuiOutlinedInput-root': { py: 0.0 } }}
              />
            </Box>
            <TextField
              label="Website"
              value={editedProduct.website || ''}
              onChange={(e) => setEditedProduct(prev => ({ ...prev, website: e.target.value }))}
              fullWidth
              size="small"
              margin="none"
              sx={{ '& .MuiOutlinedInput-root': { py: 0.0 } }}
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
            
            <TextField
              label="Notes"
              value={editedProduct.notes || ''}
              onChange={(e) => setEditedProduct(prev => ({ ...prev, notes: e.target.value }))}
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
          </Box>
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
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Brand Name"
              value={editedProduct.brand_name || ''}
              onChange={(e) => setEditedProduct(prev => ({ ...prev, brand_name: e.target.value }))}
              fullWidth
              size="small"
              margin="none"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="City"
                value={editedProduct.city || ''}
                onChange={(e) => setEditedProduct(prev => ({ ...prev, city: e.target.value }))}
                fullWidth
                size="small"
                margin="none"
              />
              <TextField
                label="Province"
                value={editedProduct.province || ''}
                onChange={(e) => setEditedProduct(prev => ({ ...prev, province: e.target.value }))}
                fullWidth
                size="small"
                margin="none"
              />
              <TextField
                label="Country"
                value={editedProduct.country || 'Canada'}
                onChange={(e) => setEditedProduct(prev => ({ ...prev, country: e.target.value }))}
                fullWidth
                size="small"
                margin="none"
              />
            </Box>

            <TextField
              label="Website"
              value={editedProduct.website || ''}
              onChange={(e) => setEditedProduct(prev => ({ ...prev, website: e.target.value }))}
              fullWidth
              size="small"
              margin="none"
              sx={{ mb: 2 }}
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
            
            <TextField
              label="Notes"
              value={editedProduct.notes || ''}
              onChange={(e) => setEditedProduct(prev => ({ ...prev, notes: e.target.value }))}
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
          </Box>
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
