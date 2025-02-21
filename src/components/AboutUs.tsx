import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import { styled } from '@mui/material/styles';

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
          <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
            About Us
          </Typography>
          
          <Typography variant="h6" paragraph align="center" color="text.secondary">
            We are dedicated to providing a list of products that are made in Canada.
          </Typography>

          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    Our Mission
                  </Typography>
                  <Typography variant="body1" paragraph>
                    To provide businesses with powerful, intuitive tools for managing their products
                    and inventory, enabling them to make data-driven decisions and optimize their operations.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    Our Vision
                  </Typography>
                  <Typography variant="body1" paragraph>
                    To become the leading platform for product management, helping businesses
                    of all sizes streamline their operations and achieve sustainable growth.
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
                  title: 'User-Friendly Interface',
                  description: 'Intuitive design that makes product management effortless',
                },
                {
                  title: 'Advanced Analytics',
                  description: 'Powerful insights to help you make informed decisions',
                },
                {
                  title: 'Reliable Support',
                  description: '24/7 customer support to assist you with any questions',
                },
              ].map((feature, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card sx={{ height: '100%' }}>
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