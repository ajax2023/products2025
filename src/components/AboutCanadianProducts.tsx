import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
} from '@mui/material';

export default function AboutCanadianProducts() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <Typography variant="h5" component="h1" color="primary" align="center" gutterBottom>
        About Canadian Products
      </Typography>
      
      {/* App Made in Canada */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        my: 4 
      }}>
        <img 
          src="/2.png" 
          alt="Canada Flag" 
          style={{ 
            width: '200px', 
            height: 'auto' 
          }} 
        />
      </Box>
      
      <Typography variant="h6" align="center" gutterBottom>
        This application is proudly made in Canada
      </Typography>
      
      <Typography variant="body1" align="center" sx={{ mb: 4 }}>
        Designed and developed to help Canadians discover and support local products and businesses.
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: 4,
        justifyContent: 'center',
        mb: 4
      }}>
        {/* Product of Canada */}
        <Paper
          elevation={3}
          sx={{
            bgcolor: 'success.light',
            color: 'success.dark',
            p: 2,
            borderLeft: '5px solid',
            borderColor: 'success.main',
            borderRadius: 2,
            flex: 1,
            maxWidth: { xs: '100%', md: '45%' }
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 2
          }}>
            <img 
              src="/Product_of_Canada.png" 
              alt="Product of Canada" 
              style={{ 
                width: '80px', 
                height: 'auto',
                marginRight: '16px'
              }} 
            />
            <Typography variant="h5" fontWeight="bold">
              Product of Canada
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            When you see a "Product of Canada" label, it means that at least 98% of the ingredients, processing, and labor costs are Canadian.
          </Typography>
          
          <Typography variant="body1">
            These products represent the highest standard of Canadian content and support local farmers, manufacturers, and the Canadian economy.
          </Typography>
        </Paper>

        {/* Made in Canada */}
        <Paper
          elevation={3}
          sx={{
            bgcolor: 'primary.light',
            color: 'primary.dark',
            p: 2,
            borderLeft: '5px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            flex: 1,
            maxWidth: { xs: '100%', md: '45%' }
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 2
          }}>
            <img 
              src="/Made_in_Canada.png" 
              alt="Made in Canada" 
              style={{ 
                width: '80px', 
                height: 'auto',
                marginRight: '16px'
              }} 
            />
            <Typography variant="h5" fontWeight="bold">
              Made in Canada
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            The "Made in Canada" designation indicates that at least 51% of the total direct costs of producing or manufacturing the product occurred in Canada.
          </Typography>
          
          <Typography variant="body1">
            While these products may contain some imported ingredients or components, they still represent significant Canadian contribution and support local jobs.
          </Typography>
        </Paper>
      </Box>
      
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 4, mb: 2 }}>
        By choosing Canadian products, you're supporting local businesses, reducing environmental impact from shipping, and helping strengthen the Canadian economy.
      </Typography>
    </Container>
  );
}
