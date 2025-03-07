import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  TextField, 
  Paper, 
  CircularProgress, 
  Alert, 
  AlertTitle,
  Divider
} from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../../firebaseConfig';
import DirectEmailTest from './DirectEmailTest';

/**
 * Component for testing email functionality
 */
const EmailTester: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestWelcomeEmail = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID to test');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const functions = getFunctions(app);
      const testWelcomeEmail = httpsCallable(functions, 'testWelcomeEmail');
      
      console.log(`Testing welcome email for user: ${userId}`);
      const response = await testWelcomeEmail({ userId: userId.trim() });
      
      console.log('Test email response:', response.data);
      setResult(response.data as any);
    } catch (err) {
      console.error('Error testing welcome email:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Email Testing Tools
      </Typography>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Welcome Email
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <TextField
            label="User ID"
            variant="outlined"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter the user ID to send a test email to"
            fullWidth
            sx={{ mr: 2 }}
            required
          />
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleTestWelcomeEmail}
            disabled={loading || !userId.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Test Email'}
          </Button>
        </Box>
        
        {result && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle>Success</AlertTitle>
            {result.message || 'Email test completed successfully'}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Add the direct email test component */}
      <DirectEmailTest />
      
      <Typography variant="body2" color="text.secondary">
        This will trigger the Cloud Function to send a welcome email to the specified user.
        Check the Firebase Functions logs for detailed information about the email sending process.
      </Typography>
    </Paper>
  );
};

export default EmailTester;
