import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import { CanadianProduct } from '../../types/product';
import { searchCanadianProducts, updateCanadianProduct, deleteCanadianProduct, updateVerificationStatus } from '../../utils/canadianProducts';
import { useAuth } from '../../auth';

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
        <Box sx={{ p: 1 }}>
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
  const [newCategory, setNewCategory] = useState('');
  const [newProduct, setNewProduct] = useState('');

  const loadProducts = async () => {
    if (!user || !claims || claims.role !== 'admin') return;
    
    setLoading(true);
    try {
      const allProducts = await searchCanadianProducts({});
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

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
        editedProduct,
        user.uid,
        user.email || '',
        user.displayName || ''
      );
      setEditDialogOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleVerificationToggle = async (product: CanadianProduct) => {
    if (!user) return;

    try {
      await updateVerificationStatus(
        product._id,
        !product.production_verified,
        user.uid,
        user.email || '',
        user.displayName || ''
      );
      loadProducts();
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    setEditedProduct(prev => ({
      ...prev,
      categories: [...(prev.categories || []), newCategory.trim()]
    }));
    setNewCategory('');
  };

  const handleRemoveCategory = (index: number) => {
    setEditedProduct(prev => ({
      ...prev,
      categories: prev.categories?.filter((_, i) => i !== index)
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
      products: prev.products?.filter((_, i) => i !== index)
    }));
  };

  const filteredProducts = products.filter(product => 
    tabValue === 0 ? !product.production_verified : product.production_verified
  );

  return (
    <Box sx={{ width: '100%', typography: 'body1', p: 0 }}>
      {/* Stats Section */}
      <Paper sx={{ p: 0, mb: 0.5, display: 'flex' }}>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
            Brands-M
          </Typography>
          <Typography variant="body2">
            {products.length}
          </Typography>
        </Box>

        {/* COUNT OF PRODUCTS - COMMA SEPARATED */}
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
            Products-M
          </Typography>
          <Typography variant="body2">
            {products.reduce((sum, p) => {
              const productCount = p.products
                .map(prod => prod.split(',').map(p => p.trim()))
                .flat()
                .filter(p => p.length > 0)
                .length;
              return sum + productCount;
            }, 0)}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
            Verified-M
          </Typography>
          <Typography variant="body2">
            {products.filter(p => p.production_verified).length}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
            Pending-M
          </Typography>
          <Typography variant="body2">
            {products.filter(p => !p.production_verified).length}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
          Product Management
        </Typography>

        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)} 
          sx={{ minHeight: 32 }}
          TabIndicatorProps={{ sx: { height: 2 } }}
        >
          <Tab label="Pending" sx={{ minHeight: 32, py: 0 }} />
          <Tab label="Verified" sx={{ minHeight: 32, py: 0 }} />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TabPanel value={tabValue} index={tabValue}>
          <TableContainer component={Paper}>
            <Table>
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
                {filteredProducts.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>{product.brand_name}</TableCell>
                    <TableCell>{`${product.city}, ${product.province}`}</TableCell>
                    <TableCell>
                      {product.products.slice(0, 2).map((p, i) => (
                        <Chip key={i} label={p} size="small" sx={{ m: 0.5 }} />
                      ))}
                      {product.products.length > 2 && (
                        <Chip label={`+${product.products.length - 2}`} size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {product.categories.slice(0, 2).map((c, i) => (
                        <Chip key={i} label={c} size="small" color="primary" sx={{ m: 0.5 }} />
                      ))}
                      {product.categories.length > 2 && (
                        <Chip label={`+${product.categories.length - 2}`} size="small" color="primary" />
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={product.production_verified}
                            onChange={() => handleVerificationToggle(product)}
                            color="success"
                          />
                        }
                        label={product.production_verified ? "Verified" : "Pending"}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEdit(product)} color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(product)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <TextField
              label="Brand Name"
              value={editedProduct.brand_name || ''}
              onChange={(e) => setEditedProduct({ ...editedProduct, brand_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="City"
              value={editedProduct.city || ''}
              onChange={(e) => setEditedProduct({ ...editedProduct, city: e.target.value })}
              fullWidth
            />
            <TextField
              label="Province"
              value={editedProduct.province || ''}
              onChange={(e) => setEditedProduct({ ...editedProduct, province: e.target.value })}
              fullWidth
            />
            <TextField
              label="Website"
              value={editedProduct.website || ''}
              onChange={(e) => setEditedProduct({ ...editedProduct, website: e.target.value })}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Products
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {editedProduct.products?.map((product, index) => (
                  <Chip
                    key={index}
                    label={product}
                    onDelete={() => handleRemoveProduct(index)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Add Product"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  size="small"
                />
                <Button variant="outlined" onClick={handleAddProduct}>
                  Add
                </Button>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Categories
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {editedProduct.categories?.map((category, index) => (
                  <Chip
                    key={index}
                    label={category}
                    onDelete={() => handleRemoveCategory(index)}
                    color="primary"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Add Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  size="small"
                />
                <Button variant="outlined" onClick={handleAddCategory}>
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
