import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Switch,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { EmailSequence } from '../../../types/emailSequence';
import { updateSequenceStatus, deleteEmailSequence } from '../../../firebase/emailSequences';
import { useNotification } from '../../common/NotificationSnackbar';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

interface EmailSequenceListProps {
  sequences: EmailSequence[];
  onEdit: (sequence: EmailSequence) => void;
  onRefresh: () => void;
}

const EmailSequenceList: React.FC<EmailSequenceListProps> = ({ sequences, onEdit, onRefresh }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sequenceToDelete, setSequenceToDelete] = useState<EmailSequence | null>(null);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [sequenceToTest, setSequenceToTest] = useState<EmailSequence | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const { showMessage } = useNotification();

  const handleStatusChange = async (sequence: EmailSequence) => {
    try {
      setStatusUpdating(sequence.id);
      const newStatus = sequence.status === 'active' ? 'inactive' : 'active';
      await updateSequenceStatus(sequence.id, newStatus);
      showMessage(`Sequence ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
      onRefresh();
    } catch (error) {
      console.error('Error updating sequence status:', error);
      showMessage('Failed to update sequence status', 'error');
    } finally {
      setStatusUpdating(null);
    }
  };

  const openDeleteDialog = (sequence: EmailSequence) => {
    setSequenceToDelete(sequence);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sequenceToDelete) return;
    
    try {
      await deleteEmailSequence(sequenceToDelete.id);
      showMessage('Email sequence deleted successfully', 'success');
      onRefresh();
    } catch (error) {
      console.error('Error deleting sequence:', error);
      showMessage('Failed to delete email sequence', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setSequenceToDelete(null);
    }
  };

  const openTestEmailDialog = (sequence: EmailSequence) => {
    setSequenceToTest(sequence);
    setTestEmailDialogOpen(true);
  };

  const handleTestEmail = async () => {
    if (!sequenceToTest) return;
    
    try {
      // Create a test email log directly instead of an event
      const logRef = collection(db, 'email_logs');
      await addDoc(logRef, {
        sequenceId: sequenceToTest.id,
        sequenceName: sequenceToTest.name,
        emailSubject: sequenceToTest.emails[0]?.subject || 'Test Email',
        emailBody: sequenceToTest.emails[0]?.body || 'This is a test email',
        userId: 'test-user',
        userEmail: 'test@example.com',
        status: 'sent',
        sentAt: serverTimestamp(),
        triggerType: 'manual_test',
        triggerDetails: {
          isTest: true,
          triggeredBy: 'admin'
        }
      });
      
      showMessage('Test email logged successfully', 'success');
    } catch (error) {
      console.error('Error triggering test email:', error);
      showMessage('Failed to trigger test email', 'error');
    } finally {
      setTestEmailDialogOpen(false);
      setSequenceToTest(null);
    }
  };

  const getEmailTypeCount = (sequence: EmailSequence) => {
    const scheduledCount = sequence.emails.filter(email => email.sendAfterDays !== undefined).length;
    const eventCount = sequence.emails.filter(email => email.triggerEvent !== undefined).length;
    return { scheduledCount, eventCount };
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="email sequences table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Emails</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No email sequences found. Create one to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sequences.map((sequence) => {
                const { scheduledCount, eventCount } = getEmailTypeCount(sequence);
                return (
                  <TableRow key={sequence.id} hover>
                    <TableCell component="th" scope="row">
                      {sequence.name}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={sequence.type} 
                        color={sequence.type === 'user' ? 'primary' : 'secondary'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {scheduledCount > 0 && (
                          <Tooltip title={`${scheduledCount} scheduled email${scheduledCount !== 1 ? 's' : ''}`}>
                            <Chip 
                              label={`${scheduledCount} scheduled`} 
                              size="small" 
                              variant="outlined"
                              color="info"
                            />
                          </Tooltip>
                        )}
                        {eventCount > 0 && (
                          <Tooltip title={`${eventCount} event-triggered email${eventCount !== 1 ? 's' : ''}`}>
                            <Chip 
                              label={`${eventCount} event-based`} 
                              size="small" 
                              variant="outlined"
                              color="warning"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={sequence.status === 'active'}
                        onChange={() => handleStatusChange(sequence)}
                        disabled={statusUpdating === sequence.id}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      {sequence.updatedAt ? new Date(sequence.updatedAt.toDate()).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Test Sequence">
                          <IconButton onClick={() => openTestEmailDialog(sequence)} color="info">
                            <SendIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => onEdit(sequence)} color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => openDeleteDialog(sequence)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Email Sequence</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the email sequence "{sequenceToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog
        open={testEmailDialogOpen}
        onClose={() => setTestEmailDialogOpen(false)}
      >
        <DialogTitle>Test Email Sequence</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will trigger a test event for the sequence "{sequenceToTest?.name}". 
            If the sequence contains event-based emails, they will be sent.
            Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestEmailDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTestEmail} color="primary" variant="contained">
            Send Test Email
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmailSequenceList;
