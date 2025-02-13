import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Box,
  Grid,
  Typography,
} from '@mui/material';
import { countries } from '../../utils/countryData';

interface CountrySelectProps {
  open: boolean;
  onClose: () => void;
  onSelect: (country: string) => void;
}

export default function CountrySelect({ open, onClose, onSelect }: CountrySelectProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredCountries = countries.filter(country =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (country: string) => {
    onSelect(country);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select Country of Origin</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>
        <Grid container spacing={1}>
          {filteredCountries.map((country) => (
            <Grid item xs={3} sm={2} md={1.5} key={country}>
              <Box
                onClick={() => handleSelect(country)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Box
                  component="img"
                  src={`/flags/${country}.png`}
                  alt={country}
                  sx={{
                    width: 32,
                    height: 32,
                    objectFit: 'cover',
                    mb: 0.5
                  }}
                />
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    fontSize: '0.7rem',
                    wordBreak: 'break-word',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {country}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
