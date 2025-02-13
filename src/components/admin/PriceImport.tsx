import { useState, useEffect } from 'react';
import { Button, Alert, Box, Typography } from '@mui/material';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Papa from 'papaparse';
import { Product, Price, PRODUCT_UNITS } from '../../types/product';

interface PriceImportProps {
  onClose?: () => void;
}

export default function PriceImport({ onClose }: PriceImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productList = querySnapshot.docs.map(doc => ({ 
          ...doc.data(), 
          _id: doc.id 
        } as Product));
        setProducts(productList);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to fetch products for template');
      }
    };
    fetchProducts();
  }, []);

  const downloadTemplate = () => {
    const header = 'product_name,brand,amount,unit,name,price_tags\n';
    const sampleData = [
      'iPhone 15,Apple,999.99,each,Base Model 128GB,"{""condition"":""new"",""warranty"":""1 year""}"',
      'iPhone 15,Apple,1099.99,each,Pro Model 256GB,"{""condition"":""new"",""color"":""titanium""}"',
      'Galaxy S24,Samsung,899.99,each,Standard Edition,"{""condition"":""new"",""preorder"":""yes""}"'
    ].join('\n');

    const blob = new Blob([header + sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'price_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const findProduct = (name: string, brand: string) => {
    return products.find(product => 
      product.name === name && 
      product.brand === brand
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const row of results.data as any[]) {
            try {
              // Validate required fields
              if (!row.product_name || !row.brand || !row.amount || !row.unit) {
                const missing = ['product_name', 'brand', 'amount', 'unit']
                  .filter(field => !row[field])
                  .join(', ');
                errors.push(`Row missing required fields: ${missing}`);
                errorCount++;
                continue;
              }

              // Find product by exact name and brand match
              const product = findProduct(row.product_name, row.brand);
              if (!product) {
                errors.push(`Product not found: ${row.product_name} by ${row.brand}`);
                errorCount++;
                continue;
              }

              const price: Price = {
                amount: parseFloat(row.amount),
                unit: row.unit as typeof PRODUCT_UNITS[number],
                name: row.name || undefined,
                price_tags: {}
              };

              // Parse price_tags if present
              try {
                if (row.price_tags) {
                  const cleanJson = row.price_tags.replace(/^["']|["']$/g, '');
                  price.price_tags = JSON.parse(cleanJson);
                }
              } catch (jsonError) {
                console.error('Error parsing price_tags JSON:', row.price_tags, jsonError);
                errors.push(`Error parsing price_tags for ${row.product_name}: Invalid JSON format`);
                continue;
              }

              // Update the product with the new price
              const currentPrices = product.price_history || [];
              await updateDoc(doc(db, 'products', product._id), {
                price_history: [...currentPrices, price],
                updated_at: new Date().toISOString(),
                updated_by: auth.currentUser?.uid || '',
                updated_by_name: auth.currentUser?.displayName || auth.currentUser?.email || ''
              });

              successCount++;
            } catch (rowError) {
              console.error('Error processing row:', row, rowError);
              errors.push(`Error with ${row.product_name}: ${rowError}`);
              errorCount++;
            }
          }
          
          if (successCount > 0) {
            setSuccess(`Successfully imported ${successCount} prices.`);
          }
          if (errorCount > 0) {
            setError(`Failed to import ${errorCount} prices:\n${errors.join('\n')}`);
          }
          
          if (successCount > 0) {
            setTimeout(() => {
              if (onClose) onClose();
              window.location.reload();
            }, 2000);
          }
        } catch (err) {
          console.error('Import error:', err);
          setError('Error importing prices: ' + (err as Error).message);
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
      {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" component="div">
          Required columns:
          <ul>
            <li><strong>product_name</strong>: Product name</li>
            <li><strong>brand</strong>: Brand name</li>
            <li><strong>amount</strong>: The price amount (numeric)</li>
            <li><strong>unit</strong>: Unit (e.g., 'each', 'per kg', 'per case')</li>
          </ul>
          Optional columns:
          <ul>
            <li><strong>name</strong>: Price variant name (e.g., 'Base Model', 'Pro Edition')</li>
            <li><strong>price_tags</strong>: JSON string of price tags (e.g., {'"{"condition": "new", "warranty": "1 year"}"'})</li>
          </ul>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Note: Price tags must be a valid JSON string. The system will automatically add creation date and version control fields.
          </Typography>
        </Typography>
      </Box>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="outlined" onClick={downloadTemplate}>
          Download Template
        </Button>
        <input
          accept=".csv"
          style={{ display: 'none' }}
          id="price-import-button"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="price-import-button">
          <Button variant="contained" component="span">
            Import Price CSV
          </Button>
        </label>
      </div>
    </div>
  );
}
