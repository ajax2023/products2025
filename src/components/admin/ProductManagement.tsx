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
  Tab,
  Tabs,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VerifiedIcon from '@mui/icons-material/Verified';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CanadianProduct, PRODUCT_CATEGORIES, ProductCategory } from '../../types/product';
import { searchCanadianProducts, updateCanadianProduct, deleteCanadianProduct, updateVerificationStatus } from '../../utils/canadianProducts';
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
  const [editedProduct, setEditedProduct] = useState<Partial<CanadianProduct>>({});
  const [tabValue, setTabValue] = useState(0);
  const [newCategory, setNewCategory] = useState<ProductCategory | ''>('');
  const [newProduct, setNewProduct] = useState('');
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

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

  const filteredProducts = useMemo(() => 
    products.filter(product => 
      tabValue === 0 ? product.production_verified : !product.production_verified
    ), [products, tabValue]);

  const paginatedProducts = useMemo(() => 
    filteredProducts.slice(page * pageSize, (page + 1) * pageSize),
    [filteredProducts, page, pageSize]
  );

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

  const handleDelete = async (product: CanadianProduct) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteCanadianProduct(product._id);
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedProduct || !user) return;

    try {
      await updateCanadianProduct(
        selectedProduct._id,
        {
          brand_name: editedProduct.brand_name,
          city: editedProduct.city,
          province: editedProduct.province,
          website: editedProduct.website,
          products: editedProduct.products || [],
          categories: editedProduct.categories || [],
          notes: editedProduct.notes,
        },
        user.uid,
        user.email || '',
        user.displayName || ''
      );

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === selectedProduct._id 
            ? { 
                ...p, 
                brand_name: editedProduct.brand_name || p.brand_name,
                city: editedProduct.city || p.city,
                province: editedProduct.province || p.province,
                website: editedProduct.website || p.website,
                products: editedProduct.products || p.products,
                categories: editedProduct.categories || p.categories,
                notes: editedProduct.notes,
              } 
            : p
        )
      );

      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
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

  const handleAddCategory = () => {
    if (!newCategory) return;
    if (!editedProduct.categories) {
      setEditedProduct(prev => ({
        ...prev,
        categories: [newCategory]
      }));
    } else if (!editedProduct.categories.includes(newCategory)) {
      setEditedProduct(prev => ({
        ...prev,
        categories: [...prev.categories!, newCategory]
      }));
    }
    setNewCategory('');
  };

  const handleRemoveCategory = (index: number) => {
    setEditedProduct(prev => ({
      ...prev,
      categories: prev.categories?.filter((_, i) => i !== index) || []
    }));
  };

  const handleCategoryEdit = (index: number, value: ProductCategory) => {
    if (!editedProduct.categories) return;
    const newCategories = [...editedProduct.categories];
    newCategories[index] = value;
    setEditedProduct(prev => ({
      ...prev,
      categories: newCategories
    }));
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
    <Box sx={{ 
      width: '77%', 
      height: 'calc(100vh - 114px)',
      position: 'fixed',
      top: 60,
      left: 0,
      right: 0,
      margin: 'auto'
    }}>
      <Box sx={{ mt: 1, px: 1 }}>
        <Typography variant="subtitle1" sx={{ color: 'primary.main', display: 'flex', justifyContent: 'space-between' }} >
          Product Management
          {renderUploadButton()}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ 
          mt: 2,
          height: 'calc(100% - 100px)',
          overflow: 'auto'
        }}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <TableRow>
                  <TableCell 
                    padding="none" 
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}
                  >Brand Name</TableCell>
                  <TableCell 
                    padding="none" 
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}
                  >Location</TableCell>
                  <TableCell 
                    padding="none" 
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}
                  >Products</TableCell>
                  <TableCell 
                    padding="none" 
                    sx={{ 
                      pl: 1, 
                      bgcolor: 'primary.main',
                      color: 'common.white', 
                      fontWeight: 'medium',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}
                  >Categories</TableCell>
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
                      pr: 1
                    }}
                  >Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody >
                {paginatedProducts.map((product, index) => (
                  <React.Fragment key={product._id}>
                    <TableRow 
                      sx={{ 
                        bgcolor: index % 1 === 0 ? 'gray.300' : 'common.white',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          cursor: 'pointer',
                          color: 'white'
                        },
                        '& > td': { py: 0.0 }
                      }}
                      onClick={() => {
                        setSelectedProduct(product);
                        setEditedProduct({ ...product });
                        setEditDialogOpen(true);
                      }}
                    >
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {product.brand_name}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {`${product.city}, ${product.province}`}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {product.products.join(', ')}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        {product.categories.join(', ')}
                      </TableCell>
                      <TableCell padding="none" sx={{ pl: 1 }}>
                        <Switch
                          checked={product.production_verified}
                          onChange={(e) => {
                            e.stopPropagation(); // Prevent row click when toggling switch
                            const updatedProduct = { ...product, production_verified: e.target.checked };
                            setProducts(products.map(p => p._id === product._id ? updatedProduct : p));
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
                      </TableCell>
                    </TableRow>
                    <TableRow 
                      sx={{ 
                        bgcolor: index % 1 === 0 ? 'grey.300' : 'common.white',
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
                      onClick={() => {
                        setSelectedProduct(product);
                        setEditedProduct({ ...product });
                        setEditDialogOpen(true);
                      }}
                    >
                      <TableCell colSpan={5} padding="none" sx={{ pl: 1, bgcolor: 'grey.300' }}>
                        <Typography variant="body2" color="black">
                          {product.notes || 'No notes'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {/* Add a small gap row */}
                    <TableRow>
                      <TableCell colSpan={5} sx={{ p: 0.5, border: 'none' }} />
                    </TableRow>
                  </React.Fragment>
                ))}
                {/* ------------------------------------------------------------------------------------------------------- */}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    colSpan={5}
                    count={products.length}
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
        </Box>
      )}

      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            '& .MuiDialogTitle-root': {
              p: 1.5,
            },
            '& .MuiDialogContent-root': {
              p: 1.5,
              '&:first-of-type': {
                pt: 1.5
              }
            },
            '& .MuiDialogActions-root': {
              p: 1,
            }
          }
        }}
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
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Categories</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Add Category</InputLabel>
                  <Select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                    label="Add Category"
                  >
                    <MenuItem value="">
                      <em>Select a category</em>
                    </MenuItem>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <MenuItem 
                        key={category} 
                        value={category}
                        disabled={editedProduct.categories?.includes(category)}
                      >
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddCategory}
                  disabled={!newCategory || editedProduct.categories?.includes(newCategory)}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(editedProduct.categories || []).map((category, index) => (
                  <Chip
                    key={index}
                    label={category}
                    onDelete={() => handleRemoveCategory(index)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
