import { useState } from 'react';
import { Button, Alert, Box, Typography } from '@mui/material';
import { Product, ProductCategory, PRODUCT_CATEGORIES } from '../../types/product';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Papa from 'papaparse';

interface ProductImportProps {
  onClose?: () => void;
}

export default function ProductImport({ onClose }: ProductImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const downloadTemplate = () => {
    const header = 'name,brand,category,origin_country,state,city,origin_manufacturer,origin_facility_id,product_tags,canadianOriginType\n';
    const sampleData = [
      'Apple,Farm Fresh,Food & Beverage,Canada,Ontario,Toronto,Ontario Fruit Growers,ON123,"{""organic"":true,""type"":""Gala""}",product_of_canada',
      'Ground Beef,Daily Farms,Food & Beverage,Canada,Alberta,Edmonton,Alberta Fresh LLC,AB789,"{""grade"":""AAA"",""weight_kg"":1}",made_in_canada',
      'Milk,Pure Dairy,Food & Beverage,Canada,British Columbia,Vancouver,BC Dairy Ltd,BC456,"{""fat_content"":""3.25"",""pasteurized"":true}",canada_with_imports'
    ].join('\n');

    const blob = new Blob([header + sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          const productsRef = collection(db, 'products');

          console.log('Parsed CSV data:', results.data);

          let index = 0;
          for (const row of results.data) {
            try {
              if (!row.name || !row.category || !row.origin_country) {
                console.error('Missing required fields:', row);
                continue;
              }

              const docRef = doc(productsRef);
              let product_tags = {};
              
              try {
                if (row.product_tags) {
                  // Remove any wrapping quotes
                  const cleanJson = row.product_tags.replace(/^["']|["']$/g, '');
                  product_tags = JSON.parse(cleanJson);
                }
              } catch (jsonError) {
                console.error('Error parsing product_tags JSON:', row.product_tags, jsonError);
                setError('Error parsing product_tags JSON. Make sure it is valid JSON.');
                return;
              }

              // Stagger creation dates by 1 second each
              const now = new Date();
              const createdAt = new Date(now.getTime() + (index * 1000));
              const isoDate = createdAt.toISOString();

              const product: Partial<Product> = {
                name: row.name,
                brand: row.brand,
                category: row.category as ProductCategory,
                origin: {
                  country: row.origin_country,
                  state: row.state || '',
                  city: row.city || '',
                  manufacturer: row.origin_manufacturer,
                  facility_id: row.origin_facility_id
                },
                product_tags,
                price_history: [],
                created_at: isoDate,
                updated_at: isoDate,
                created_by: auth.currentUser?.uid || '',
                created_by_email: auth.currentUser?.email || '',
                created_by_name: auth.currentUser?.displayName || auth.currentUser?.email || '',
                updated_by: auth.currentUser?.uid || '',
                updated_by_name: auth.currentUser?.displayName || auth.currentUser?.email || '',
                status: 'draft' as ProductStatus,
                is_active: true,
                version: 1,
                canadianOriginType: row.canadianOriginType || null
              };

              if (row.company_id) {
                product.company_id = row.company_id;
              }

              // Add new category to PRODUCT_CATEGORIES if it's not already there
              if (product.category && !PRODUCT_CATEGORIES.includes(product.category)) {
                console.log('Adding new category:', product.category);
                PRODUCT_CATEGORIES.push(product.category);
              }

              console.log('Adding product:', product);
              batch.set(docRef, product);
              index++;
            } catch (rowError) {
              console.error('Error processing row:', row, rowError);
            }
          }

          console.log('Committing batch...');
          await batch.commit();
          console.log('Batch committed successfully');
          setSuccess(`Successfully imported ${index} products`);
          
          // Close after a short delay to show success message
          setTimeout(() => {
            if (onClose) onClose();
            // Force reload the page to refresh the product list
            window.location.reload();
          }, 1500);
        } catch (err) {
          console.error('Import error:', err);
          setError('Error importing products: ' + (err as Error).message);
        }
      },
      error: (err) => {
        console.error('CSV parsing error:', err);
        setError('Error parsing CSV file: ' + err.message);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" component="div">
          Required columns:
          <ul>
            <li><strong>name</strong>: Product name</li>
            <li><strong>category</strong>: Product category</li>
            <li><strong>origin_country</strong>: Country of origin</li>
          </ul>
          Optional columns:
          <ul>
            <li><strong>brand</strong>: Brand name</li>
            <li><strong>state</strong>: State/Province</li>
            <li><strong>city</strong>: City</li>
            <li><strong>origin_manufacturer</strong>: Manufacturer name</li>
            <li><strong>origin_facility_id</strong>: Facility identifier</li>
            <li><strong>product_tags</strong>: JSON string of product tags (e.g., {'"{"color": "red", "size": "large"}"'})</li>
            <li><strong>company_id</strong>: Company identifier</li>
            <li><strong>canadianOriginType</strong>: Origin type for Canadian products (product_of_canada, made_in_canada, made_in_canada_imported) or country code</li>
          </ul>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Note: Product tags must be a valid JSON string. The system will automatically add creation date, user information, and version control fields.
        </Typography>
      </Box>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="outlined" onClick={downloadTemplate}>
          Download Template
        </Button>
        <input
          accept=".csv"
          style={{ display: 'none' }}
          id="import-button"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="import-button">
          <Button variant="contained" component="span">
            Upload CSV
          </Button>
        </label>
      </div>
    </div>
  );
}
