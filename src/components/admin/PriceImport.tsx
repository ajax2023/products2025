import { useState, useEffect } from 'react';
import { Button, Alert, Box, Typography } from '@mui/material';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Papa from 'papaparse';
import { ProductPrice, PRODUCT_UNITS, Product } from '../../types/product';

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
    const header = 'product_name,brand,amount,unit,store,country,state,city,notes,sales_link,price_tags\n';
    const sampleData = [
      'iPhone 15,Apple,999.99,each,Best Buy - 123 Main St,Canada,Ontario,Toronto,Latest model,https://example.com/iphone15,"{""condition"":""new"",""warranty"":""1 year""}"',
      'iPhone 15,Apple,899.99,each,Walmart - 456 Oak Ave,Canada,Quebec,Montreal,Holiday sale,https://example.com/iphone15-ca,"{""condition"":""new"",""promotion"":""holiday""}"',
      'Galaxy S24,Samsung,899.99,each,Target - 789 Pine Rd,Canada,British Columbia,Vancouver,New release,https://example.com/s24,"{""condition"":""new"",""preorder"":""yes""}"'
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
              if (!row.product_name || !row.brand || !row.amount || !row.unit || !row.country || !row.store) {
                const missing = ['product_name', 'brand', 'amount', 'unit', 'country', 'store']
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

              const price: ProductPrice = {
                amount: parseFloat(row.amount),
                unit: row.unit as typeof PRODUCT_UNITS[number],
                store: row.store,
                location: {
                  country: row.country,
                  state: row.state || '',
                  city: row.city || ''
                },
                date: new Date().toISOString(),
                notes: row.notes || '',
                sales_link: row.sales_link || '',
                created_by: auth.currentUser?.uid || '',
                created_by_email: auth.currentUser?.email || '',
                created_by_name: auth.currentUser?.displayName || auth.currentUser?.email || '',
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
        <Typography variant="body1" gutterBottom>
          Import prices using a CSV file with the following columns:
        </Typography>
        <Typography component="ul" sx={{ pl: 2 }}>
          <li><strong>product_name</strong> (required): Exact product name</li>
          <li><strong>brand</strong> (required): Exact brand name</li>
          <li><strong>amount</strong> (required): The price amount (numeric)</li>
          <li><strong>unit</strong> (required): Unit (e.g., 'each', 'kg')</li>
          <li><strong>store</strong> (required): Store name and address (e.g., 'Walmart - 123 Main St')</li>
          <li><strong>country</strong> (required): Country where price applies</li>
          <li><strong>state</strong> (optional): State</li>
          <li><strong>city</strong> (optional): City</li>
          <li><strong>notes</strong> (optional): Additional notes</li>
          <li><strong>sales_link</strong> (optional): URL to the product</li>
          <li><strong>price_tags</strong> (optional): JSON string of price tags (e.g., {'"{"condition": "new", "warranty": "1 year"}"'})</li>
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
