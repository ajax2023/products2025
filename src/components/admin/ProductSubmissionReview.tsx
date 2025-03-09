import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Snackbar,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { 
  getPendingSubmissions, 
  approveSubmission, 
  rejectSubmission,
  getSubmissionById
} from '../../services/productSubmissionService';
import { ProductSubmission } from '../../types/productSubmission';
import { useAuth } from '../../auth/useAuth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`submission-tabpanel-${index}`}
      aria-labelledby={`submission-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProductSubmissionReview: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ProductSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ProductSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getPendingSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load submissions',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: ProductSubmission) => {
    if (!user) return;
    
    setActionLoading(true);
    try {
      await approveSubmission(submission.id, user.uid);
      setSubmissions(prev => prev.filter(s => s.id !== submission.id));
      setSnackbar({
        open: true,
        message: 'Product approved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error approving submission:', error);
      setSnackbar({
        open: true,
        message: 'Failed to approve product',
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectDialog = (submission: ProductSubmission) => {
    setSelectedSubmission(submission);
    setRejectionReason('');
    setAdminNotes('');
    setOpenRejectDialog(true);
  };

  const handleCloseRejectDialog = () => {
    setOpenRejectDialog(false);
    setSelectedSubmission(null);
  };

  const handleReject = async () => {
    if (!user || !selectedSubmission) return;
    
    if (!rejectionReason) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for rejection',
        severity: 'error'
      });
      return;
    }
    
    setActionLoading(true);
    try {
      await rejectSubmission(
        selectedSubmission.id, 
        user.uid, 
        rejectionReason, 
        adminNotes || undefined
      );
      setSubmissions(prev => prev.filter(s => s.id !== selectedSubmission.id));
      setSnackbar({
        open: true,
        message: 'Product rejected successfully',
        severity: 'success'
      });
      handleCloseRejectDialog();
    } catch (error) {
      console.error('Error rejecting submission:', error);
      setSnackbar({
        open: true,
        message: 'Failed to reject product',
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return 'Invalid date';
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Product Submissions Review
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="submission tabs">
          <Tab label={`Pending (${submissions.length})`} />
          <Tab label="Approved" disabled />
          <Tab label="Rejected" disabled />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : submissions.length === 0 ? (
          <Typography variant="body1" align="center" sx={{ p: 4 }}>
            No pending submissions to review
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {submissions.map((submission) => (
              <Grid item xs={12} key={submission.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">
                        {submission.brandName} - {submission.productName}
                      </Typography>
                      <Chip 
                        label={submission.status.toUpperCase()} 
                        color="warning" 
                        size="small" 
                      />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Description:</strong> {submission.description}
                        </Typography>
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Category:</strong> {submission.category}
                            {submission.subCategory && ` > ${submission.subCategory}`}
                          </Typography>
                          
                          <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                            <Chip 
                              label="Canadian Owned" 
                              color={submission.canadianOwned ? "success" : "default"}
                              variant={submission.canadianOwned ? "filled" : "outlined"}
                              size="small"
                            />
                            <Chip 
                              label="Made in Canada" 
                              color={submission.canadianMade ? "success" : "default"}
                              variant={submission.canadianMade ? "filled" : "outlined"}
                              size="small"
                            />
                          </Box>
                        </Box>
                        
                        {submission.website && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Website:</strong> {submission.website}
                          </Typography>
                        )}
                        
                        {(submission.locationHeadquarters || submission.locationManufactured) && (
                          <Box sx={{ mt: 1 }}>
                            {submission.locationHeadquarters && (
                              <Typography variant="body2">
                                <strong>HQ:</strong> {submission.locationHeadquarters}
                              </Typography>
                            )}
                            {submission.locationManufactured && (
                              <Typography variant="body2">
                                <strong>Manufacturing:</strong> {submission.locationManufactured}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Submission Details
                          </Typography>
                          <Typography variant="body2">
                            <strong>Submitted by:</strong> {submission.submittedBy}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Date:</strong> {formatDate(submission.submittedAt)}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                    <Button 
                      startIcon={<CancelIcon />}
                      color="error"
                      onClick={() => handleOpenRejectDialog(submission)}
                      disabled={actionLoading}
                    >
                      Reject
                    </Button>
                    <Button 
                      startIcon={<CheckCircleIcon />}
                      variant="contained"
                      color="success"
                      onClick={() => handleApprove(submission)}
                      disabled={actionLoading}
                    >
                      Approve
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      {/* Reject Dialog */}
      <Dialog open={openRejectDialog} onClose={handleCloseRejectDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Product Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Please provide a reason for rejecting this submission. This will be visible to the user who submitted it.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />
          
          <TextField
            margin="dense"
            label="Admin Notes (internal only)"
            fullWidth
            multiline
            rows={2}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>Cancel</Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            variant="contained"
            disabled={actionLoading || !rejectionReason}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Reject Submission'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductSubmissionReview;
