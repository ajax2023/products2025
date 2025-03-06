import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  IconButton,
  Grid,
  Paper,
  Tooltip,
  FormHelperText,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { 
  EmailSequence, 
  SequenceEmail, 
  SequenceType, 
  SequenceStatus 
} from '../../../types/emailSequence';
import { 
  createEmailSequence, 
  updateEmailSequence 
} from '../../../firebase/emailSequences';
import { useNotification } from '../../common/NotificationSnackbar';

interface EmailSequenceEditorProps {
  sequence: EmailSequence | null;
  open: boolean;
  onClose: (refreshNeeded?: boolean) => void;
}

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
      id={`email-editor-tabpanel-${index}`}
      aria-labelledby={`email-editor-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const EmailSequenceEditor: React.FC<EmailSequenceEditorProps> = ({ sequence, open, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<SequenceType>('user');
  const [status, setStatus] = useState<SequenceStatus>('inactive');
  const [emails, setEmails] = useState<SequenceEmail[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [errors, setErrors] = useState<{
    name?: string;
    emails?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const { showMessage } = useNotification();

  useEffect(() => {
    if (sequence) {
      setName(sequence.name);
      setType(sequence.type);
      setStatus(sequence.status);
      setEmails([...sequence.emails]);
    } else {
      // Default values for new sequence
      setName('');
      setType('user');
      setStatus('inactive');
      setEmails([]);
    }
  }, [sequence]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const validateForm = () => {
    const newErrors: {
      name?: string;
      emails?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Sequence name is required';
    }

    if (emails.length === 0) {
      newErrors.emails = 'At least one email is required';
    }

    // Validate each email
    const invalidEmails = emails.some(email => {
      return !email.subject.trim() || !email.body.trim() || 
        (email.sendAfterDays === undefined && email.triggerEvent === undefined);
    });

    if (invalidEmails) {
      newErrors.emails = 'All emails must have a subject, body, and either a send delay or trigger event';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (sequence) {
        // Update existing sequence
        await updateEmailSequence(sequence.id, {
          name,
          type,
          status,
          emails
        });
        showMessage('Email sequence updated successfully', 'success');
      } else {
        // Create new sequence
        await createEmailSequence(name, type, emails, status);
        showMessage('Email sequence created successfully', 'success');
      }
      onClose(true);
    } catch (error) {
      console.error('Error saving email sequence:', error);
      showMessage('Failed to save email sequence', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmail = (type: 'scheduled' | 'event') => {
    const newEmail: SequenceEmail = {
      subject: '',
      body: '',
      ...(type === 'scheduled' ? { sendAfterDays: 1 } : { triggerEvent: '' })
    };
    setEmails([...emails, newEmail]);
  };

  const handleRemoveEmail = (index: number) => {
    const updatedEmails = [...emails];
    updatedEmails.splice(index, 1);
    setEmails(updatedEmails);
  };

  const handleEmailChange = (index: number, field: keyof SequenceEmail, value: any) => {
    const updatedEmails = [...emails];
    updatedEmails[index] = {
      ...updatedEmails[index],
      [field]: value
    };
    setEmails(updatedEmails);
  };

  const getScheduledEmails = () => {
    return emails.filter(email => email.sendAfterDays !== undefined);
  };

  const getEventEmails = () => {
    return emails.filter(email => email.triggerEvent !== undefined);
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose()} 
      maxWidth="md" 
      fullWidth
      aria-labelledby="email-sequence-editor-dialog"
    >
      <DialogTitle id="email-sequence-editor-dialog">
        {sequence ? 'Edit Email Sequence' : 'Create Email Sequence'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Sequence Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="sequence-type-label">Sequence Type</InputLabel>
              <Select
                labelId="sequence-type-label"
                value={type}
                label="Sequence Type"
                onChange={(e) => setType(e.target.value as SequenceType)}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="vendor">Vendor</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="sequence-status-label">Status</InputLabel>
              <Select
                labelId="sequence-status-label"
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value as SequenceStatus)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
              <FormHelperText>
                {status === 'active' 
                  ? 'Emails will be sent according to schedule/events' 
                  : 'No emails will be sent while inactive'}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Emails
            {errors.emails && (
              <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                {errors.emails}
              </Typography>
            )}
          </Typography>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="email types tabs"
            >
              <Tab label={`Scheduled Emails (${getScheduledEmails().length})`} />
              <Tab label={`Event-Triggered Emails (${getEventEmails().length})`} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Scheduled emails are sent after a specified number of days from user creation
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleAddEmail('scheduled')}
              >
                Add Scheduled Email
              </Button>
            </Box>

            {getScheduledEmails().length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                No scheduled emails. Click the button above to add one.
              </Typography>
            ) : (
              getScheduledEmails().map((email, index) => {
                const emailIndex = emails.findIndex(e => e === email);
                return (
                  <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={9}>
                          <TextField
                            label="Subject"
                            value={email.subject}
                            onChange={(e) => handleEmailChange(emailIndex, 'subject', e.target.value)}
                            fullWidth
                            margin="dense"
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Send After Days"
                            type="number"
                            value={email.sendAfterDays}
                            onChange={(e) => handleEmailChange(emailIndex, 'sendAfterDays', parseInt(e.target.value))}
                            fullWidth
                            margin="dense"
                            required
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Email Body"
                            value={email.body}
                            onChange={(e) => handleEmailChange(emailIndex, 'body', e.target.value)}
                            fullWidth
                            multiline
                            rows={4}
                            margin="dense"
                            required
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Remove Email">
                        <IconButton 
                          onClick={() => handleRemoveEmail(emailIndex)} 
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                );
              })
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Event-triggered emails are sent when specific events occur
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleAddEmail('event')}
              >
                Add Event Email
              </Button>
            </Box>

            {getEventEmails().length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                No event-triggered emails. Click the button above to add one.
              </Typography>
            ) : (
              getEventEmails().map((email, index) => {
                const emailIndex = emails.findIndex(e => e === email);
                return (
                  <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={9}>
                          <TextField
                            label="Subject"
                            value={email.subject}
                            onChange={(e) => handleEmailChange(emailIndex, 'subject', e.target.value)}
                            fullWidth
                            margin="dense"
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Trigger Event"
                            value={email.triggerEvent}
                            onChange={(e) => handleEmailChange(emailIndex, 'triggerEvent', e.target.value)}
                            fullWidth
                            margin="dense"
                            required
                            placeholder="e.g., user_signup"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Email Body"
                            value={email.body}
                            onChange={(e) => handleEmailChange(emailIndex, 'body', e.target.value)}
                            fullWidth
                            multiline
                            rows={4}
                            margin="dense"
                            required
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Remove Email">
                        <IconButton 
                          onClick={() => handleRemoveEmail(emailIndex)} 
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                );
              })
            )}
          </TabPanel>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : sequence ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailSequenceEditor;
