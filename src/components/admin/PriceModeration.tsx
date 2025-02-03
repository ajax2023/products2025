import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Price } from '../../types/price';
import { Product } from '../../types/product';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Warning as FlagIcon,
} from '@mui/icons-material';

interface PriceModerationProps {
  adminId: string;
}

export default function PriceModeration({ adminId }: PriceModerationProps) {
  const [prices, setPrices] = useState<(Price & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
  const [detailsDialog, setDetailsDialog] = useState<Price | null>(null);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      // Get all prices
      const pricesQuery = query(
        collection(db, 'prices'),
        orderBy('timestamp', 'desc')
      );
      const pricesSnapshot = await getDocs(pricesQuery);
      const pricesList = pricesSnapshot.docs.map(doc => ({
        ...doc.data(),
        _id: doc.id
      })) as Price[];

      // Get associated products
      const productIds = [...new Set(pricesList.map(p => p.product_id))];
      const productsQuery = query(
        collection(db, 'products'),
        where('_id', 'in', productIds)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsMap = new Map(
        productsSnapshot.docs.map(doc => [doc.id, { ...doc.data(), _id: doc.id } as Product])
      );

      // Combine prices with products
      const pricesWithProducts = pricesList.map(price => ({
        ...price,
        product: productsMap.get(price.product_id)
      }));

      setPrices(pricesWithProducts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError('Error loading prices');
      setLoading(false);
    }
  };

  const handleFlag = async (price: Price) => {
    try {
      await updateDoc(doc(db, 'prices', price._id), {
        flagged: true,
        flagged_by: adminId,
        flagged_at: new Date()
      });

      await fetchPrices();
    } catch (err) {
      console.error('Error flagging price:', err);
      setError('Error flagging price');
    }
  };

  const handleRemove = async (price: Price) => {
    try {
      await updateDoc(doc(db, 'prices', price._id), {
        is_active: false,
        removed_by: adminId,
        removed_at: new Date()
      });

      await fetchPrices();
    } catch (err) {
      console.error('Error removing price:', err);
      setError('Error removing price');
    }
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading prices...</Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Price Moderation
      </Typography>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Submitted By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prices.map((price) => (
              <TableRow 
                key={price._id}
                sx={price.flagged ? { backgroundColor: 'warning.light' } : undefined}
              >
                <TableCell>{price.product?.name || price.product_id}</TableCell>
                <TableCell>
                  ${price.price.toFixed(2)}
                  {price.currency && ` ${price.currency}`}
                </TableCell>
                <TableCell>
                  {`${price.location.city}, ${price.location.country}`}
                </TableCell>
                <TableCell>{price.user_id}</TableCell>
                <TableCell>
                  {price.timestamp.toDate().toLocaleDateString()}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Flag Price">
                    <IconButton
                      size="small"
                      color="warning"
                      onClick={() => handleFlag(price)}
                      disabled={price.flagged}
                    >
                      <FlagIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove Price">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemove(price)}
                    >
                      <RejectIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {prices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No prices to moderate
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog */}
      <Dialog
        open={!!detailsDialog}
        onClose={() => setDetailsDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Price Details</DialogTitle>
        <DialogContent>
          {detailsDialog && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr', pt: 2 }}>
              <Typography><strong>Product:</strong> {prices.find(p => p._id === detailsDialog._id)?.product?.name}</Typography>
              <Typography><strong>Price:</strong> ${detailsDialog.price.toFixed(2)}</Typography>
              <Typography><strong>Currency:</strong> {detailsDialog.currency || 'USD'}</Typography>
              <Typography><strong>Location:</strong> {`${detailsDialog.location.city}, ${detailsDialog.location.state}, ${detailsDialog.location.country}`}</Typography>
              <Typography><strong>Submitted By:</strong> {detailsDialog.user_id}</Typography>
              <Typography><strong>Date:</strong> {detailsDialog.timestamp.toDate().toLocaleString()}</Typography>
              {detailsDialog.notes && (
                <Typography sx={{ gridColumn: '1 / -1' }}>
                  <strong>Notes:</strong> {detailsDialog.notes}
                </Typography>
              )}
              {detailsDialog.flagged && (
                <>
                  <Typography><strong>Flagged By:</strong> {detailsDialog.flagged_by}</Typography>
                  <Typography><strong>Flagged At:</strong> {detailsDialog.flagged_at?.toDate().toLocaleString()}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
