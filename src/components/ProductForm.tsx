import { useState, useEffect } from 'react';
import { addDoc, collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Product, ProductOrigin, ProductPrice, PRODUCT_CATEGORIES, PRODUCT_UNITS, COMMON_ATTRIBUTES } from '../types/product';
import { Company } from '../types/company';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CompanyForm from './CompanyForm'; // Import your existing CompanyForm component

export default function ProductForm() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customAttribute, setCustomAttribute] = useState({ key: '', value: '' });
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    category: 'Food & Beverage',
    company_id: '',
    origin: {
      country: 'Canada',
      province: '',
      city: ''
    },
    attributes: {},
    prices: [], // Initialize prices array
    status: 'draft',
    version: 1,
    is_active: true
  });
  const [newPrice, setNewPrice] = useState<Partial<ProductPrice>>({
    amount: 0,
    unit: 'each',
    location: '',
    date: new Date()
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'companies'));
      const companyList = querySnapshot.docs.map(doc => ({ 
        ...doc.data(), 
        _id: doc.id 
      }) as Company);
      setCompanies(companyList);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!auth.currentUser) {
      setError('Please log in to add products');
      return;
    }

    try {
      const productData = {
        ...formData,
        _id: `prod_${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: auth.currentUser.uid,
        status: 'draft',
        version: 1,
        is_active: true
      };

      // Create the product
      const productRef = await addDoc(collection(db, 'products'), productData);

      setSuccess('Product saved as draft. You can submit it for approval when ready.');
      setFormData({
        name: '',
        brand: '',
        category: 'Food & Beverage',
        company_id: '',
        origin: { country: '', state: '', city: '' },
        attributes: {},
        prices: [], // Initialize prices array
        status: 'draft',
        version: 1,
        is_active: true
      });
    } catch (err) {
      setError('Error adding product. Please try again.');
      console.error('Error:', err);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!auth.currentUser) {
      setError('Please log in to submit products');
      return;
    }

    try {
      // Update product status
      await updateDoc(doc(db, 'products', formData._id!), {
        status: 'pending',
        submitted_by: auth.currentUser.uid,
        submitted_at: new Date(),
        updated_at: new Date()
      });

      // Create approval history
      await setDoc(doc(db, 'approval_history', `prod_${formData._id}`), {
        _id: `approval_${Date.now()}`,
        entity_id: formData._id,
        entity_type: 'product',
        actions: [],
        current_status: 'pending',
        submitted_by: auth.currentUser.uid,
        submitted_at: new Date()
      });

      setSuccess('Product submitted for approval!');
      setFormData({
        name: '',
        brand: '',
        category: 'Electronics',
        company_id: '',
        origin: { country: '', state: '', city: '' },
        attributes: {},
        prices: [], // Initialize prices array
        status: 'draft',
        version: 1,
        is_active: true
      });
    } catch (err) {
      setError('Error submitting product for approval. Please try again.');
      console.error('Error:', err);
    }
  };

  const handleAttributeAdd = () => {
    if (customAttribute.key && customAttribute.value) {
      setFormData(prev => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          [customAttribute.key]: customAttribute.value
        }
      }));
      setCustomAttribute({ key: '', value: '' });
    }
  };

  const handleAttributeDelete = (key: string) => {
    const newAttributes = { ...formData.attributes };
    delete newAttributes[key];
    setFormData(prev => ({ ...prev, attributes: newAttributes }));
  };

  const handleAddPrice = () => {
    if (!newPrice.amount || !newPrice.unit || !newPrice.location) {
      setError('Please fill in all price fields');
      return;
    }

    setFormData(prev => ({
      ...prev,
      prices: [...(prev.prices || []), { ...newPrice, date: new Date() } as ProductPrice]
    }));

    setNewPrice({
      amount: 0,
      unit: 'each',
      location: '',
      date: new Date()
    });
  };

  const handleRemovePrice = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices?.filter((_, i) => i !== index)
    }));
  };

  const handleCompanySelect = (companyId: string) => {
    setFormData(prev => ({
      ...prev,
      company_id: companyId
    }));
  };

  const handleNewCompany = () => {
    setShowCompanyDialog(true);
  };

  const handleCompanyDialogClose = () => {
    setShowCompanyDialog(false);
    // Refresh companies list after adding new company
    fetchCompanies();
  };

  const handleViewCompany = (companyId: string) => {
    window.location.href = '/companies';
  };

  const selectedCompany = companies.find(c => c._id === formData.company_id);

  return (
    <Paper elevation={0} sx={{ p: 1, ml: 0,maxWidth: 800, margin: '0 auto' }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Add New Product</Typography>
          </Grid>

          {/* Basic Info */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              size="small"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {PRODUCT_CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Company and Brand */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Manufacturer</InputLabel>
              <Select
                value={formData.company_id || ''}
                onChange={(e) => handleCompanySelect(e.target.value)}
                label="Manufacturer"
              >
                {companies.map((company) => (
                  <MenuItem key={company._id} value={company._id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleNewCompany}
                variant="outlined"
              >
                Add New Company
              </Button>
              {formData.company_id && (
                <Button
                  size="small"
                  onClick={() => handleViewCompany(formData.company_id!)}
                  variant="outlined"
                >
                  View Company Details
                </Button>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Brand</InputLabel>
              <Select
                value={formData.brand}
                label="Brand"
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                disabled={!selectedCompany}
              >
                {selectedCompany?.brands.map(brand => (
                  <MenuItem key={brand} value={brand}>{brand}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Origin */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Origin</Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Country"
              value={formData.origin?.country}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                origin: { ...prev.origin!, country: e.target.value }
              }))}
              size="small"
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="State"
              value={formData.origin?.state}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                origin: { ...prev.origin!, state: e.target.value }
              }))}
              size="small"
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="City"
              value={formData.origin?.city}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                origin: { ...prev.origin!, city: e.target.value }
              }))}
              size="small"
              required
            />
          </Grid>

          {/* Pricing Section */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Pricing
            </Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
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
                <Grid item xs={12} sm={3}>
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
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={newPrice.location}
                    onChange={(e) => setNewPrice(prev => ({ ...prev, location: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddPrice}
                    startIcon={<AddIcon />}
                  >
                    Add Price
                  </Button>
                </Grid>
              </Grid>

              {/* Price List */}
              {formData.prices && formData.prices.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Prices:
                  </Typography>
                  {formData.prices.map((price, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        ${price.amount.toFixed(2)} {price.unit} at {price.location}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemovePrice(index)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Attributes */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Attributes</Typography>
            <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="Attribute Name"
                value={customAttribute.key}
                onChange={(e) => setCustomAttribute(prev => ({ ...prev, key: e.target.value }))}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                size="small"
                label="Value"
                value={customAttribute.value}
                onChange={(e) => setCustomAttribute(prev => ({ ...prev, value: e.target.value }))}
                sx={{ flexGrow: 1 }}
              />
              <IconButton 
                onClick={handleAttributeAdd}
                disabled={!customAttribute.key || !customAttribute.value}
              >
                <AddIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(formData.attributes || {}).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  onDelete={() => handleAttributeDelete(key)}
                  size="small"
                />
              ))}
            </Box>
          </Grid>

          {/* Submit Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="outlined"
                color="primary"
                size="small"
              >
                Save as Draft
              </Button>
              {formData._id && formData.status === 'draft' && (
                <Button
                  onClick={handleSubmitForApproval}
                  variant="contained"
                  color="primary"
                  size="small"
                >
                  Submit for Approval
                </Button>
              )}
            </Box>
          </Grid>

          {/* Status Messages */}
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          {success && (
            <Grid item xs={12}>
              <Alert severity="success">{success}</Alert>
            </Grid>
          )}
        </Grid>
      </form>
      <Dialog open={showCompanyDialog} onClose={handleCompanyDialogClose}>
        <DialogTitle>Add New Company</DialogTitle>
        <DialogContent>
          <CompanyForm
            onSubmit={async (company) => {
              // Handle company creation
              try {
                const companyRef = await addDoc(collection(db, 'companies'), company);
                handleCompanySelect(companyRef.id);
                handleCompanyDialogClose();
              } catch (error) {
                console.error('Error creating company:', error);
                setError('Failed to create company');
              }
            }}
            onCancel={handleCompanyDialogClose}
            isSubmitting={false}
          />
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
