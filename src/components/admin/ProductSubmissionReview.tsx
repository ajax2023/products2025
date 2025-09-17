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
  rejectProductSubmission
} from '../../services/productSubmissionService';
import { ProductSubmission } from '../../types/productSubmission';
import { useAuth } from '../../auth/useAuth';
import { MASTER_CATEGORIES } from '../../types/product';

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
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalOptions, setApprovalOptions] = useState({
    isPubliclyVisible: true,
    site_verified: false,
    production_verified: false,
    is_active: true,
    masterCategory: ''
  });
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

  const handleApprove = async () => {
    if (!user || !selectedSubmission) return;
    
    setActionLoading(true);
    try {
      await approveSubmission(
        selectedSubmission.id, 
        user.uid,
        {
          isPubliclyVisible: approvalOptions.isPubliclyVisible,
          site_verified: approvalOptions.site_verified,
          production_verified: approvalOptions.production_verified,
          is_active: approvalOptions.is_active,
          masterCategory: approvalOptions.masterCategory || null
        }
      );
      setSubmissions(prev => prev.filter(s => s.id !== selectedSubmission.id));
      setSnackbar({
        open: true,
        message: 'Product approved successfully',
        severity: 'success'
      });
      setOpenApproveDialog(false);
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

  const handleOpenApproveDialog = (submission: ProductSubmission) => {
    setSelectedSubmission(submission);
    setApprovalOptions({
      isPubliclyVisible: submission.isPubliclyVisible !== undefined ? submission.isPubliclyVisible : true,
      site_verified: submission.site_verified !== undefined ? submission.site_verified : false,
      production_verified: submission.production_verified !== undefined ? submission.production_verified : false,
      is_active: submission.is_active !== undefined ? submission.is_active : true,
      masterCategory: submission.masterCategory || ''
    });
    setOpenApproveDialog(true);
  };

  const handleCloseApproveDialog = () => {
    setOpenApproveDialog(false);
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
      await rejectProductSubmission(
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
                        {submission.brand_name} {submission.products && submission.products.length > 0 && `- ${submission.products.join(', ')}`}
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
                          <strong>Notes:</strong> {submission.notes || 'No description provided'}
                        </Typography>
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Categories:</strong> {submission.categories && submission.categories.join(', ')}
                            {submission.masterCategory && ` > ${submission.masterCategory}`}
                          </Typography>
                          
                          <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                            {submission.cdn_prod_tags && submission.cdn_prod_tags.map((tag, index) => (
                              <Chip 
                                key={index}
                                label={tag} 
                                color="primary"
                                size="small"
                              />
                            ))}
                          </Box>
                        </Box>
                        
                        {submission.website && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Website:</strong> {submission.website}
                          </Typography>
                        )}
                        
                        {(submission.city || submission.province) && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>Location:</strong> {[submission.city, submission.province, submission.country].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Submission Details
                          </Typography>
                          <Typography variant="body2">
                            <strong>Submitted by:</strong> {submission.added_by_name || submission.submittedBy || 'Unknown'}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Email:</strong> {submission.added_by_email || 'Not provided'}
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
                      variant="contained" 
                      color="primary" 
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleOpenApproveDialog(submission)}
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
      
      {/* Approval Dialog */}
      <Dialog open={openApproveDialog} onClose={handleCloseApproveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Product Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You are about to approve this product submission. Please set the following options:
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Public Visibility</Typography>
                <Button 
                  variant={approvalOptions.isPubliclyVisible ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, isPubliclyVisible: true }))}
                  sx={{ mr: 1, mt: 1 }}
                >
                  Visible
                </Button>
                <Button 
                  variant={!approvalOptions.isPubliclyVisible ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, isPubliclyVisible: false }))}
                  sx={{ mt: 1 }}
                >
                  Hidden
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Site Verification</Typography>
                <Button 
                  variant={approvalOptions.site_verified ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, site_verified: true }))}
                  sx={{ mr: 1, mt: 1 }}
                >
                  Verified
                </Button>
                <Button 
                  variant={!approvalOptions.site_verified ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, site_verified: false }))}
                  sx={{ mt: 1 }}
                >
                  Not Verified
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Production Verification</Typography>
                <Button 
                  variant={approvalOptions.production_verified ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, production_verified: true }))}
                  sx={{ mr: 1, mt: 1 }}
                >
                  Verified
                </Button>
                <Button 
                  variant={!approvalOptions.production_verified ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, production_verified: false }))}
                  sx={{ mt: 1 }}
                >
                  Not Verified
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Status</Typography>
                <Button 
                  variant={approvalOptions.is_active ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, is_active: true }))}
                  sx={{ mr: 1, mt: 1 }}
                >
                  Active
                </Button>
                <Button 
                  variant={!approvalOptions.is_active ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => setApprovalOptions(prev => ({ ...prev, is_active: false }))}
                  sx={{ mt: 1 }}
                >
                  Inactive
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Master Category</Typography>
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {MASTER_CATEGORIES.map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      onClick={() => setApprovalOptions(prev => ({ ...prev, masterCategory: category }))}
                      color={approvalOptions.masterCategory === category ? "primary" : "default"}
                      variant={approvalOptions.masterCategory === category ? "filled" : "outlined"}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApproveDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            variant="contained" 
            color="primary" 
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            Approve
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
