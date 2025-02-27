import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import { ShareDialog } from './dialogs/ShareDialog';

interface ShareButtonProps {
  brandName: string;
  products: string[];
  website?: string;
}

const ShareButton: React.FC<ShareButtonProps> = (props) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    console.log('[ShareButton] Opening dialog:', { 
      brandName: props.brandName,
      productsCount: props.products.length,
      hasWebsite: !!props.website
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    console.log('[ShareButton] Closing dialog');
    setDialogOpen(false);
  };

  // console.log('[ShareButton] Rendering:', { 
  //   brandName: props.brandName,
  //   dialogOpen 
  // });

  return (
    <>
      <Tooltip title="Share">
        <IconButton
          onClick={handleOpenDialog}
          size="small"
          sx={{ 
            color: 'primary.main',
            '& .MuiSvgIcon-root': { 
              fontSize: '1.1rem'
            }
          }}
        >
          <ShareIcon />
        </IconButton>
      </Tooltip>
      <ShareDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        {...props}
      />
    </>
  );
};

export default ShareButton;
