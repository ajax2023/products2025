import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import { CanadianProduct, MASTER_CATEGORIES, MasterCategory } from '../../types/product';
import { searchCanadianProducts, updateCanadianProduct } from '../../utils/canadianProducts';
import { useAuth } from '../../auth';

const MasterCategoryEditor: React.FC = () => {
  const { user, claims } = useAuth();
  const [products, setProducts] = useState<CanadianProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const loadProducts = useCallback(async () => {
    if (!user || !claims || (claims.role !== 'admin' && claims.role !== 'super_admin')) return;
    
    setLoading(true);
    try {
      const results = await searchCanadianProducts('');
      setProducts(results);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [user, claims]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleMasterCategoryChange = async (product: CanadianProduct, newValue: MasterCategory | '') => {
    if (!user) return;

    // Add product ID to saving set
    setSaving(prev => new Set(prev).add(product._id));

    try {
      const updatedProduct = {
        ...product,
        masterCategory: newValue || undefined
      };

      await updateCanadianProduct(
        product._id,
        { masterCategory: newValue || null },
        user.uid,
        user.email || '',
        user.displayName || ''
      );

      // Update local state
      setProducts(prev => 
        prev.map(p => p._id === product._id ? updatedProduct : p)
      );
    } catch (error) {
      console.error('Error updating master category:', error);
    } finally {
      // Remove product ID from saving set
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Master Category Editor
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Info</TableCell>
                <TableCell width="60%">Master Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <Typography variant="subtitle1">{product.brand_name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {`Categories: ${product.categories.join(', ')}`}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {`Products: ${product.products.join(', ')}`}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {`Location: ${product.city}, ${product.province}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {saving.has(product._id) ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <CircularProgress size={20} />
                      </Box>
                    ) : (
                      <>
                        {product.masterCategory && (
                          <Box mb={2}>
                            <Chip 
                              label={`Current: ${product.masterCategory}`} 
                              color="primary" 
                              onDelete={() => handleMasterCategoryChange(product, '')}
                            />
                          </Box>
                        )}
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {MASTER_CATEGORIES.map((category) => (
                            <Button
                              key={category}
                              variant="outlined"
                              size="small"
                              disabled={saving.has(product._id) || product.masterCategory === category}
                              onClick={() => handleMasterCategoryChange(product, category)}
                              sx={{ mb: 1, mr: 1 }}
                            >
                              {category}
                            </Button>
                          ))}
                        </Stack>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MasterCategoryEditor;
