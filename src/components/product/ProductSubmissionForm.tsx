import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, 
  TextField, FormControlLabel, Checkbox, MenuItem, Typography,
  Chip, IconButton, Stack, Snackbar, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../auth/useAuth';
import { createProductSubmission } from '../../services/productSubmissionService';
import { CanadianProduct, ExtendedProductSubmissionFormData, PRODUCT_CATEGORIES } from '../../types/productSubmission';

interface ProductSubmissionFormProps {
  onSubmitSuccess?: () => void;
}

const ProductSubmissionForm: React.FC<ProductSubmissionFormProps> = ({ onSubmitSuccess }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ExtendedProductSubmissionFormData>({
    _id: '',
    brand_name: '',
    website: '',
    city: '',
    province: '',
    country: 'Canada',
    production_verified: false,
    site_verified: false,
    site_verified_by: '',
    site_verified_at: '',
    notes: '',
    products: [],
    categories: [],
    masterCategory: undefined,
    cdn_prod_tags: [],
    added_by: user?.uid || '',
    added_by_email: user?.email || '',
    added_by_name: user?.displayName || '',
    date_added: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    modified_by: user?.uid || '',
    modified_by_email: user?.email || '',
    modified_by_name: user?.displayName || '',
    is_active: true,
    version: 1,
    isPubliclyVisible: false
  });

  // State for product input
  const [productInput, setProductInput] = useState('');

  // State for tag input
  const [tagInput, setTagInput] = useState('');

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

  const handleAddProduct = () => {
    if (productInput.trim()) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, productInput.trim()]
      }));
      setProductInput('');
    }
  };

  const handleRemoveProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setFormData(prev => ({
        ...prev,
        cdn_prod_tags: [...prev.cdn_prod_tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cdn_prod_tags: prev.cdn_prod_tags.filter((_, i) => i !== index)
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const selectedCategory = e.target.value as string;
    
    setFormData(prev => ({
      ...prev,
      categories: [selectedCategory as any]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a product');
      return;
    }

    // Validate required fields
    if (!formData.brand_name || formData.products.length === 0 || !formData.categories.length) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate email format
    if (!formData.added_by_email || !/^\S+@\S+\.\S+$/.test(formData.added_by_email)) {
      setError('Please provide a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createProductSubmission(formData, user.uid);
      setSuccess(true);
      setFormData({
        _id: '',
        brand_name: '',
        website: '',
        city: '',
        province: '',
        country: 'Canada',
        production_verified: false,
        site_verified: false,
        site_verified_by: '',
        site_verified_at: '',
        notes: '',
        products: [],
        categories: [],
        masterCategory: undefined,
        cdn_prod_tags: [],
        added_by: user?.uid || '',
        added_by_email: user?.email || '',
        added_by_name: user?.displayName || '',
        date_added: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        modified_by: user?.uid || '',
        modified_by_email: user?.email || '',
        modified_by_name: user?.displayName || '',
        is_active: true,
        version: 1,
        isPubliclyVisible: false
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
        sx={{ py: 1, px: 1 }}
      >
        Submit a New Brand and Products
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Submit a Canadian Product</DialogTitle>
        <DialogContent>
          {/* <Typography variant="body2" color="textSecondary" paragraph>
            Help us grow our database of Canadian products! Your submission will be reviewed by our team before being added to the site.
          </Typography> */}

          <Box component="form" noValidate sx={{ mt: 2 }}>
            {/* <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Brand Information
            </Typography> */}
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Brand Name"
              name="brand_name"
              value={formData.brand_name}
              onChange={handleChange}
            />

            {/* <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={formData.production_verified} 
                    onChange={handleCheckboxChange} 
                    name="production_verified" 
                  />
                }
                label="Production Verified"
              />
            </Box> */}

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>            
            <TextField
              margin="normal"
              fullWidth
              label="Company Website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
            />


              <TextField
                margin="normal"
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Toronto"
              />
              
              <TextField
                margin="normal"
                fullWidth
                label="Province"
                name="province"
                value={formData.province}
                onChange={handleChange}
                placeholder="e.g., Ontario"
              />
            </Box>

            {/* <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
              Product Information
            </Typography> */}
            
            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
              <TextField
                margin="normal"
                // fullWidth
                label="Add Product"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                placeholder="Enter product name and press Add"
              />
              <Button 
                variant="outlined" 
                onClick={handleAddProduct}
                sx={{ mt: 1, width: '200px', height: '40px' }}
              >
                Add Product
              </Button>
              
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {formData.products.map((product, index) => (
                  <Chip 
                    key={index} 
                    label={product} 
                    onDelete={() => handleRemoveProduct(index)} 
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              select
              fullWidth
              label="Category"
              name="category"
              value={formData.categories[0] || ''}
              onChange={handleCategoryChange}
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Product Description"
              name="notes"
              multiline
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              margin="normal"
            />

            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              required
              label="Your Email"
              name="added_by_email"
              type="email"
              value={formData.added_by_email}
              onChange={handleChange}
              margin="normal"
              helperText="We'll use this to contact you about your submission"
            />

            <TextField
              fullWidth
              required
              label="Your Name"
              name="added_by_name"
              value={formData.added_by_name}
              onChange={handleChange}
              margin="normal"
              helperText="Please provide your full name"
            />
            </Box>

            {/* <Box sx={{ mb: 2 }}>
              <TextField
                margin="normal"
                fullWidth
                label="Add Tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Enter tag and press Add"
              />
              <Button 
                variant="outlined" 
                onClick={handleAddTag}
                sx={{ mt: 1 }}
              >
                Add Tag
              </Button>
              
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {formData.cdn_prod_tags.map((tag, index) => (
                  <Chip 
                    key={index} 
                    label={tag} 
                    onDelete={() => handleRemoveTag(index)} 
                  />
                ))}
              </Stack>
            </Box> */}
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
