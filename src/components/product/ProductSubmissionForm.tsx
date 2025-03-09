import React, { useState } from 'react';
import { 
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, 
  TextField, FormControlLabel, Checkbox, MenuItem, Typography,
  Snackbar, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../auth/useAuth';
import { createProductSubmission } from '../../services/productSubmissionService';
import { ProductSubmissionFormData, PRODUCT_CATEGORIES, COMMON_CERTIFICATIONS } from '../../types/productSubmission';

interface ProductSubmissionFormProps {
  onSubmitSuccess?: () => void;
}

const ProductSubmissionForm: React.FC<ProductSubmissionFormProps> = ({ onSubmitSuccess }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProductSubmissionFormData>({
    brandName: '',
    productName: '',
    description: '',
    category: '',
    canadianOwned: false,
    canadianMade: false,
  });

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a product');
      return;
    }

    // Validate required fields
    if (!formData.brandName || !formData.productName || !formData.description || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createProductSubmission(formData as any, user.uid);
      setSuccess(true);
      setFormData({
        brandName: '',
        productName: '',
        description: '',
        category: '',
        canadianOwned: false,
        canadianMade: false,
      });
      handleClose();
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      console.error('Error submitting product:', err);
      setError('Failed to submit product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="contained" 
        color="secondary" 
        startIcon={<AddIcon />}
        size="large"
        onClick={handleOpen}
        sx={{ py: 1, px: 2 }}
      >
        Submit a New Brand and Products
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Submit a Canadian Product</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Help us grow our database of Canadian products! Your submission will be reviewed by our team before being added to the site.
          </Typography>

          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Brand Information
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Brand Name"
              name="brandName"
              value={formData.brandName}
              onChange={handleChange}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={formData.canadianOwned} 
                    onChange={handleCheckboxChange} 
                    name="canadianOwned" 
                  />
                }
                label="Canadian Owned"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={formData.canadianMade} 
                    onChange={handleCheckboxChange} 
                    name="canadianMade" 
                  />
                }
                label="Made in Canada"
              />
            </Box>

            <TextField
              margin="normal"
              fullWidth
              label="Company Website"
              name="website"
              value={formData.website || ''}
              onChange={handleChange}
              placeholder="https://example.com"
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                label="Headquarters Location"
                name="locationHeadquarters"
                value={formData.locationHeadquarters || ''}
                onChange={handleChange}
                placeholder="City, Province"
              />
              
              <TextField
                margin="normal"
                fullWidth
                label="Manufacturing Location"
                name="locationManufactured"
                value={formData.locationManufactured || ''}
                onChange={handleChange}
                placeholder="City, Province"
              />
            </Box>

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
              Product Information
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Product Name"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
            />

            <TextField
              select
              margin="normal"
              required
              fullWidth
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              margin="normal"
              fullWidth
              label="Subcategory"
              name="subCategory"
              value={formData.subCategory || ''}
              onChange={handleChange}
              placeholder="e.g., Dairy, Snacks, T-shirts"
            />

            <TextField
              margin="normal"
              required
              fullWidth
              multiline
              rows={4}
              label="Product Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the product, its features, and why it's great!"
            />

            <TextField
              margin="normal"
              fullWidth
              label="Where to Find"
              name="whereToFind"
              value={formData.whereToFind?.join(', ') || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  whereToFind: value ? value.split(',').map(item => item.trim()) : []
                }));
              }}
              placeholder="Stores or websites where this product can be purchased (comma separated)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Product'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success">
          Product submitted successfully! It will be reviewed by our team.
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert severity="error">
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProductSubmissionForm;
