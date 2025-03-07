import React, { useState } from 'react';
import { app } from '../../../firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button, TextField, Paper, Typography, Box, Alert } from '@mui/material';

const DirectEmailTest = () => {
  const [email, setEmail] = useState('qcajax@gmail.com');
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | 'none';
    message: string;
    details?: string;
  }>({ type: 'none', message: '' });
  const [loading, setLoading] = useState(false);

  const handleTestEmail = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Sending test email...' });

    try {
      const functions = getFunctions(app);
      const directMailTest = httpsCallable(functions, 'directMailTest');
      const result = await directMailTest({ email });
      
      // TypeScript doesn't know what's in the data, so we need to cast it
      const response = result.data as any;
      
      if (response.success) {
        setStatus({ 
          type: 'success', 
          message: 'Test email sent successfully!' 
        });
      } else {
        setStatus({ 
          type: 'error', 
          message: 'Failed to send test email', 
          details: response.error ? JSON.stringify(response.error, null, 2) : 'No error details available'
        });
      }
    } catch (error: any) {
      console.error('Error testing direct email:', error);
      setStatus({
        type: 'error',
        message: 'Error testing direct email',
        details: error.message || error.toString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Direct SendGrid Email Test
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        This bypasses all complex logic and directly tests the SendGrid integration.
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Test Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          placeholder="Enter email address"
        />
      </Box>
      
      <Button 
        variant="contained" 
        color="primary"
        onClick={handleTestEmail}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Direct Test Email'}
      </Button>
      
      {status.type !== 'none' && (
        <Alert 
          severity={status.type} 
          sx={{ mt: 2 }}
        >
          {status.message}
          {status.details && (
            <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', overflowX: 'auto', fontSize: '0.8rem' }}>
              {status.details}
            </Box>
          )}
        </Alert>
      )}
    </Paper>
  );
};

export default DirectEmailTest;
