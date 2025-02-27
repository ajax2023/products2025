import React from "react";
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

const sections = [
  {
    title: "Why This App Exists",
    description: "This app was created in response to U.S. tariffs, helping Canadians discover and support Canadian-made products. It empowers consumers to make informed choices that strengthen the Canadian economy."
  },
  {
    title: "What You Can Do",
    description: "Search for Canadian-made products and brands, favorite brands you want to support, share products with others, and support Canadian businesses by making informed purchases."
  },
  {
    title: "Why Buy Canadian?",
    description: "Supporting local jobs, strengthening the economy, and ensuring high-quality, regulated products."
  },
  {
    title: "Future Features",
    description: "Coming soon: Vendor deals, a shopping cart feature, and community contributions."
  }
];

const features = [
  {
    title: "Search for Canadian Products",
    description: "Easily find and browse Canadian-made products from various brands.",
    icon: <SearchIcon fontSize="large" color="primary" />
  },
  {
    title: "Favorite Brands",
    description: "Save and track your favorite Canadian brands for quick access.",
    icon: <FavoriteIcon fontSize="large" color="primary" />
  },
  {
    title: "Share with Others",
    description: "Spread awareness by sharing Canadian-made products with your network.",
    icon: <ShareIcon fontSize="large" color="primary" />
  },
  {
    title: "Future: Vendor Deals",
    description: "Vendors will soon be able to list exclusive promotions and discounts.",
    icon: <LocalOfferIcon fontSize="large" color="primary" />
  },
  {
    title: "Future: Shopping Cart",
    description: "A shopping cart feature is in development to help you with your shopping experience.",
    icon: <ShoppingCartIcon fontSize="large" color="primary" />
  }
];

export default function AboutThisApp() {
  return (
    <Box sx={{ p: 2, maxWidth: 1200, margin: "0 auto" }}>
      <Paper elevation={3} sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        
        <Typography variant="h4" textAlign="center" color="primary" gutterBottom>
          About This App
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {sections.map((section, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ height: "100%", p: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {section.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h5" textAlign="center" color="primary" gutterBottom>
          Features
        </Typography>

        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ 
                height: "100%", 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}>
                <CardContent sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center'
                }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
