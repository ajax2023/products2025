import React from "react";
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent,
  CardHeader,
  Icon
} from "@mui/material";
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupsIcon from '@mui/icons-material/Groups';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SecurityIcon from '@mui/icons-material/Security';

const features = [
  {
    title: "Product Management",
    description: "Efficiently manage your product catalog with easy-to-use forms. Add, edit, and organize products with detailed information and specifications.",
    icon: <InventoryIcon fontSize="large" color="primary" />
  },
  {
    title: "Company & Brand Management",
    description: "Keep track of companies and brands in your ecosystem. Manage relationships between products, companies, and brands seamlessly.",
    icon: <StorefrontIcon fontSize="large" color="primary" />
  },
  {
    title: "User Management",
    description: "Comprehensive user management system with role-based access control. Administrators can manage user permissions and access levels.",
    icon: <GroupsIcon fontSize="large" color="primary" />
  },
  {
    title: "Receipt Management",
    description: "Track and manage receipts efficiently. Upload, categorize, and maintain a detailed history of all transactions.",
    icon: <ReceiptLongIcon fontSize="large" color="primary" />
  },
  {
    title: "Analytics & Insights",
    description: "Get valuable insights into your product performance with built-in analytics. Track trends and make data-driven decisions.",
    icon: <BarChartIcon fontSize="large" color="primary" />
  },
  {
    title: "Secure Authentication",
    description: "Enterprise-grade security with Firebase authentication. Keep your data safe with robust user authentication and authorization.",
    icon: <SecurityIcon fontSize="large" color="primary" />
  }
];

export default function Features() {
  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto" }}>
      <Paper elevation={3} sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <Typography variant="h3" textAlign="center" color="primary" gutterBottom>
          Features
        </Typography>

        <Typography variant="h6" textAlign="center" sx={{ mb: 4, color: "text.secondary" }}>
          A comprehensive suite of tools for modern product management
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
