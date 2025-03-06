import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Typography,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Pagination
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { collection, query, orderBy, limit, getDocs, where, startAfter, Timestamp, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useNotification } from '../../common/NotificationSnackbar';

// Define the EmailLog interface
interface EmailLog {
  id: string;
  sequenceId: string;
  emailIndex: number;
  recipient: string;
  subject: string;
  sentAt: Timestamp;
  status: 'success' | 'failed' | 'pending' | 'retry';
  error?: string;
  retryCount: number;
  triggerType: 'scheduled' | 'event';
  triggerValue: string | number;
  userId?: string;
}

const EMAIL_LOGS_COLLECTION = 'email_logs';
const LOGS_PER_PAGE = 10;

const EmailLogsList: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { showMessage } = useNotification();

  useEffect(() => {
    loadLogs();
  }, [statusFilter, triggerFilter, page]);

  const loadLogs = async (refresh = false) => {
    if (refresh) {
      setPage(1);
      setLastVisible(null);
    }

    setLoading(true);
    try {
      // Start with a basic query
      let logsQuery = query(
        collection(db, EMAIL_LOGS_COLLECTION),
        orderBy('sentAt', 'desc'),
        limit(LOGS_PER_PAGE)
      );

      // Apply filters one at a time to avoid complex index requirements
      // Note: This approach may not be as efficient but requires fewer indexes
      
      // Get the documents
      const snapshot = await getDocs(logsQuery);
      
      // Filter results client-side if needed
      let fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailLog[];
      
      // Apply client-side filtering if needed
      if (statusFilter !== 'all') {
        fetchedLogs = fetchedLogs.filter(log => log.status === statusFilter);
      }
      
      if (triggerFilter !== 'all') {
        fetchedLogs = fetchedLogs.filter(log => log.triggerType === triggerFilter);
      }
      
      // Check if there are more results
      setHasMore(snapshot.docs.length === LOGS_PER_PAGE);
      
      // Set the last visible document for pagination
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      } else {
        setLastVisible(null);
      }

      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error loading email logs:', error);
      let errorMessage = 'Failed to load email logs';
      
      // Check if it's an index error and provide helpful message
      if (error instanceof Error && error.message.includes('index')) {
        errorMessage = 'Index error: The email logs query requires an index. Please follow the link in the console to create it.';
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleRefresh = () => {
    loadLogs(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'info';
      case 'retry':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Email Logs</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="retry">Retry</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            label="Trigger Type"
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="event">Event-based</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="email logs table">
          <TableHead>
            <TableRow>
              <TableCell>Recipient</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Sent At</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Trigger Type</TableCell>
              <TableCell>Trigger Value</TableCell>
              <TableCell>Retry Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No email logs found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{log.recipient}</TableCell>
                  <TableCell>{log.subject}</TableCell>
                  <TableCell>
                    {log.sentAt ? new Date(log.sentAt.toDate()).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.status} 
                      color={getStatusColor(log.status) as any}
                      size="small" 
                    />
                    {log.error && (
                      <Tooltip title={log.error}>
                        <Typography variant="caption" color="error" display="block">
                          Error: {log.error.substring(0, 30)}...
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.triggerType} 
                      variant="outlined"
                      color={log.triggerType === 'scheduled' ? 'info' : 'warning'}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{log.triggerValue.toString()}</TableCell>
                  <TableCell>{log.retryCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination 
          count={hasMore ? page + 1 : page} 
          page={page} 
          onChange={handlePageChange} 
          color="primary" 
          disabled={loading}
        />
      </Box>
    </Box>
  );
};

export default EmailLogsList;
