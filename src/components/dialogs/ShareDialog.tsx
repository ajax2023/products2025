import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  TextField
} from '@mui/material';
import { useAuth } from '../../auth/useAuth';

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  brandName: string;
  products: string[];
  website?: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onClose,
  brandName,
  products,
  website,
}) => {
  const { user } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  // Split comma-separated products into array
  const productList = useMemo(() => {
    return products.flatMap(p => p.split(',').map(item => item.trim())).filter(Boolean);
  }, [products]);

  const handleShare = async () => {
    const sharedBy = user?.displayName || user?.email || 'A Canadian Products user';
    
    console.log('[ShareDialog] Starting share process with:', { 
      brandName, 
      selectedProducts, 
      comment,
      website,
      sharedBy
    });

    // Create a nicely formatted share text
    const productText = selectedProducts.length > 0 
      ? `\n\nFeatured Products:\n${selectedProducts.map(p => `• ${p}`).join('\n')}`
      : '';

    const commentText = comment 
      ? `\n\nComment from ${sharedBy}:\n${comment}`
      : '';

    const websiteText = website 
      ? `\n\nVisit their website: ${website}`
      : '';

    const shareText = `Check out ${brandName}!${productText}${commentText}${websiteText}\n\nShared by: ${sharedBy}`;

    // Create a data URL containing the full text
    const encodedText = encodeURIComponent(shareText);
    const dataUrl = `data:text/plain;charset=utf-8,${encodedText}`;

    console.log('[ShareDialog] Share content:', {
      productText,
      commentText,
      websiteText,
      fullText: shareText,
      dataUrl: dataUrl.substring(0, 100) + '...' // truncate for logging
    });

    try {
      if (navigator.share) {
        console.log('[ShareDialog] Using Web Share API');
        
        // Try sharing with just text first
        try {
          await navigator.share({
            title: `${brandName} - Canadian Products`,
            text: shareText
          });
          console.log('[ShareDialog] Share successful with text only');
        } catch (textError) {
          console.log('[ShareDialog] Text-only share failed, trying with data URL:', textError);
          // If text-only fails, try with data URL
          await navigator.share({
            title: `${brandName} - Canadian Products`,
            text: shareText,
            url: dataUrl
          });
          console.log('[ShareDialog] Share successful with data URL');
        }
      } else {
        console.log('[ShareDialog] Web Share API not available, using clipboard');
        await navigator.clipboard.writeText(shareText);
        console.log('[ShareDialog] Copied to clipboard:', shareText);
      }
      onClose();
    } catch (error) {
      console.error('[ShareDialog] Error sharing:', error);
      if (error instanceof Error) {
        console.error('[ShareDialog] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  };

  const handleProductSelect = (product: string, checked: boolean) => {
    console.log('[ShareDialog] Product selection changed:', { 
      product, 
      checked,
      currentSelected: selectedProducts,
      willHave: checked 
        ? [...selectedProducts, product] 
        : selectedProducts.filter(p => p !== product)
    });
    if (checked) {
      setSelectedProducts([...selectedProducts, product]);
    } else {
      setSelectedProducts(selectedProducts.filter(p => p !== product));
    }
  };

  const handleCommentChange = (newComment: string) => {
    console.log('[ShareDialog] Comment updated:', { length: newComment.length });
    setComment(newComment);
  };

  // console.log('[ShareDialog] Rendering:', { 
  //   open, 
  //   brandName, 
  //   productsCount: products.length,
  //   selectedCount: selectedProducts.length,
  //   hasComment: !!comment 
  // });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share {brandName}</DialogTitle>
      <DialogContent sx={{ 
        width: '100%',
        maxWidth: '500px',
        overflow: 'visible'
      }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Select products to highlight:
        </Typography>
        <Box sx={{ 
          mb: 3,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 1
        }}>
          {productList.map((product) => (
            <FormControlLabel
              key={product}
              control={
                <Checkbox
                  checked={selectedProducts.includes(product)}
                  onChange={(e) => handleProductSelect(product, e.target.checked)}
                  sx={{
                    color: 'primary.main',
                    '&.Mui-checked': {
                      color: 'primary.main',
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ 
                  fontSize: '0.9rem',
                  color: 'text.primary'
                }}>
                  {product}
                </Typography>
              }
              sx={{
                margin: 0,
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
                borderRadius: 1,
                padding: '4px 8px',
              }}
            />
          ))}
        </Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Add a comment (optional):
        </Typography>
        <TextField
          multiline
          rows={3}
          maxRows={5}
          fullWidth
          placeholder="What do you like about these products?"
          value={comment}
          onChange={(e) => handleCommentChange(e.target.value)}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#f5f5f5',
              '&:hover': {
                backgroundColor: '#f0f0f0',
              },
              '& fieldset': {
                borderColor: '#e0e0e0',
              },
            },
          }}
        />
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
