import { useState } from 'react';
import { Button, Alert } from '@mui/material';
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
    const header = 'name,brand,category,company_id,origin_country,origin_state,origin_city,origin_manufacturer,origin_facility_id,attributes\n';
    const sampleData = [
      'Apple,Farm Fresh,Food & Beverage,101,Canada,Ontario,Toronto,Ontario Fruit Growers,ON123,"{""organic"":true,""type"":""Gala""}"',
      'Ground Beef,Daily Farms,Food & Beverage,102,Canada,Alberta,Edmonton,Alberta Fresh LLC,AB789,"{""grade"":""AAA"",""weight_kg"":1}"',
      'Milk,Pure Dairy,Food & Beverage,104,Canada,British Columbia,Vancouver,BC Dairy Ltd,BC456,"{""fat_content"":""3.25"",""pasteurized"":true}"'
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
              if (!row.name || !row.category || !row.company_id) {
                console.error('Missing required fields:', row);
                continue;
              }

              const docRef = doc(productsRef);
              let attributes = {};
              
              try {
                // Remove any extra quotes around the JSON string
                const cleanJson = row.attributes.replace(/^["']|["']$/g, '');
                attributes = JSON.parse(cleanJson);
              } catch (jsonError) {
                console.error('Error parsing attributes JSON:', row.attributes, jsonError);
                setError('Error parsing attributes JSON. Make sure it is valid JSON.');
                return;
              }

              // Stagger creation dates by 1 second each
              const now = new Date();
              const createdAt = new Date(now.getTime() + (index * 1000));

              const product: Partial<Product> = {
                name: row.name,
                brand: row.brand,
                category: row.category as ProductCategory,
                company_id: row.company_id,
                origin: {
                  country: row.origin_country,
                  state: row.origin_state || '',
                  city: row.origin_city || '',
                  manufacturer: row.origin_manufacturer,
                  facility_id: row.origin_facility_id
                },
                attributes,
                created_at: createdAt.toISOString(),
                modified_at: createdAt.toISOString(),
                created_by: auth.currentUser?.uid || '',
                created_by_name: auth.currentUser?.displayName || auth.currentUser?.email || '',
                modified_by: auth.currentUser?.uid || '',
                modified_by_name: auth.currentUser?.displayName || auth.currentUser?.email || '',
                prices: [],
                status: 'active',
                is_active: true
              };

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
