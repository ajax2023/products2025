import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, onSnapshot, doc, updateDoc, getDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { Product, ProductPrice, PRODUCT_UNITS, PRICE_SOURCES } from '../types/product';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Collapse, Box, Typography, TablePagination, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Chip, Tooltip, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useLocation } from 'react-router-dom';
import { Company } from '../types/company';

export default function ProductList() {
  const location = useLocation();
  const brandFilter = location.state?.brandFilter;
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [newPrice, setNewPrice] = useState<Partial<ProductPrice>>({
    amount: 0,
    unit: 'each',
    location: {
      country: '',
      state: '',
      city: ''
    },
    date: new Date().toISOString(),
    source: 'manual',
    notes: '',
    sales_link: ''
  });
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingPrice, setEditingPrice] = useState<{productId: string, priceIndex: number} | null>(null);
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [editedPrice, setEditedPrice] = useState<Partial<ProductPrice>>({
    amount: 0,
    unit: 'each',
    location: {
      country: '',
      state: '',
      city: ''
    },
    notes: '',
    sales_link: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      setAuthChecked(true);
      if (user) {
        // Check roles from Firestore first
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isUserAdmin = userData.role === 'admin' || userData.role === 'super_admin';
          const isUserSuperAdmin = userData.role === 'super_admin';
          const isUserContributor = userData.role === 'contributor' || isUserAdmin || isUserSuperAdmin;
          
          setIsAdmin(isUserAdmin);
          setIsSuperAdmin(isUserSuperAdmin);
          
          // Get token to check claims
          const token = await user.getIdTokenResult(true);
          console.log('Current token claims:', token.claims);
          
          // If claims don't match Firestore roles, we need to refresh
          if (token.claims.admin !== isUserAdmin || 
              token.claims.superAdmin !== isUserSuperAdmin || 
              token.claims.contributor !== isUserContributor) {
            console.log('Role mismatch detected, forcing token refresh');
            await user.getIdToken(true);
          }
        }
        
        fetchData();
      } else {
        console.log('No user logged in');
        setProducts([]);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (brandFilter) {
      setProducts(prevProducts => 
        prevProducts.filter(product => product.brand === brandFilter)
      );
    }
  }, [brandFilter]);

  const fetchData = async () => {
    try {
      console.log('Starting data fetch...');
      // Fetch companies first
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      console.log('Companies fetched:', companiesSnapshot.size);
      const companiesMap: Record<string, Company> = {};
      companiesSnapshot.docs.forEach(doc => {
        companiesMap[doc.id] = { ...doc.data(), _id: doc.id } as Company;
      });
      setCompanies(companiesMap);

      // Then fetch products
      console.log('Fetching products...');
      const q = query(collection(db, 'products'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      console.log('Products fetched:', querySnapshot.size);
      const productList = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        _id: doc.id
      })) as Product[];

      // Apply brand filter if present
      const filteredList = brandFilter 
        ? productList.filter(product => product.brand === brandFilter)
        : productList;

      setProducts(filteredList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      // @ts-ignore
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please make sure you have the correct access rights.');
      } else {
        setError('Error loading products. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenPriceDialog = (product: Product) => {
    setSelectedProduct(product);
    setPriceDialogOpen(true);
  };

  const handleClosePriceDialog = () => {
    setSelectedProduct(null);
    setPriceDialogOpen(false);
    setNewPrice({
      amount: 0,
      unit: 'each',
      location: {
        country: '',
        state: '',
        city: ''
      },
      date: new Date().toISOString(),
      source: 'manual',
      notes: '',
      sales_link: ''
    });
    setError(null);
  };

  const handleAddPrice = async () => {
    if (!selectedProduct || !auth.currentUser) return;
    if (!newPrice.amount || !newPrice.unit || 
        !newPrice.location.country || !newPrice.location.city) {
      setError('Please fill in all required price fields (amount, unit, country, and city)');
      return;
    }

    try {
      const now = new Date().toISOString();
      const productRef = doc(db, 'products', selectedProduct._id);
      const updatedPrices = [
        ...(selectedProduct.prices || []),
        { 
          ...newPrice, 
          date: now,
          created_by: auth.currentUser.uid,
          created_by_email: auth.currentUser.email || 'unknown',
          created_by_name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'unknown',
          created_at: now,
          source: 'manual'
        } as ProductPrice
      ];

      await updateDoc(productRef, {
        prices: updatedPrices,
        updated_at: new Date()
      });

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === selectedProduct._id 
            ? { ...p, prices: updatedPrices }
            : p
        )
      );

      // Automatically expand the price section for this product
      setExpandedRows(prev => ({
        ...prev,
        [selectedProduct._id]: true
      }));

      handleClosePriceDialog();
    } catch (error) {
      console.error('Error adding price:', error);
      setError('Failed to add price. Please try again.');
    }
  };

  const handleDeletePrice = async (productId: string, priceIndex: number) => {
    try {
      const product = products.find(p => p._id === productId);
      if (!product) return;

      const updatedPrices = [...(product.prices || [])];
      updatedPrices.splice(priceIndex, 1);

      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        prices: updatedPrices,
        updated_at: new Date()
      });

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === productId
            ? { ...p, prices: updatedPrices }
            : p
        )
      );
    } catch (error) {
      console.error('Error deleting price:', error);
      setError('Failed to delete price. Please try again.');
    }
  };

  const handleOpenEditPriceDialog = (productId: string, priceIndex: number, price: ProductPrice) => {
    if (!auth.currentUser) return;
    
    // Check if user can edit this price
    const canEdit = isAdmin || isSuperAdmin || (auth.currentUser && price.created_by === auth.currentUser.uid);
    if (!canEdit) {
      setError('You can only edit prices that you created');
      return;
    }

    setEditingPrice({ productId, priceIndex });
    setEditedPrice({
      amount: price.amount,
      unit: price.unit,
      location: { ...price.location },
      notes: price.notes,
      sales_link: price.sales_link
    });
    setEditPriceDialogOpen(true);
  };

  const handleCloseEditPriceDialog = () => {
    setEditPriceDialogOpen(false);
    setEditingPrice(null);
    setEditedPrice({
      amount: 0,
      unit: 'each',
      location: {
        country: '',
        state: '',
        city: ''
      },
      notes: '',
      sales_link: ''
    });
    setError(null);
  };

  const handleSaveEditedPrice = async () => {
    if (!editingPrice || !auth.currentUser) return;
    if (!editedPrice.amount || !editedPrice.unit || 
        !editedPrice.location?.country || !editedPrice.location?.city) {
      setError('Please fill in all required price fields (amount, unit, country, and city)');
      return;
    }

    try {
      const token = await auth.currentUser.getIdTokenResult();
      console.log('Attempting price update with roles:', {
        admin: token.claims.admin,
        superAdmin: token.claims.superAdmin,
        contributor: token.claims.contributor
      });

      const product = products.find(p => p._id === editingPrice.productId);
      if (!product) return;

      const originalPrice = product.prices?.[editingPrice.priceIndex];
      if (!originalPrice) {
        setError('Original price not found');
        return;
      }

      console.log('Original price:', originalPrice);

      // Create the updated price object
      const updatedPrice = {
        ...originalPrice,
        amount: editedPrice.amount,
        unit: editedPrice.unit,
        location: editedPrice.location,
        notes: editedPrice.notes,
        sales_link: editedPrice.sales_link,
        modified_by: auth.currentUser.uid,
        modified_by_name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'unknown',
        modified_at: new Date().toISOString()
      };

      console.log('Updated price:', updatedPrice);

      // Get a fresh reference to the document
      const productRef = doc(db, 'products', editingPrice.productId);
      
      // Try a simpler update first - just update the specific price in the array
      const currentDoc = await getDoc(productRef);
      if (!currentDoc.exists()) {
        setError('Product not found');
        return;
      }

      const prices = currentDoc.data()?.prices || [];
      prices[editingPrice.priceIndex] = updatedPrice;

      console.log('Updating with prices:', prices);

      // Update with the modified prices array
      await updateDoc(productRef, {
        prices: prices
      });

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === editingPrice.productId
            ? { ...p, prices: prices }
            : p
        )
      );

      handleCloseEditPriceDialog();
    } catch (error) {
      console.error('Error updating price:', error);
      setError('Failed to update price. Please try again.');
    }
  };

  const toggleRow = (productId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    // Handle Firestore Timestamp
    const timestamp = date?.toDate ? date.toDate() : new Date(date);
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Typography variant="h5" gutterBottom>
          Products
        </Typography>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Name</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Origin</TableCell>
              <TableCell>Attributes</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((product) => (
                <React.Fragment key={product._id}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={() => toggleRow(product._id)}
                      >
                        {expandedRows[product._id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      {`${product.origin.city}, ${product.origin.country}`}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(product.attributes).map(([key, value]) => (
                          <Chip
                            key={key}
                            label={`${key}: ${value}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {companies[product.company_id]?.name || product.company_id}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleOpenPriceDialog(product)}
                        size="small"
                        color="primary"
                        title="Add Price"
                      >
                        <AttachMoneyIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={expandedRows[product._id]} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Prices by region
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Price</TableCell>
                                <TableCell>Unit</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Added By</TableCell>
                                <TableCell>Buy Online</TableCell>
                                {(isAdmin || isSuperAdmin || (auth.currentUser && product.prices?.some(price => price.created_by === auth.currentUser.uid))) && (
                                  <TableCell padding="checkbox">Actions</TableCell>
                                )}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {product.prices?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((price, index) => (
                                <TableRow key={`${product._id}-price-${index}`}>
                                  <TableCell>${price.amount.toFixed(2)}</TableCell>
                                  <TableCell>{price.unit}</TableCell>
                                  <TableCell>
                                    {`${price.location.city}${price.location.state ? `, ${price.location.state}` : ''}, ${price.location.country}`}
                                  </TableCell>
                                  <TableCell>{formatDate(price.date)}</TableCell>
                                  <TableCell>
                                    {price.created_by_name || price.created_by_email?.split('@')[0] || 'Unknown'}
                                    {price.modified_by_name && (
                                      <Tooltip title={`Last edited by ${price.modified_by_name}`}>
                                        <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                                          (edited)
                                        </Typography>
                                      </Tooltip>
                                    )}
                                    {price.notes && (
                                      <Tooltip title={price.notes}>
                                        <InfoIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} />
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {price.sales_link ? (
                                      <Tooltip title="Buy Online">
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          href={price.sales_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ShoppingCartIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">
                                        Not available
                                      </Typography>
                                    )}
                                  </TableCell>
                                  {(isAdmin || isSuperAdmin || (auth.currentUser && price.created_by === auth.currentUser.uid)) && (
                                    <TableCell padding="checkbox" sx={{ whiteSpace: 'nowrap' }}>
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        {(isAdmin || isSuperAdmin || (auth.currentUser && price.created_by === auth.currentUser.uid)) && (
                                          <IconButton
                                            size="small"
                                            onClick={() => handleOpenEditPriceDialog(product._id, index, price)}
                                            color="primary"
                                            title="Edit Price"
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                        )}
                                        {(isAdmin || isSuperAdmin) && (
                                          <IconButton
                                            size="small"
                                            onClick={() => handleDeletePrice(product._id, index)}
                                            color="error"
                                            title="Delete Price"
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        )}
                                      </Box>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                              {(!product.prices || product.prices.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={(isAdmin || isSuperAdmin || (auth.currentUser && product.prices?.some(price => price.created_by === auth.currentUser.uid))) ? 7 : 6} align="center">
                                    No prices available
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No products found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={products.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Price Entry Dialog */}
      <Dialog open={priceDialogOpen} onClose={handleClosePriceDialog}>
        <DialogTitle>
          Add Price for {selectedProduct?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Country"
                value={newPrice.location.country}
                onChange={(e) => setNewPrice(prev => ({
                  ...prev,
                  location: { ...prev.location, country: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                value={newPrice.location.state}
                onChange={(e) => setNewPrice(prev => ({
                  ...prev,
                  location: { ...prev.location, state: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="City"
                value={newPrice.location.city}
                onChange={(e) => setNewPrice(prev => ({
                  ...prev,
                  location: { ...prev.location, city: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sales Link"
                placeholder="Optional: Add a URL where this product can be purchased"
                value={newPrice.sales_link}
                onChange={(e) => setNewPrice(prev => ({ ...prev, sales_link: e.target.value }))}
                InputProps={{
                  endAdornment: newPrice.sales_link && (
                    <IconButton
                      size="small"
                      href={newPrice.sales_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ opacity: 0.7 }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                placeholder="Optional: Add any notes about this price entry"
                value={newPrice.notes}
                onChange={(e) => setNewPrice(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePriceDialog}>Cancel</Button>
          <Button onClick={handleAddPrice} variant="contained">
            Add Price
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={editPriceDialogOpen} onClose={handleCloseEditPriceDialog}>
        <DialogTitle>Edit Price</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Price"
                value={editedPrice.amount}
                onChange={(e) => setEditedPrice(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={editedPrice.unit}
                  label="Unit"
                  onChange={(e) => setEditedPrice(prev => ({ ...prev, unit: e.target.value }))}
                >
                  {PRODUCT_UNITS.map((unit) => (
                    <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Country"
                value={editedPrice.location?.country}
                onChange={(e) => setEditedPrice(prev => ({
                  ...prev,
                  location: { ...prev.location, country: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                value={editedPrice.location?.state}
                onChange={(e) => setEditedPrice(prev => ({
                  ...prev,
                  location: { ...prev.location, state: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="City"
                value={editedPrice.location?.city}
                onChange={(e) => setEditedPrice(prev => ({
                  ...prev,
                  location: { ...prev.location, city: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sales Link"
                placeholder="Optional: Add a URL where this product can be purchased"
                value={editedPrice.sales_link}
                onChange={(e) => setEditedPrice(prev => ({ ...prev, sales_link: e.target.value }))}
                InputProps={{
                  endAdornment: editedPrice.sales_link && (
                    <IconButton
                      size="small"
                      href={editedPrice.sales_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ opacity: 0.7 }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                placeholder="Optional: Add any notes about this price entry"
                value={editedPrice.notes}
                onChange={(e) => setEditedPrice(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditPriceDialog}>Cancel</Button>
          <Button onClick={handleSaveEditedPrice} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
