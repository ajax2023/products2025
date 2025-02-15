import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  LinearProgress,
  Link,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { batchImportCanadianProducts } from '../../utils/canadianProducts';
import { BatchImportResult, CanadianProduct } from '../../types/product';
import Papa from 'papaparse';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { auth } from '../../firebaseConfig';
import { getAuth, getIdToken } from 'firebase/auth';

interface CanadianProductUploadProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export default function CanadianProductUpload({ userId, userEmail, userName }: CanadianProductUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    verified: number;
    unverified: number;
    products: { [key: string]: CanadianProduct };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setResult(null);
  };

  const downloadTemplate = () => {
    window.open('/templates/canadian_products_template.csv', '_blank');
  };

  const countTotalProducts = (products: CanadianProduct[]) => {
    return products.reduce((sum, p) => {
      const productCount = p.products
        .map(prod => prod.split(',').map(p => p.trim()))
        .flat()
        .filter(p => p.length > 0)
        .length;
      return sum + productCount;
    }, 0);
  };

  const processCSV = (csv: string) => {
    return new Promise<Partial<CanadianProduct>[]>((resolve, reject) => {
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          try {
            const products = results.data
              .filter((row: any) => {
                return Object.values(row).some(value => 
                  value && typeof value === 'string' && value.trim().length > 0
                );
              })
              .map((row: any, index: number) => {
                console.log(`Processing row ${index}:`, row); // Debug log
                
                // Validate required fields
                if (!row.city?.trim()) {
                  console.log('City validation failed for row:', row); // Debug log
                  throw new Error(`Row ${index + 1}: City is required`);
                }
                if (!row.province?.trim()) {
                  throw new Error(`Row ${index + 1}: Province is required`);
                }

                // Handle optional arrays with empty values
                const products = row.products ? row.products.split(';').map((p: string) => p.trim()).filter(Boolean) : [row.brand_name];
                const categories = row.categories ? row.categories.split(';').map((c: string) => c.trim()).filter(Boolean) : ['Food & Beverage'];
                const tags = row.cdn_prod_tags ? row.cdn_prod_tags.split(';').map((t: string) => t.trim()).filter(Boolean) : [];

                // Validate website URL if provided
                if (row.website && row.website.trim()) {
                  try {
                    new URL(row.website.trim());
                  } catch {
                    throw new Error(`Row ${index + 1}: Invalid website URL format`);
                  }
                }

                const product = {
                  brand_name: row.brand_name ? row.brand_name.trim() : '',
                  website: row.website ? row.website.trim() : '',
                  city: row.city.trim(),
                  province: row.province.trim(),
                  production_verified: row.production_verified?.toString().toLowerCase() === 'true',
                  notes: row.notes ? row.notes.trim() : '',
                  products: products,
                  categories: categories,
                  cdn_prod_tags: tags,
                };

                console.log('Processed product:', product); // Debug log
                return product;
              });

            // Validate that we have at least one product
            products.forEach((product, index) => {
              if (!product.products || product.products.length === 0) {
                throw new Error(`Row ${index + 1}: At least one product is required`);
              }
              if (!product.categories || product.categories.length === 0) {
                throw new Error(`Row ${index + 1}: At least one category is required`);
              }
            });

            resolve(products);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error); // Debug log
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  };

  const fetchStats = async () => {
    try {
      const productsRef = collection(db, 'canadian_products');
      
      // Get total count
      const totalQuery = query(productsRef);
      const totalSnapshot = await getDocs(totalQuery);
      const total = totalSnapshot.size;

      // Get verified count
      const verifiedQuery = query(productsRef, where('production_verified', '==', true));
      const verifiedSnapshot = await getDocs(verifiedQuery);
      const verified = verifiedSnapshot.size;

      const productsQuery = query(productsRef);
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data() as CanadianProduct;
        return acc;
      }, {});

      setStats({
        total,
        verified,
        unverified: total - verified,
        products
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    setUploading(true);
    setResult(null);

    try {
      // First verify auth state
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to upload products');
      }

      // Get fresh ID token
      const token = await currentUser.getIdToken(true);
      console.log('Auth state:', {
        currentUser: currentUser,
        uid: currentUser.uid,
        email: currentUser.email,
        token: token.substring(0, 20) + '...' // Only log part of the token for security
      });

      const file = event.target.files[0];
      const text = await file.text();
      
      // Parse CSV
      const products = await processCSV(text);
      if (products.length === 0) {
        throw new Error('No valid products found in CSV');
      }

      console.log(`Processed ${products.length} products from CSV`);

      // Upload all products
      const uploadPromises = products.map(product => {
        const productData = {
          ...product,
          added_by: currentUser.uid,
          added_by_email: currentUser.email,
          added_by_name: userName,
          modified_by: currentUser.uid,
          modified_by_email: currentUser.email,
          modified_by_name: userName,
          date_added: new Date().toISOString(),
          date_modified: new Date().toISOString(),
          is_active: true,
          version: 1
        };

        return addDoc(collection(db, 'canadian_products'), productData);
      });

      const results = await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${results.length} products`);

      // Refresh stats after upload
      await fetchStats();

      setResult({
        success: true,
        message: `Successfully uploaded ${results.length} products`
      });

    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      {/* Stats Bar */}
      <Card sx={{ mb: 0.5 }}>
        <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
          <Grid container spacing={0}>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                  Total Brands
                </Typography>
                <Typography variant="body2">
                  {stats?.total ?? <CircularProgress size={12} />}
                </Typography>
              </Box>
            </Grid>
            {/* COUNT OF INDIVIDUAL BRANDS */}
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                  Products
                </Typography>
                <Typography variant="body2">
                  {stats ? countTotalProducts(Object.values(stats.products || {})) : <CircularProgress size={12} />}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                  Verified
                </Typography>
                <Typography variant="body2">
                  {stats?.verified ?? <CircularProgress size={12} />}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  Pending
                </Typography>
                <Typography variant="body2">
                  {stats?.unverified ?? <CircularProgress size={12} />}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Existing Upload UI */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<CloudUploadIcon />}
        onClick={handleOpen}
        sx={{ mb: 1 }}
      >
        Bulk Upload Products
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Bulk Upload Canadian Products
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" paragraph>
              Upload a CSV file containing Canadian product information. Make sure to follow the template format.
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadTemplate}
              sx={{ mb: 2 }}
            >
              Download Template
            </Button>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />

            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                component="label"
                disabled={uploading}
              >
                Select CSV File
                <input
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </Button>
            </Box>
          </Box>

          {uploading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
            </Box>
          )}

          {result && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Upload Results
              </Typography>
              
              {result.success ? (
                <Typography color="success.main" paragraph>
                  {result.message}
                </Typography>
              ) : (
                <Typography color="error" paragraph>
                  {result.message}
                </Typography>
              )}
            </Paper>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
