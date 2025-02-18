import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Product, ProductPrice } from '../types/product';

interface PriceImportProps {
  onClose: () => void;
}

interface PriceImportData {
  productId: string;
  prices: ProductPrice[];
}

const PriceImport: React.FC<PriceImportProps> = ({ onClose }) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState('');

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);

      // Parse the JSON data
      const priceData: PriceImportData[] = JSON.parse(jsonData);

      // Validate the data structure
      if (!Array.isArray(priceData)) {
        throw new Error('Invalid data format. Expected an array of price data.');
      }

      // Import prices for each product
      const productsRef = collection(db, 'products');
      
      for (const item of priceData) {
        const { productId, prices } = item;
        
        // Find the product
        const productQuery = query(productsRef, where("id", "==", productId));
        const productDocs = await getDocs(productQuery);
        
        if (productDocs.empty) {
          console.warn(`Product with ID ${productId} not found`);
          continue;
        }

        // Update the product's prices
        const productDoc = productDocs.docs[0];
        await updateDoc(productDoc.ref, {
          prices: prices
        });
      }

      // Close the dialog
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import prices');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="body1" gutterBottom>
        Paste your JSON data below. The data should be an array of objects containing productId and prices.
      </Typography>
      
      <TextField
        multiline
        rows={10}
        fullWidth
        value={jsonData}
        onChange={(e) => setJsonData(e.target.value)}
        placeholder="Paste JSON data here..."
        variant="outlined"
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!jsonData.trim() || importing}
        >
          {importing ? <CircularProgress size={24} /> : 'Import'}
        </Button>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default PriceImport;
