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
import { collection, addDoc } from 'firebase/firestore';
import { Product } from '../types/product';

interface ProductImportProps {
  onClose: () => void;
}

const ProductImport: React.FC<ProductImportProps> = ({ onClose }) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState('');

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);

      // Parse the JSON data
      const products: Product[] = JSON.parse(jsonData);

      // Validate the data structure
      if (!Array.isArray(products)) {
        throw new Error('Invalid data format. Expected an array of products.');
      }

      // Import each product
      const productsRef = collection(db, 'products');
      for (const product of products) {
        await addDoc(productsRef, product);
      }

      // Close the dialog
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="body1" gutterBottom>
        Paste your JSON data below. The data should be an array of product objects.
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

export default ProductImport;
