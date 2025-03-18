import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import AddBoxIcon from '@mui/icons-material/AddBox';

interface InstallInstructionsProps {
  open: boolean;
  onClose: () => void;
}

export function InstallInstructions({ open, onClose }: InstallInstructionsProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Install App on iOS</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            To install this app on your iOS device:
          </Typography>
          <Box sx={{ pl: 2, mt: 2 }}>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              1. Tap the Share button <ShareIcon sx={{ mx: 1 }} /> in Safari
            </Typography>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              2. Scroll down and tap "Add to Home Screen" <AddBoxIcon sx={{ mx: 1 }} />
            </Typography>
            <Typography variant="body1">
              3. Tap "Add" in the top right corner
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Note: This app must be installed from Safari browser on iOS devices.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
