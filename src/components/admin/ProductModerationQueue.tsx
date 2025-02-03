import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Product } from '../../types/product';
import { ApprovalAction } from '../../types/admin';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import ProductImport from './ProductImport';

interface ProductModerationQueueProps {
  adminId: string;
}

export default function ProductModerationQueue({ adminId }: ProductModerationQueueProps) {
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [detailsDialog, setDetailsDialog] = useState<Product | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const fetchPendingProducts = async () => {
    try {
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'pending'),
        orderBy('submitted_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const products = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        _id: doc.id
      })) as Product[];
      
      setPendingProducts(products);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pending products:', err);
      setError('Error loading pending products');
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedProduct) return;

    try {
      const approvalAction: ApprovalAction = {
        action,
        timestamp: new Date(),
        admin_id: adminId,
        notes: actionNote
      };

      // Update product status
      await updateDoc(doc(db, 'products', selectedProduct._id), {
        status: action === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date(),
        approved_by: adminId,
        approved_at: new Date(),
        rejection_reason: action === 'reject' ? actionNote : null
      });

      // Add to approval history
      await updateDoc(doc(db, 'approval_history', `prod_${selectedProduct._id}`), {
        actions: [...(selectedProduct.approval_history?.actions || []), approvalAction],
        current_status: action === 'approve' ? 'approved' : 'rejected'
      });

      // Refresh the queue
      await fetchPendingProducts();
      
      setActionDialog(null);
      setActionNote('');
      setSelectedProduct(null);
    } catch (err) {
      console.error('Error processing action:', err);
      setError(`Error ${action}ing product`);
    }
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading moderation queue...</Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Product Moderation Queue
          <Chip 
            label={`${pendingProducts.length} Pending`}
            color="warning"
            size="small"
            sx={{ ml: 1 }}
          />
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowImportDialog(true)}
        >
          Import Products
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Submitted By</TableCell>
              <TableCell>Submitted At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingProducts.map((product) => (
              <TableRow key={product._id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.submitted_by}</TableCell>
                <TableCell>
                  {product.submitted_at?.toDate().toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => setDetailsDialog(product)}
                    >
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Approve">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => {
                        setSelectedProduct(product);
                        setActionDialog('approve');
                      }}
                    >
                      <ApproveIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedProduct(product);
                        setActionDialog('reject');
                      }}
                    >
                      <RejectIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {pendingProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No pending products to review
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Dialog */}
      <Dialog 
        open={!!actionDialog} 
        onClose={() => {
          setActionDialog(null);
          setActionNote('');
          setSelectedProduct(null);
        }}
      >
        <DialogTitle>
          {actionDialog === 'approve' ? 'Approve' : 'Reject'} Product
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            required={actionDialog === 'reject'}
            helperText={actionDialog === 'reject' ? 'Please provide a reason for rejection' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setActionDialog(null);
            setActionNote('');
            setSelectedProduct(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleAction(actionDialog!)}
            variant="contained"
            color={actionDialog === 'approve' ? 'success' : 'error'}
            disabled={actionDialog === 'reject' && !actionNote}
          >
            {actionDialog === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={!!detailsDialog}
        onClose={() => setDetailsDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {detailsDialog && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr', pt: 2 }}>
              <Typography><strong>Name:</strong> {detailsDialog.name}</Typography>
              <Typography><strong>Brand:</strong> {detailsDialog.brand}</Typography>
              <Typography><strong>Category:</strong> {detailsDialog.category}</Typography>
              <Typography><strong>Company ID:</strong> {detailsDialog.company_id}</Typography>
              <Typography><strong>Origin:</strong> {`${detailsDialog.origin.city}, ${detailsDialog.origin.state}, ${detailsDialog.origin.country}`}</Typography>
              <Typography><strong>Submitted By:</strong> {detailsDialog.submitted_by}</Typography>
              <Typography><strong>Submitted At:</strong> {detailsDialog.submitted_at?.toDate().toLocaleString()}</Typography>
              <Typography><strong>Version:</strong> {detailsDialog.version}</Typography>
              
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography><strong>Attributes:</strong></Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {Object.entries(detailsDialog.attributes).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog 
        open={showImportDialog} 
        onClose={() => setShowImportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Products</DialogTitle>
        <DialogContent>
          <ProductImport onClose={() => setShowImportDialog(false)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
