import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItemButton,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Grid,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ShareGroceryButton from './ShareGroceryButton';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { groceryDb, GroceryList, GroceryItem } from '../../config/groceryDb';
import { useAuth } from '../../auth/useAuth';
import AddGroceryDialog from './AddGroceryDialog';

export default function Groceries() {
  const { user } = useAuth();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [selectedList, setSelectedList] = useState<GroceryList | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLists();
    }
  }, [user]);

  const loadLists = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userLists = await groceryDb.groceryLists
        .where('userId')
        .equals(user.uid)
        .reverse()
        .sortBy('date');
      
      setLists(userLists);
      
      // Select the most recent list if none is selected
      if (!selectedList && userLists.length > 0) {
        setSelectedList(userLists[0]);
      }
    } catch (error) {
      console.error('Error loading grocery lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = () => {
    setSelectedList(null);
    setIsAddDialogOpen(true);
  };

  const handleEditList = (list: GroceryList) => {
    setSelectedList(list);
    setIsAddDialogOpen(true);
  };

  const handleSaveList = async (list: GroceryList) => {
    try {
      let savedListId: number;
      
      if (list.id) {
        await groceryDb.groceryLists.update(list.id, list);
        savedListId = list.id;
      } else {
        savedListId = await groceryDb.groceryLists.add(list);
      }
      
      // Reload all lists
      await loadLists();
      
      // Update the selected list with the latest data if it's the one we just saved
      if (selectedList && selectedList.id === list.id) {
        const updatedList = await groceryDb.groceryLists.get(savedListId);
        if (updatedList) {
          setSelectedList(updatedList);
        }
      } else if (!selectedList || !selectedList.id) {
        // If no list was selected or we just created a new list, select the one we just saved
        const updatedList = await groceryDb.groceryLists.get(savedListId);
        if (updatedList) {
          setSelectedList(updatedList);
        }
      }
    } catch (err) {
      console.error('Error saving list:', err);
    }
  };

  const handleDeleteList = (listId: number) => {
    setListToDelete(listId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteList = async () => {
    if (listToDelete) {
      try {
        await groceryDb.groceryLists.delete(listToDelete);
        if (selectedList?.id === listToDelete) {
          setSelectedList(null);
        }
        await loadLists();
      } catch (err) {
        console.error('Error deleting list:', err);
      }
    }
    setIsDeleteDialogOpen(false);
    setListToDelete(null);
  };

  const handleSelectList = (list: GroceryList) => {
    setSelectedList(list);
  };

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    if (!selectedList) return;

    try {
      const updatedItems = selectedList.items.map(item => 
        item.id === itemId ? { ...item, checked } : item
      );

      const updatedList = {
        ...selectedList,
        items: updatedItems
      };

      await groceryDb.groceryLists.update(selectedList.id!, updatedList);
      setSelectedList(updatedList);
      await loadLists();
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !selectedList) return;

    const items = Array.from(selectedList.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    const updatedList = {
      ...selectedList,
      items: updatedItems
    };

    try {
      await groceryDb.groceryLists.update(selectedList.id!, updatedList);
      setSelectedList(updatedList);
      await loadLists();
    } catch (err) {
      console.error('Error reordering items:', err);
    }
  };

  const filteredLists = lists.filter(list => 
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{     height: 'calc(100vh - 100px)',
      position: 'fixed',   top: 60,  overflowY: 'auto'}}>
      <Typography variant="h5" sx={{ color: 'primary.main', mt: 0, mb: 2 }}>
        Grocery Lists
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }} elevation={10}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">My Lists</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateList}
                size="small"
              >
                New List
              </Button>
            </Box>

            <TextField
              placeholder="Search lists..."
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchQuery('')}
                      edge="end"
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filteredLists.length === 0 ? (
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No grocery lists found
                </Typography>
              </Box>
            ) : (
              <List sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                {filteredLists.map((list) => (
                  <React.Fragment key={list.id}>
                    <ListItemButton
                      selected={selectedList?.id === list.id}
                      onClick={() => handleSelectList(list)}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <ListItemText
                        primary={list.name}
                        secondary={`${list.items.length} items`}
                      />
                      <ShareGroceryButton groceryList={list} />
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditList(list);
                        }}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id!);
                        }}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 400 }} elevation={10}>
            {selectedList ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{selectedList.name}</Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEditList(selectedList)}
                      startIcon={<EditIcon />}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Box sx={{ display: 'inline-block', mr: 1 }}>
                      <ShareGroceryButton groceryList={selectedList} />
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDeleteList(selectedList.id!)}
                      startIcon={<DeleteIcon />}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Created on {new Date(selectedList.date).toLocaleDateString()}
                </Typography>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="grocery-items">
                    {(provided) => (
                      <List
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        sx={{ flexGrow: 1 }}
                      >
                        {selectedList.items.length === 0 ? (
                          <Box sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              No items in this list. Click Edit to add items.
                            </Typography>
                          </Box>
                        ) : (
                          selectedList.items
                            // Sort checked items to the bottom
                            .sort((a, b) => {
                              // First sort by checked status
                              if (a.checked !== b.checked) {
                                return a.checked ? 1 : -1; // Checked items go to the bottom
                              }
                              // Then sort by order for items with the same checked status
                              return (a.order || 0) - (b.order || 0);
                            })
                            .map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided) => (
                                  <ListItem
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    sx={{
                                      textDecoration: item.checked ? 'line-through' : 'none',
                                      opacity: item.checked ? 0.6 : 1,
                                      py: 0.5, // Reduce vertical padding
                                    }}
                                  >
                                    <ListItemIcon>
                                      <Checkbox
                                        edge="start"
                                        checked={!!item.checked}
                                        onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                      />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={item.name}
                                      secondary={
                                        <>
                                          {item.category && (
                                            <Chip
                                              label={item.category}
                                              size="small"
                                              sx={{ mr: 1, mb: 0.25 }}
                                            />
                                          )}
                                          {item.typicalPrice && `$${item.typicalPrice.toFixed(2)}`}
                                          {item.typicalPrice && item.preferredStore && ' | '}
                                          {item.preferredStore}
                                        </>
                                      }
                                    />
                                  </ListItem>
                                )}
                              </Draggable>
                            ))
                        )}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  p: 1,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No List Selected
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                  Select a list from the sidebar or create a new one
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateList}
                >
                  Create New List
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <AddGroceryDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        initialValues={selectedList}
        onSave={handleSaveList}
      />

      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Grocery List</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this grocery list? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteList} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}