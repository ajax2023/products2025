import React, { useState } from 'react';
import { 
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, FormControlLabel, Checkbox, Typography, Alert
} from '@mui/material';
import { CanadianProduct } from '../../types/product';

interface ProductApprovalFormProps {
  product: CanadianProduct;
  onApprove: (verifiedData: {
    production_verified: boolean;
    site_verified: boolean;
    site_verified_by: string;
    site_verified_at: string;
  }) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

const ProductApprovalForm: React.FC<ProductApprovalFormProps> = ({ 
  product, onApprove, onReject, onClose 
}) => {
  const [productionVerified, setProductionVerified] = useState(product.production_verified);
  const [siteVerified, setSiteVerified] = useState(product.site_verified);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    onApprove({
      production_verified: productionVerified,
      site_verified: siteVerified,
      site_verified_by: 'admin', // Replace with actual admin user
      site_verified_at: new Date().toISOString()
    });
    onClose();
  };

  const handleReject = () => {
    if (!rejectionReason) {
      setError('Please provide a reason for rejection');
      return;
    }
    onReject(rejectionReason);
    onClose();
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Review Product Submission</DialogTitle>
      <DialogContent>
        <Typography variant="h6" gutterBottom>{product.brand_name}</Typography>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={productionVerified}
                onChange={(e) => setProductionVerified(e.target.checked)}
              />
            }
            label="Production Verified"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={siteVerified}
                onChange={(e) => setSiteVerified(e.target.checked)}
              />
            }
            label="Site Verified"
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" onClick={handleReject}>Reject</Button>
        <Button color="success" onClick={handleApprove}>Approve</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductApprovalForm;
