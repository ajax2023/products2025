import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Update } from '../types/update';
import { addUpdate, updateExistingUpdate, deleteUpdate } from '../services/updateService';

interface UpdateManagerProps {
  open: boolean;
  onClose: () => void;
  update: Update | null;
  userId: string;
  onUpdateSaved: () => void;
}

export default function UpdateManager({ open, onClose, update, userId, onUpdateSaved }: UpdateManagerProps) {
  const [title, setTitle] = useState(update?.title || '');
  const [content, setContent] = useState(update?.content || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditing = Boolean(update);
  
  // Update form values when the update prop changes
  useEffect(() => {
    if (update) {
      setTitle(update.title || '');
      setContent(update.content || '');
    } else {
      setTitle('');
      setContent('');
    }
    setError(null);
  }, [update]);
  
  const resetForm = () => {
    setTitle(update?.title || '');
    setContent(update?.content || '');
    setError(null);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isEditing && update) {
        // Update existing update
        await updateExistingUpdate(update.id, {
          title,
          content,
        });
      } else {
        // Add new update
        await addUpdate({
          title,
          content,
          createdBy: userId,
        }, userId);
      }
      
      onUpdateSaved();
      handleClose();
    } catch (err) {
      console.error('Error saving update:', err);
      setError('Failed to save update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!isEditing || !update) return;
    
    if (!window.confirm('Are you sure you want to delete this update?')) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await deleteUpdate(update.id);
      onUpdateSaved();
      handleClose();
    } catch (err) {
      console.error('Error deleting update:', err);
      setError('Failed to delete update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isEditing ? 'Edit Update' : 'Add New Update'}
          </Typography>
          <IconButton edge="end" onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          label="Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="Content"
          multiline
          rows={20}
          fullWidth
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          placeholder="Enter the update content here..."
          helperText={
            <Typography variant="caption">
              You can use Markdown formatting: 
              **bold text**, *italic text*, [link](url), 
              # Heading, ## Subheading, 
              - bullet points, 1. numbered lists
            </Typography>
          }
        />
      </DialogContent>
      
      <DialogActions>
        {isEditing && (
          <Button 
            onClick={handleDelete} 
            color="error" 
            disabled={isSubmitting}
            sx={{ mr: 'auto' }}
          >
            Delete
          </Button>
        )}
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
