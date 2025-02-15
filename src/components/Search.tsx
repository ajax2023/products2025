import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  Paper,
  Typography,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface SearchResult {
  name: string;
  description: string;
  category: string;
  website: string | null;
  manufacturer: string;
  origin: {
    madeInCanada: boolean;
    productOfCanada: boolean;
    manufacturingLocation?: string;
  };
  keyFeatures: string[];
}

interface SearchResponse {
  results: SearchResult[];
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const searchProducts = httpsCallable(functions, 'searchProducts');
      const response = await searchProducts({ query: query.trim() });
      const data = response.data as SearchResponse;
      setResults(data.results || []);
    } catch (error: any) {
      console.error('Search error:', error);
      setError(error.message || 'An error occurred while searching');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      pt: 8,
      px: 2
    }}>
      <Paper 
        component="form" 
        onSubmit={handleSearch}
        sx={{ 
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: 600,
          mb: 4
        }}
      >
        <TextField
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Canadian-made products..."
          variant="standard"
          sx={{ ml: 1, flex: 1 }}
          InputProps={{ disableUnderline: true }}
        />
        <IconButton type="submit" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : <SearchIcon />}
        </IconButton>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ width: '100%', maxWidth: 600, mb: 2 }}>
          {error}
        </Alert>
      )}

      {results.length > 0 ? (
        <List sx={{ width: '100%', maxWidth: 600 }}>
          {results.map((result, index) => (
            <ListItem 
              key={index}
              sx={{ 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                mb: 2,
                backgroundColor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1,
                p: 2
              }}
            >
              <Box sx={{ width: '100%', mb: 1 }}>
                <Typography variant="h6" component="div">
                  {result.name}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  by {result.manufacturer}
                </Typography>
                {result.origin?.manufacturingLocation && (
                  <Typography variant="subtitle2" color="success.main">
                    Made in {result.origin.manufacturingLocation}
                  </Typography>
                )}
              </Box>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {result.description}
              </Typography>
              {result.website && (
                <Typography 
                  component="a" 
                  href={result.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="primary"
                  sx={{ 
                    mb: 2,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Visit Website
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip 
                  label={result.category}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  label="Product of Canada"
                  size="small"
                  color="success"
                />
              </Stack>
              <Box>
                {result.keyFeatures.map((feature, idx) => (
                  <Chip
                    key={idx}
                    label={feature}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            </ListItem>
          ))}
        </List>
      ) : query && !loading && !error && (
        <Typography color="textSecondary">
          No Canadian-made products found
        </Typography>
      )}
    </Box>
  );
}
