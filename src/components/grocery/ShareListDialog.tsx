import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { GroceryList } from '../../config/groceryDb';
import { shareList, stopSharing, leaveSharedList } from '../../services/sharedListService';
import { useAuth } from '../../auth/useAuth';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

interface ShareListDialogProps {
  open: boolean;
  onClose: () => void;
  list: GroceryList;
  onListUpdated: (updatedList: GroceryList) => void;
}

export const ShareListDialog: React.FC<ShareListDialogProps> = ({
  open,
  onClose,
  list,
  onListUpdated
}) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [emailsToShare, setEmailsToShare] = useState<string[]>(list.sharedWith || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      setEmailsToShare(list.sharedWith || []);
      setEmail('');
      setError('');
      setSuccess('');
    }
  }, [open, list]);

  useEffect(() => {
    if (user && list) {
      console.log('List ownership check:', {
        listUserId: list.userId,
        currentUserId: user.uid,
        isOwner: list.userId === user.uid
      });
    }
  }, [list, user]);

  const isOwner = list.userId === user?.uid;

  const handleAddEmail = () => {
    if (!email) return;
    
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (emailsToShare.includes(email)) {
      setError('This email is already in the list');
      return;
    }
    
    setEmailsToShare([...emailsToShare, email]);
    setEmail('');
    setError('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmailsToShare(emailsToShare.filter(e => e !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleShare = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const updatedList = await shareList(list, emailsToShare);
      onListUpdated(updatedList);
      setSuccess('List shared successfully!');
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error sharing list:', err);
      setError(err.message || 'Failed to share list. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopSharing = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // If user is the owner, stop sharing, otherwise leave the list
      let updatedList;
      if (isOwner) {
        updatedList = await stopSharing(list);
        setSuccess('Sharing stopped successfully!');
      } else {
        updatedList = await leaveSharedList(list);
        setSuccess('You have left the shared list!');
      }
      
      onListUpdated(updatedList);
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error stopping sharing:', err);
      setError(err.message || 'Failed to stop sharing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Share Grocery List: {list.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Share this grocery list with others via their email addresses.
            They will be able to view and edit the items in real-time.
          </Typography>
          
          <Box sx={{ display: 'flex', mt: 2 }}>
            <TextField
              label="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              fullWidth
              placeholder="Enter email address to share with"
              error={!!error}
              disabled={isSubmitting}
            />
            <Button 
              onClick={handleAddEmail}
              variant="contained"
              sx={{ ml: 1 }}
              disabled={!email || isSubmitting}
              startIcon={<PersonAddIcon />}
            >
              Add
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              People with access ({emailsToShare.length}):
            </Typography>
            
            {emailsToShare.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No one has access yet. Add email addresses above.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {emailsToShare.map((e) => (
                  <Chip
                    key={e}
                    label={e}
                    onDelete={() => handleRemoveEmail(e)}
                    color="primary"
                    variant="outlined"
                    disabled={isSubmitting}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        {list.isShared && (
          <Button 
            onClick={handleStopSharing} 
            color="error" 
            sx={{ mr: 'auto' }}
            startIcon={isOwner ? <PersonRemoveIcon /> : null}
            disabled={isSubmitting}
          >
            {isOwner ? 'Stop Sharing' : 'Leave List'}
          </Button>
        )}
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleShare} 
          variant="contained"
          color="primary"
          disabled={emailsToShare.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Sharing...
            </>
          ) : (
            'Share'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
