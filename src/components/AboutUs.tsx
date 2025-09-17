import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { styled } from '@mui/system';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
}));

const AboutUs: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <StyledPaper elevation={3}>
          <Typography variant="h5" component="h1" gutterBottom align="center" color="primary">
              <Link to="/about" style={{ color: "red", fontWeight: "bold" }}>About Us</Link>
          </Typography>
          
          <Typography variant="h6" paragraph align="center" color="text.secondary">
          Supporting Canadian-made products, businesses, and economic independence—because <span style={{ color: "red", fontWeight: "bold" }}>Canada is NOT for sale!</span>
          </Typography>

          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    Our Mission
                  </Typography>
                  <Typography variant="body1" paragraph>
                    This app was created in response to U.S. tariffs and the increasing difficulty of finding 
                    truly Canadian-made products. Our mission is to help Canadians make informed choices that 
                    support **local businesses, jobs, and economic strength.**
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    Our Vision
                  </Typography>
                  <Typography variant="body1" paragraph>
                    We believe in a strong and independent Canada. This platform is just the beginning—our future plans include:<br />
                    ✅ **Vendor Deals & Promotions**   <br />
                    ✅ **Shopping Cart Features**   <br />
                    ✅ **Community Contributions**   
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" gutterBottom align="center" color="primary">
              Why Choose Us?
            </Typography>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {[  
                {
                  title: 'Find Verified Canadian Products',
                  description: 'Easily search and browse Canadian-made products from trusted brands.',
                },
                {
                  title: 'Support Local Businesses',
                  description: 'Every product you choose helps create jobs and strengthen Canada’s economy.',
                },
                {
                  title: 'Easily Discover & Share',
                  description: 'Spread awareness and help others buy Canadian with built-in sharing tools.',
                },
              ].map((feature, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card sx={{ height: '100%' }} elevation={6}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
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
          </Box>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default AboutUs;
