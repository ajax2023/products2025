import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
}));

const TermsOfUse: React.FC = () => {
  const [isReading, setIsReading] = useState(false);

  const readTermsAloud = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = document.body.textContent || '';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsReading(true);
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopReading = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    }
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <StyledPaper elevation={3}>
          <Typography variant="h5" component="h1" gutterBottom align="center" color="primary">
            Terms of Use
            <Tooltip title={isReading ? "Stop Reading" : "Read Terms Aloud"}>
              <IconButton 
                onClick={isReading ? stopReading : readTermsAloud}
                color={isReading ? "secondary" : "primary"}
                sx={{ ml: 2 }}
              >
                <VolumeUpIcon />
              </IconButton>
            </Tooltip>
          </Typography>

          <Typography variant="body1" paragraph align="center" color="text.secondary">
            Last Updated: Feb 26/2025
          </Typography>

          <Grid container spacing={4} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    1. General Information
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Website Name:</strong> Canada2025.com
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Owner:</strong> Allen Alexander Jacques, 15252334 Canada Limited
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Address:</strong> 2299 10th Line Road, Carleton Place, Ontario, Canada K7C 0C4
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Contact Email:</strong> admin@canada2025.com
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Canada2025.com is open to <strong>all users</strong>, but some products and brands are only viewable by registered users.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Account Registration:</strong> Not required for browsing, but necessary for access to certain features.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    2. User Responsibilities
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Users <strong>may</strong>:
                  </Typography>
                    Search for Canadian-made products and brands.<br />
                    Favorite and share product information.<br />
                    Contribute product data (subject to approval).<br /><br />
                  
                  <Typography variant="body1" paragraph>
                    Users <strong>may NOT</strong>:
                  </Typography>
                  
                  Submit false, misleading, or spam content.<br />
                  Scrape, copy, or reuse the database or website content.<br />
                  Attempt to disrupt, hack, or manipulate the website.<br />
                  Promote non-Canadian products or services.<br /><br />
                  
                  <Typography variant="body1" paragraph>
                    <strong>User-Submitted Content:</strong> Any product information submitted is <strong>subject to verification</strong> before being published. 
                    <br />Canada2025.com <strong>owns all verified data</strong> added to the platform.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    3. Privacy & Security
                  </Typography>
                  <Typography variant="body1" paragraph>
                    By using this site, you agree to the <strong>Privacy Policy</strong>.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Authentication:</strong> We use Google Firebase Authentication for account management.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Users are responsible for maintaining the security of their account credentials.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    4. Limitation of Liability
                  </Typography>
                  <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', color: 'red' }}>
                    🚨 Canada2025.com is NOT responsible for incorrect or misleading product information.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Users should verify product origins before purchasing.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    We do not guarantee the accuracy, completeness, or reliability of listings.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    A user comment system will be added to provide feedback on product information.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    5. Intellectual Property
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>All content, product data, and database entries are owned by Canada2025.com.</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Users <strong>CANNOT</strong> scrape, copy, or republish data in any form.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Sharing links to promote Canadian products is encouraged.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Misuse of our data will result in account suspension or legal action.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    6. Changes & Termination
                  </Typography>
                  <Typography variant="body1" paragraph>
                    We <strong>reserve the right to change these Terms at any time</strong>. Continued use of the website means acceptance of the changes.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    We <strong>may suspend or terminate accounts</strong> that violate these Terms, especially in cases of disruptive behavior or external interference.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary">
                    7. Contact Information
                  </Typography>
                  <Typography variant="body1" paragraph>
                    For any legal or general inquiries, contact:
                  </Typography>
                  <Typography variant="body1" paragraph>
                    📧 <strong>Email:</strong> admin@canada2025.com
                  </Typography>
                  <Typography variant="body1" paragraph>
                    📍 <strong>Address:</strong>  
                    Allen Alexander Jacques  
                    15252334 Canada Limited  
                    2299 10th Line Road  
                    Carleton Place, Ontario  
                    Canada K7C 0C4
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default TermsOfUse;
