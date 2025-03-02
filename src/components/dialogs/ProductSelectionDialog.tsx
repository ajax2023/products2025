import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox
} from '@mui/material';

export interface ProductSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  brandName: string;
  products: string[];
  onProductsSelected: (selectedProducts: string[]) => void;
}

export const ProductSelectionDialog: React.FC<ProductSelectionDialogProps> = ({
  open,
  onClose,
  brandName,
  products,
  onProductsSelected
}) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Reset selected products when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedProducts([]);
    }
  }, [open]);

  // Split comma-separated products into array
  const productList = useMemo(() => {
    return products.flatMap(p => p.split(',').map(item => item.trim())).filter(Boolean);
  }, [products]);

  const handleProductSelect = (product: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, product]);
    } else {
      setSelectedProducts(selectedProducts.filter(p => p !== product));
    }
  };

  const handleConfirm = () => {
    onProductsSelected(selectedProducts);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Products from {brandName}</DialogTitle>
      <DialogContent sx={{ 
        width: '100%',
        maxWidth: '500px',
        overflow: 'visible'
      }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Select products to add to preferences:
        </Typography>
        <Box sx={{ 
          mb: 3,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 1
        }}>
          {productList.map((product) => (
            <FormControlLabel
              key={product}
              control={
                <Checkbox
                  checked={selectedProducts.includes(product)}
                  onChange={(e) => handleProductSelect(product, e.target.checked)}
                  sx={{
                    color: 'primary.main',
                    '&.Mui-checked': {
                      color: 'primary.main',
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ 
                  fontSize: '0.9rem',
                  color: 'text.primary'
                }}>
                  {product}
                </Typography>
              }
              sx={{
                margin: 0,
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
                borderRadius: 1,
                padding: '4px 8px',
              }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={selectedProducts.length === 0}
        >
          Add Selected Products
        </Button>
      </DialogActions>
    </Dialog>
  );
};
