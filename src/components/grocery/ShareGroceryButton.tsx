import React, { useState } from 'react';
import { IconButton, Tooltip, Badge } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import { ShareListDialog } from './ShareListDialog';
import { GroceryList } from '../../config/groceryDb';

interface ShareGroceryButtonProps {
  groceryList: GroceryList;
  onListUpdated?: (updatedList: GroceryList) => void;
}

const ShareGroceryButton: React.FC<ShareGroceryButtonProps> = ({ 
  groceryList, 
  onListUpdated = () => {} 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering list selection
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleListUpdated = (updatedList: GroceryList) => {
    onListUpdated(updatedList);
  };

  // Determine if the list is already shared
  const isShared = groceryList.isShared && Array.isArray(groceryList.sharedWith) && groceryList.sharedWith.length > 0;

  return (
    <>
      <Tooltip title={isShared ? "Manage Sharing" : "Share List"}>
        <IconButton
          onClick={handleOpenDialog}
          size="small"
          sx={{ 
            color: isShared ? 'success.main' : 'primary.main',
          }}
        >
          <Badge 
            badgeContent={isShared ? groceryList.sharedWith?.length || 0 : 0}
            color="primary"
            invisible={!isShared}
          >
            <ShareIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <ShareListDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        list={groceryList}
        onListUpdated={handleListUpdated}
      />
    </>
  );
};

export default ShareGroceryButton;
