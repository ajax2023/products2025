import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Button, 
  Paper,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNotification } from '../common/NotificationSnackbar';
import EmailSequenceList from './email/EmailSequenceList';
import EmailLogsList from './email/EmailLogsList';
import EmailSequenceEditor from './email/EmailSequenceEditor';
import { EmailSequence } from '../../types/emailSequence';
import { getEmailSequences } from '../../firebase/emailSequences';

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
      id={`email-tabpanel-${index}`}
      aria-labelledby={`email-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `email-tab-${index}`,
    'aria-controls': `email-tabpanel-${index}`,
  };
}

const EmailManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const { showMessage } = useNotification();

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    setLoading(true);
    try {
      const fetchedSequences = await getEmailSequences();
      setSequences(fetchedSequences);
    } catch (error) {
      console.error('Error loading email sequences:', error);
      showMessage('Failed to load email sequences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateSequence = () => {
    setSelectedSequence(null);
    setIsEditorOpen(true);
  };

  const handleEditSequence = (sequence: EmailSequence) => {
    setSelectedSequence(sequence);
    setIsEditorOpen(true);
  };

  const handleEditorClose = (refreshNeeded: boolean = false) => {
    setIsEditorOpen(false);
    if (refreshNeeded) {
      loadSequences();
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Email Management
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={loadSequences} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateSequence}
            sx={{ ml: 1 }}
          >
            Create Sequence
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="email management tabs">
            <Tab label="Email Sequences" {...a11yProps(0)} />
            <Tab label="Email Logs" {...a11yProps(1)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <EmailSequenceList 
              sequences={sequences} 
              onEdit={handleEditSequence}
              onRefresh={loadSequences}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <EmailLogsList />
        </TabPanel>
      </Paper>

      {isEditorOpen && (
        <EmailSequenceEditor
          sequence={selectedSequence}
          open={isEditorOpen}
          onClose={handleEditorClose}
        />
      )}
    </Box>
  );
};

export default EmailManagement;
