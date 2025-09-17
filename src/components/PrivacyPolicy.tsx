import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import { styled } from '@mui/system';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import Tooltip from '@mui/material/Tooltip';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
}));

const PrivacyPolicy: React.FC = () => {
  const [isReading, setIsReading] = useState(false);

  const readPrivacyAloud = useCallback(() => {
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
            Privacy Policy
            <Tooltip title={isReading ? "Stop Reading" : "Read Privacy Aloud"}>
              <IconButton 
                onClick={isReading ? stopReading : readPrivacyAloud}
                color={isReading ? "secondary" : "primary"}
                sx={{ 
                  ml: 2,
                  animation: isReading ? 'pulse 1s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.1)', opacity: 0.7 },
                    '100%': { transform: 'scale(1)', opacity: 1 }
                  }
                }}
              >
                <VolumeUpIcon />
              </IconButton>
            </Tooltip>

          </Typography>

          <Typography variant="body1" paragraph align="center" color="text.secondary">
            Last Updated: February 25, 2025
          </Typography>

          <Grid container spacing={4} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    1. Introduction
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Welcome to <strong>Canada2025.com</strong>. Your privacy is important to us.
                    This policy explains how we collect, use, and protect your information when using our app.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    2. Information We Collect
                  </Typography>
                  <Typography variant="body1" paragraph>
                    We only collect the following user data:
                  </Typography>
                  <strong>Email Addresses</strong> (used for account registration)
                  
                  <Typography variant="body1" paragraph>
                    We <strong>do not</strong> collect personal names, addresses, or other identifiable data.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    3. How We Use Your Information
                  </Typography>
                  <Typography variant="body1" paragraph>
                    We use your email address to:
                  </Typography>
                  Provide access to the app and its features.<br />
                  Grow and improve the app for the Buy Canadian movement.<br />
                  Send relevant updates, including future marketing emails (optional).<br />
                  Perform analytics to understand how the app is used.<br />
                  
                  <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', color: 'red' }}>
                    🚨 We do NOT share your data with third parties.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    4. Data Storage & Security
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Your account data is stored securely using <strong>Google Firebase</strong>, which provides built-in security features,
                    including encryption and authentication. Your grocery lists are stored locally on your device using <strong>IndexedDB</strong> and are not transmitted to our servers.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    If you <strong>delete your account</strong>, all associated data, including your email, will be permanently deleted.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    5. Cookies & Tracking
                  </Typography>
                  <Typography variant="body1" paragraph>
                    We do <strong>not</strong> use traditional cookies, but our app relies on:
                  </Typography>
                  <strong>Local Storage</strong> for user preferences and settings.<br />
                  <strong>IndexedDB</strong> (via Firebase) for offline persistence.<br />
                  <strong>Firebase Analytics</strong> (which may use cookies or local storage for tracking purposes).<br />
                  
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    6. Your Rights & Control Over Data
                  </Typography>
                  <Typography variant="body1" paragraph>
                    You have the right to:
                  </Typography>
                  Request deletion of your data by deleting your account.<br />
                  Contact us for any privacy concerns.<br />
                  <br />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card elevation={6}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    7. Contact Us
                  </Typography>
                  <Typography variant="body1" paragraph>
                    If you have any questions about this Privacy Policy, you can contact us via
                    <strong> [Insert Email or Contact Form Link]</strong>.
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

export default PrivacyPolicy;
