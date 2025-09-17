import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Link,
} from '@mui/material';
import { styled } from '@mui/system';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  textAlign: 'center',
}));

const SupportUs: React.FC = () => {
  // Replace this URL with your actual GoFundMe campaign URL
  const goFundMeUrl = "#"; 

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <StyledPaper elevation={3}>
          <Typography variant="h3" component="h1" gutterBottom color="primary">
            Support Our Project
          </Typography>
          
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
            Help us continue developing and improving our product management platform. 
            Your support enables us to add new features, maintain our infrastructure, 
            and keep our services accessible to businesses of all sizes.
          </Typography>

          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            component={Link}
            href={goFundMeUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 4 }}
          >
            Support Us on GoFundMe
          </Button>

          <Typography variant="body2" color="text.secondary">
            Every contribution, no matter the size, helps us grow and improve our platform.
            Thank you for your support!
          </Typography>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default SupportUs;