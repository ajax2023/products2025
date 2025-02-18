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
  Stack
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { batchImportCanadianProducts } from '../../utils/canadianProducts';
import { BatchImportResult, CanadianProduct } from '../../types/product';
import Papa from 'papaparse';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
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
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setResult(null);
  };

  const downloadTemplate = () => {
    window.open('/templates/canadian_products_template.csv', '_blank');
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
      const uploadPromises = products.map(async product => {
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

        try {
          if (product._id) {
            // If product has an ID, try to update existing document
            const docRef = doc(db, 'canadian_products', product._id);
            await setDoc(docRef, productData, { merge: true });
            return docRef;
          } else {
            // If no ID, create new document
            return await addDoc(collection(db, 'canadian_products'), productData);
          }
        } catch (error) {
          console.error(`Error uploading product: ${error.message}`, product);
          throw error;
        }
      });

      const results = await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${results.length} products`);

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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // First verify auth state
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to download products');
      }

      // Get all products from Firestore
      const querySnapshot = await getDocs(collection(db, 'canadian_products'));
      const products = querySnapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));

      // Convert products to CSV format
      const csvData = products.map(product => ({
        _id: product._id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        manufacturer: product.manufacturer,
        supplier: product.supplier,
        country_of_origin: product.country_of_origin,
        production_verified: product.production_verified,
        notes: product.notes,
        products: Array.isArray(product.products) ? product.products.join(';') : product.products,
        categories: Array.isArray(product.categories) ? product.categories.join(';') : product.categories,
        cdn_prod_tags: Array.isArray(product.cdn_prod_tags) ? product.cdn_prod_tags.join(';') : product.cdn_prod_tags
      }));

      // Generate CSV
      const csv = Papa.unparse(csvData);
      
      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `canadian_products_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setResult({
        success: true,
        message: `Successfully downloaded ${products.length} products`
      });
    } catch (error) {
      console.error('Download error:', error);
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Upload Canadian Products
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
