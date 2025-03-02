import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField
} from '@mui/material';
import { useAuth } from '../../auth/useAuth';
import { GroceryList } from '../../config/groceryDb';

export interface ShareGroceryDialogProps {
  open: boolean;
  onClose: () => void;
  groceryList: GroceryList;
}

export const ShareGroceryDialog: React.FC<ShareGroceryDialogProps> = ({
  open,
  onClose,
  groceryList,
}) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');

  const handleShare = async () => {
    const sharedBy = user?.displayName || user?.email || 'A user';
    
    // Create a nicely formatted share text
    const itemsText = groceryList.items.length > 0 
      ? `\n\nItems:\n${groceryList.items.map(item => `• ${item.name}${item.checked ? ' ✓' : ''}`).join('\n')}`
      : '\n\nNo items in this list.';

    const commentText = comment 
      ? `\n\nComment from ${sharedBy}:\n${comment}`
      : '';

    const shareText = `Grocery List: ${groceryList.name}${itemsText}${commentText}\n\nShared by: ${sharedBy}`;

    try {
      if (navigator.share) {
        // Try sharing with just text first
        try {
          await navigator.share({
            title: `Grocery List: ${groceryList.name}`,
            text: shareText
          });
        } catch (textError) {
          console.error('Text-only share failed:', textError);
          // If text-only fails, try with data URL
          const encodedText = encodeURIComponent(shareText);
          const dataUrl = `data:text/plain;charset=utf-8,${encodedText}`;
          
          await navigator.share({
            title: `Grocery List: ${groceryList.name}`,
            text: shareText,
            url: dataUrl
          });
        }
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Copied to clipboard!');
      }
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Grocery List: {groceryList.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Share this grocery list with others via text, email, or messaging apps.
          </Typography>
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Items in this list ({groceryList.items.length}):
          </Typography>
          
          <Box sx={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            p: 2,
            mb: 2,
            bgcolor: '#f5f5f5'
          }}>
            {groceryList.items.length > 0 ? (
              groceryList.items.map((item, index) => (
                <Typography key={index} variant="body2" sx={{ 
                  mb: 0.5,
                  textDecoration: item.checked ? 'line-through' : 'none',
                  color: item.checked ? 'text.secondary' : 'text.primary'
                }}>
                  • {item.name}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No items in this list.
              </Typography>
            )}
          </Box>
          
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Add a comment (optional):
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="Add a note about this grocery list..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f5f5f5',
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleShare} variant="contained" color="primary">
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
};
