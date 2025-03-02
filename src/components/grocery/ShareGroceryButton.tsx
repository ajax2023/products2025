import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import { ShareGroceryDialog } from './ShareGroceryDialog';
import { GroceryList } from '../../config/groceryDb';

interface ShareGroceryButtonProps {
  groceryList: GroceryList;
}

const ShareGroceryButton: React.FC<ShareGroceryButtonProps> = ({ groceryList }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering list selection
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <Tooltip title="Share List">
        <IconButton
          onClick={handleOpenDialog}
          size="small"
          sx={{ 
            color: 'primary.main',
          }}
        >
          <ShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <ShareGroceryDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        groceryList={groceryList}
      />
    </>
  );
};

export default ShareGroceryButton;
