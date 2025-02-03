import { useState, useEffect } from 'react';
import { Company } from '../types/company';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface CompanyFormProps {
  company?: Company;
  onSubmit: (company: Partial<Company>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const INDUSTRIES = [
  'Technology',
  'Manufacturing',
  'Retail',
  'Healthcare',
  'Finance',
  'Education',
  'Entertainment',
  'Transportation',
  'Energy',
  'Other'
];

export default function CompanyForm({ company, onSubmit, onCancel, isSubmitting }: CompanyFormProps) {
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    headquarters: {
      country: '',
      state: '',
      city: ''
    },
    brands: [],
    employee_count: 0,
    industry: '',
    website: '',
    founded_year: null,
    description: '',
    ...company
  });
  const [newBrand, setNewBrand] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value !== undefined)
    );

    if (!cleanData.name || !cleanData.headquarters?.country || !cleanData.headquarters?.city) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await onSubmit(cleanData);
    } catch (err) {
      setError('Error saving company. Please try again.');
    }
  };

  const addBrand = () => {
    if (newBrand && !formData.brands?.includes(newBrand)) {
      setFormData(prev => ({
        ...prev,
        brands: [...(prev.brands || []), newBrand]
      }));
      setNewBrand('');
    }
  };

  const removeBrand = (brand: string) => {
    setFormData(prev => ({
      ...prev,
      brands: prev.brands?.filter(b => b !== brand) || []
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBrand();
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              {company ? 'Edit Company' : 'Add New Company'}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Company Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              error={!formData.name}
              helperText={!formData.name ? 'Company name is required' : ''}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Headquarters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Country"
                  value={formData.headquarters?.country}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    headquarters: { ...(prev.headquarters || {}), country: e.target.value }
                  }))}
                  fullWidth
                  required
                  error={!formData.headquarters?.country}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="State/Province"
                  value={formData.headquarters?.state}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    headquarters: { ...(prev.headquarters || {}), state: e.target.value }
                  }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="City"
                  value={formData.headquarters?.city}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    headquarters: { ...(prev.headquarters || {}), city: e.target.value }
                  }))}
                  fullWidth
                  required
                  error={!formData.headquarters?.city}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Brands
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Add Brand"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                onKeyPress={handleKeyPress}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={addBrand}
                        disabled={!newBrand}
                        edge="end"
                      >
                        <AddIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {formData.brands?.map((brand) => (
                <Chip
                  key={brand}
                  label={brand}
                  onDelete={() => removeBrand(brand)}
                  size="small"
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Employee Count"
              type="number"
              value={formData.employee_count || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                employee_count: parseInt(e.target.value) || 0
              }))}
              fullWidth
              InputProps={{
                inputProps: { min: 0 }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Industry</InputLabel>
              <Select
                value={formData.industry || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  industry: e.target.value
                }))}
                label="Industry"
              >
                {INDUSTRIES.map(industry => (
                  <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Website"
              value={formData.website || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                website: e.target.value
              }))}
              fullWidth
              placeholder="https://example.com"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Founded Year"
              type="number"
              value={formData.founded_year || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : null;
                setFormData(prev => ({ ...prev, founded_year: value }));
              }}
              fullWidth
              inputProps={{
                min: 1800,
                max: new Date().getFullYear()
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                description: e.target.value
              }))}
              multiline
              rows={4}
              fullWidth
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
              >
                {company ? 'Save Changes' : 'Create Company'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}
