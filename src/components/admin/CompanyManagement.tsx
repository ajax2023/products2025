import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Company } from '../../types/company';
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
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

interface CompanyManagementProps {
  adminId: string;
}

interface CompanyFormData {
  name: string;
  headquarters: {
    country: string;
    state: string;
    city: string;
  };
  brands: string[];
  employee_count: number;
  website?: string;
  founded_year?: number;
  industry?: string;
  description?: string;
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

export default function CompanyManagement({ adminId }: CompanyManagementProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<Company | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    headquarters: { country: '', state: '', city: '' },
    brands: [],
    employee_count: 0,
  });
  const [newBrand, setNewBrand] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, 'companies'));
      const querySnapshot = await getDocs(q);
      const companiesList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        _id: doc.id
      })) as Company[];
      setCompanies(companiesList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Error loading companies');
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newCompany = {
        ...formData,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: adminId,
        is_active: true
      };

      await addDoc(collection(db, 'companies'), newCompany);
      await fetchCompanies();
      setCreateDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Error creating company');
    }
  };

  const handleEdit = async () => {
    if (!editDialog) return;

    try {
      await updateDoc(doc(db, 'companies', editDialog._id), {
        ...formData,
        updated_at: new Date()
      });
      await fetchCompanies();
      setEditDialog(null);
      resetForm();
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Error updating company');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      await deleteDoc(doc(db, 'companies', deleteDialog._id));
      await fetchCompanies();
      setDeleteDialog(null);
    } catch (err) {
      console.error('Error deleting company:', err);
      setError('Error deleting company');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      headquarters: { country: '', state: '', city: '' },
      brands: [],
      employee_count: 0,
    });
    setNewBrand('');
  };

  const addBrand = () => {
    if (newBrand && !formData.brands.includes(newBrand)) {
      setFormData(prev => ({
        ...prev,
        brands: [...prev.brands, newBrand]
      }));
      setNewBrand('');
    }
  };

  const removeBrand = (brand: string) => {
    setFormData(prev => ({
      ...prev,
      brands: prev.brands.filter(b => b !== brand)
    }));
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading companies...</Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const CompanyForm = () => (
    <Stack spacing={2}>
      <TextField
        label="Company Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        fullWidth
        required
      />

      <Typography variant="subtitle2">Headquarters</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <TextField
          label="Country"
          value={formData.headquarters.country}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            headquarters: { ...prev.headquarters, country: e.target.value }
          }))}
          required
        />
        <TextField
          label="State"
          value={formData.headquarters.state}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            headquarters: { ...prev.headquarters, state: e.target.value }
          }))}
          required
        />
        <TextField
          label="City"
          value={formData.headquarters.city}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            headquarters: { ...prev.headquarters, city: e.target.value }
          }))}
          required
        />
      </Box>

      <Typography variant="subtitle2">Brands</Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          label="Add Brand"
          value={newBrand}
          onChange={(e) => setNewBrand(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <IconButton onClick={addBrand} disabled={!newBrand}>
          <AddIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {formData.brands.map(brand => (
          <Chip
            key={brand}
            label={brand}
            onDelete={() => removeBrand(brand)}
            size="small"
          />
        ))}
      </Box>

      <TextField
        label="Employee Count"
        type="number"
        value={formData.employee_count}
        onChange={(e) => setFormData(prev => ({ ...prev, employee_count: parseInt(e.target.value) || 0 }))}
        required
      />

      <FormControl fullWidth>
        <InputLabel>Industry</InputLabel>
        <Select
          value={formData.industry || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
          label="Industry"
        >
          {INDUSTRIES.map(industry => (
            <MenuItem key={industry} value={industry}>{industry}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Website"
        value={formData.website || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
      />

      <TextField
        label="Founded Year"
        type="number"
        value={formData.founded_year || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, founded_year: parseInt(e.target.value) || undefined }))}
      />

      <TextField
        label="Description"
        value={formData.description || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        multiline
        rows={3}
      />
    </Stack>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Company Management
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          onClick={() => {
            resetForm();
            setCreateDialog(true);
          }}
        >
          Add Company
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Brands</TableCell>
              <TableCell>Employees</TableCell>
              <TableCell>Industry</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company._id}>
                <TableCell>{company.name}</TableCell>
                <TableCell>
                  {`${company.headquarters.city}, ${company.headquarters.country}`}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {company.brands.map(brand => (
                      <Chip key={brand} label={brand} size="small" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{company.employee_count.toLocaleString()}</TableCell>
                <TableCell>{company.industry || 'N/A'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFormData(company);
                        setEditDialog(company);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog(company)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Company</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <CompanyForm />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!formData.name || !formData.headquarters.country}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editDialog}
        onClose={() => setEditDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        {/* <DialogTitle>Edit Company</DialogTitle> */}
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <CompanyForm />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={!formData.name || !formData.headquarters.country}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
      >
        <DialogTitle>Delete Company</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {deleteDialog?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
