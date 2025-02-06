import { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  orderBy,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  where,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { Company } from '../types/company';
import CompanyForm from './CompanyForm';
import CompanyImport from './admin/CompanyImport';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  TablePagination,
  CircularProgress,
  Button,
  Dialog,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  DialogContent,
  DialogActions,
  DialogTitle,
  InputAdornment,
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Language as WebsiteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

const INDUSTRIES = [
  'All',
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

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [authChecked, setAuthChecked] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingBrands, setEditingBrands] = useState<Record<string, string[]>>({});
  const [newBrandInputs, setNewBrandInputs] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      setAuthChecked(true);
      if (user) {
        console.log('User is authenticated, checking role...');
        await checkUserRole(user.uid);
        fetchCompanies();
      } else {
        console.log('No user logged in');
        setError('Please log in to view companies');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      // Special case for super admin
      if (auth.currentUser?.email === 'ajax@online101.ca') {
        setIsSuperAdmin(true);
        setIsAdmin(true);
        setIsContributor(true);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;
        setIsSuperAdmin(role === 'super_admin');
        setIsAdmin(role === 'admin' || role === 'super_admin');
        setIsContributor(role === 'contributor' || role === 'admin' || role === 'super_admin');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  useEffect(() => {
    filterCompanies();
  }, [searchTerm, selectedIndustry, companies]);

  const filterCompanies = () => {
    let filtered = [...companies];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(searchLower) ||
        company.brands?.some(brand => brand.toLowerCase().includes(searchLower)) ||
        company.headquarters.city.toLowerCase().includes(searchLower) ||
        company.headquarters.country.toLowerCase().includes(searchLower)
      );
    }

    // Apply industry filter
    if (selectedIndustry !== 'All') {
      filtered = filtered.filter(company => company.industry === selectedIndustry);
    }

    setFilteredCompanies(filtered);
    setPage(0);
  };

  const fetchCompanies = async () => {
    try {
      console.log('Starting companies fetch...');
      const q = query(collection(db, 'companies'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      console.log('Companies fetched:', querySnapshot.size);
      
      const companiesList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        _id: doc.id
      })) as Company[];
      
      setCompanies(companiesList);
      setFilteredCompanies(companiesList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching companies:', error);
      // @ts-ignore
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please make sure you have the correct access rights.');
      } else {
        setError('Error loading companies. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleCreateCompany = async (companyData: Partial<Company>) => {
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'companies'), {
        ...companyData,
        created_at: new Date(),
        created_by: auth.currentUser?.uid
      });
      await fetchCompanies();
      setIsFormOpen(false);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error creating company:', error);
      setError('Error creating company. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (companyData: Partial<Company>) => {
    if (!editingCompany?._id) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'companies', editingCompany._id), {
        ...companyData,
        updated_at: new Date(),
        updated_by: auth.currentUser?.uid
      });
      await fetchCompanies();
      setIsFormOpen(false);
      setEditingCompany(undefined);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error updating company:', error);
      setError('Error updating company. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete?._id) return;
    try {
      await deleteDoc(doc(db, 'companies', companyToDelete._id));
      await fetchCompanies();
      setDeleteConfirmOpen(false);
      setCompanyToDelete(null);
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('Error deleting company. Please try again.');
    }
  };

  const handleUpdateBrands = async (companyId: string, brands: string[]) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        brands,
        updated_at: new Date(),
        updated_by: auth.currentUser?.uid
      });
      await fetchCompanies();
      // Reset editing state
      setEditingBrands(prev => {
        const newState = { ...prev };
        delete newState[companyId];
        return newState;
      });
    } catch (error) {
      console.error('Error updating brands:', error);
      setError('Error updating brands. Please try again.');
    }
  };

  const startEditingBrands = (companyId: string, brands: string[]) => {
    setEditingBrands(prev => ({
      ...prev,
      [companyId]: [...brands]
    }));
  };

  const cancelEditingBrands = (companyId: string) => {
    setEditingBrands(prev => {
      const newState = { ...prev };
      delete newState[companyId];
      return newState;
    });
    setNewBrandInputs(prev => {
      const newState = { ...prev };
      delete newState[companyId];
      return newState;
    });
  };

  const addBrand = (companyId: string) => {
    const newBrand = newBrandInputs[companyId]?.trim();
    if (newBrand && !editingBrands[companyId]?.includes(newBrand)) {
      setEditingBrands(prev => ({
        ...prev,
        [companyId]: [...(prev[companyId] || []), newBrand]
      }));
      setNewBrandInputs(prev => ({
        ...prev,
        [companyId]: ''
      }));
    }
  };

  const removeBrand = (companyId: string, brandToRemove: string) => {
    setEditingBrands(prev => ({
      ...prev,
      [companyId]: prev[companyId].filter(brand => brand !== brandToRemove)
    }));
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatEmployeeCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
  };

  const toggleRow = (companyId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  if (!authChecked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Companies
        </Typography>
        {(isAdmin || isContributor) && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {(isAdmin) && (
              <Button
                variant="outlined"
                onClick={() => setIsImportOpen(true)}
                startIcon={<FilterIcon />}
              >
                Import
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => setIsFormOpen(true)}
              startIcon={<BusinessIcon />}
            >
              Add Company
            </Button>
          </Box>
        )}
      </Box>
      
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Industry</InputLabel>
                <Select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  label="Industry"
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterIcon />
                    </InputAdornment>
                  }
                >
                  {INDUSTRIES.map(industry => (
                    <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ 
                '& th': {
                  backgroundColor: '#c5c5c5',
                  color: 'black'
                }
              }}>
                <TableCell padding="none" sx={{ width: '28px' }} />
                <TableCell sx={{ width: '30%' }}>Name / Location</TableCell>
                <TableCell sx={{ width: '25%' }}>Industry / Employees</TableCell>
                <TableCell sx={{ width: '25%' }}>Founded / Website</TableCell>
                {(isAdmin || isContributor) && <TableCell sx={{ width: '15%' }} align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCompanies
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((company) => (
                  <>
                    <TableRow key={company._id}>
                      <TableCell padding="none">
                        <IconButton
                          size="small"
                          onClick={() => toggleRow(company._id)}
                        >
                          {expandedRows.has(company._id) ? (
                            <KeyboardArrowUpIcon />
                          ) : (
                            <KeyboardArrowDownIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1">{company.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {`${company.headquarters.city}, ${company.headquarters.country}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1">{company.industry || 'N/A'}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {formatEmployeeCount(company.employee_count)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1">{company.founded_year || 'N/A'}</Typography>
                          {company.website && (
                            <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <WebsiteIcon fontSize="small" />
                              <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                Website
                              </a>
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      {(isAdmin || isContributor) && (
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingCompany(company);
                                setIsFormOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {(isAdmin) && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setCompanyToDelete(company);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    {expandedRows.has(company._id) && (
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={(isAdmin || isContributor) ? 5 : 4}>
                          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              {company.description || 'No description available'}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="subtitle2">
                                Brands ({company.brands?.length || 0}):
                              </Typography>
                              {!editingBrands[company._id] ? (
                                <Button
                                  size="small"
                                  startIcon={<EditIcon />}
                                  onClick={() => startEditingBrands(company._id, company.brands || [])}
                                >
                                  Edit Brands
                                </Button>
                              ) : (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    color="primary"
                                    onClick={() => handleUpdateBrands(company._id, editingBrands[company._id])}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="small"
                                    color="inherit"
                                    onClick={() => cancelEditingBrands(company._id)}
                                  >
                                    Cancel
                                  </Button>
                                </Box>
                              )}
                            </Box>
                            {!editingBrands[company._id] ? (
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {company.brands?.length ? (
                                  company.brands.map((brand) => (
                                    <Chip
                                      key={brand}
                                      label={brand}
                                      size="small"
                                      variant="outlined"
                                      onClick={() => navigate('/', { state: { brandFilter: brand } })}
                                    />
                                  ))
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    No brands listed
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                  <TextField
                                    size="small"
                                    placeholder="Add new brand"
                                    value={newBrandInputs[company._id] || ''}
                                    onChange={(e) => setNewBrandInputs(prev => ({
                                      ...prev,
                                      [company._id]: e.target.value
                                    }))}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addBrand(company._id);
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => addBrand(company._id)}
                                    disabled={!newBrandInputs[company._id]?.trim()}
                                  >
                                    Add
                                  </Button>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {editingBrands[company._id]?.map((brand) => (
                                    <Chip
                                      key={brand}
                                      label={brand}
                                      size="small"
                                      onDelete={() => removeBrand(company._id, brand)}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              {filteredCompanies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={(isAdmin || isContributor) ? 5 : 4} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No companies found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          sx={{
            backgroundColor: '#c5c5c5',
            '& .MuiToolbar-root': {
              backgroundColor: '#c5c5c5'
            }
          }}
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredCompanies.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Company Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCompany(undefined);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCompany ? 'Edit Company' : 'Add New Company'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <CompanyForm
            initialData={editingCompany}
            onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingCompany(undefined);
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {companyToDelete?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (companyToDelete) {
                handleDeleteCompany(companyToDelete._id);
              }
              setDeleteConfirmOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog - Only for Admins */}
      {isAdmin && (
        <Dialog
          open={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Import Companies</DialogTitle>
          <DialogContent>
            <CompanyImport onClose={() => setIsImportOpen(false)} onSuccess={fetchCompanies} />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
