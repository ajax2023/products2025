import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
  Badge,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PeopleIcon from '@mui/icons-material/People';
import ShareGroceryButton from './ShareGroceryButton';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { groceryDb, GroceryList, GroceryItem } from '../../config/groceryDb';
import { useAuth } from '../../auth/useAuth';
import AddGroceryDialog from './AddGroceryDialog';
import { getSharedLists, updateSharedListItem, subscribeToSharedList } from '../../services/sharedListService';

export default function Groceries() {
  const { user } = useAuth();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [sharedLists, setSharedLists] = useState<GroceryList[]>([]);
  const [selectedList, setSelectedList] = useState<GroceryList | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingShared, setLoadingShared] = useState(true);
  // Keep track of active subscriptions to avoid memory leaks
  const unsubscribeRefs = useRef<{[key: string]: () => void}>({});

  useEffect(() => {
    if (user) {
      loadLists();
      loadSharedLists();
    }
    
    // Cleanup subscriptions on unmount
    return () => {
      Object.values(unsubscribeRefs.current).forEach(unsubscribe => {
        unsubscribe();
      });
    };
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
      console.error('Error loading lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedLists = async () => {
    if (!user) return;
    
    try {
      setLoadingShared(true);
      const shared = await getSharedLists();
      setSharedLists(shared);
      
      // Setup real-time listeners for each shared list
      shared.forEach(list => {
        if (list.firebaseId && !unsubscribeRefs.current[list.firebaseId]) {
          const unsubscribe = subscribeToSharedList(list.firebaseId, (updatedFirestoreList) => {
            // Update the list in our state when it changes in Firestore
            updateListFromFirestore(list, updatedFirestoreList);
          });
          
          unsubscribeRefs.current[list.firebaseId] = unsubscribe;
        }
      });
    } catch (error) {
      console.error('Error loading shared lists:', error);
    } finally {
      setLoadingShared(false);
    }
  };

  const updateListFromFirestore = (localList: GroceryList, firestoreData: any) => {
    // Update the shared list in our state when it changes in Firestore
    setSharedLists(prev => prev.map(list => {
      if (list.firebaseId === localList.firebaseId) {
        const updatedList = {
          ...list,
          name: firestoreData.name,
          items: firestoreData.items,
          lastUpdated: firestoreData.lastUpdated,
          lastUpdatedBy: firestoreData.lastUpdatedBy
        };
        
        // If this is the currently selected list, update it too
        if (selectedList?.firebaseId === localList.firebaseId) {
          setSelectedList(updatedList);
        }
        
        // Also update the local Dexie database if this list is owned by the current user
        if (list.id && list.userId === user?.uid) {
          groceryDb.groceryLists.update(list.id, updatedList);
        }
        
        return updatedList;
      }
      return list;
    }));
  };

  const handleListUpdated = (updatedList: GroceryList) => {
    // Handle a list the user has left (no longer in sharedWith)
    if (updatedList.isShared && 
        updatedList.sharedWith && 
        user?.email && 
        !updatedList.sharedWith.includes(user.email) && 
        updatedList.userId !== user.uid) {
      
      // User left this list - remove it from displayed lists
      setSharedLists(prev => prev.filter(list => 
        list.firebaseId !== updatedList.firebaseId
      ));
      
      // If this was the selected list, clear selection
      if (selectedList?.firebaseId === updatedList.firebaseId) {
        setSelectedList(null);
      }
      
      // Clean up any subscription
      if (updatedList.firebaseId && unsubscribeRefs.current[updatedList.firebaseId]) {
        unsubscribeRefs.current[updatedList.firebaseId]();
        delete unsubscribeRefs.current[updatedList.firebaseId];
      }
      
      return;
    }
    
    // Regular update handling
    const isInLists = lists.some(list => list.id === updatedList.id);
    
    if (isInLists) {
      setLists(prev => prev.map(list => 
        list.id === updatedList.id ? updatedList : list
      ));
    }
    
    // Update selected list if it's the one that was updated
    if (selectedList?.id === updatedList.id) {
      setSelectedList(updatedList);
    }
    
    // If this is a newly shared list, reload shared lists
    if (updatedList.isShared) {
      loadSharedLists();
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
        // Fix the lint error by using an update spec object
        await groceryDb.groceryLists.update(list.id, {
          name: list.name,
          items: list.items,
          date: list.date,
          // Include other updated fields as needed
        });
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
    if (user) {
      try {
        const payload = { id: list.id ?? null, firebaseId: (list as any).firebaseId ?? null };
        localStorage.setItem(`lastSelectedGroceryList:${user.uid}`, JSON.stringify(payload));
      } catch {}
    }
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

      // Update local database
      if (selectedList.id) {
        await groceryDb.groceryLists.update(selectedList.id, {
          items: updatedItems
        });
      }
      
      setSelectedList(updatedList);
      
      // If this is a shared list, update Firestore
      if (selectedList.isShared && selectedList.firebaseId) {
        await updateSharedListItem(selectedList, updatedItems);
      }
      
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
      // Update local database
      if (selectedList.id) {
        await groceryDb.groceryLists.update(selectedList.id, {
          items: updatedItems
        });
      }
      
      setSelectedList(updatedList);
      
      // If this is a shared list, update Firestore
      if (selectedList.isShared && selectedList.firebaseId) {
        await updateSharedListItem(selectedList, updatedItems);
      }
      
      await loadLists();
    } catch (err) {
      console.error('Error reordering items:', err);
    }
  };

  // Combine all lists for display, avoiding duplicates
  const allLists = [
    ...lists,
    ...sharedLists.filter(shared => {
      // Don't include shared lists that are already in the local lists
      // Check both id and firebaseId to avoid duplicates
      return !lists.some(list => 
        // If either id matches or firebaseId matches, it's a duplicate
        (list.id === shared.id && list.id !== undefined) || 
        (list.firebaseId === shared.firebaseId && shared.firebaseId !== undefined)
      );
    })
  ];
  
  const filteredLists = allLists.filter(list => 
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Restore last selected list when lists load
  useEffect(() => {
    if (!user) return;
    if (selectedList) return; // do not override active selection
    try {
      const saved = localStorage.getItem(`lastSelectedGroceryList:${user.uid}`);
      if (!saved) return;
      const { id, firebaseId } = JSON.parse(saved);
      const found = allLists.find(l => (id && l.id === id) || (firebaseId && (l as any).firebaseId === firebaseId));
      if (found) {
        setSelectedList(found);
      }
    } catch {}
  }, [user, lists, sharedLists]);

  // Persist whenever selection changes
  useEffect(() => {
    if (!user || !selectedList) return;
    try {
      const payload = { id: selectedList.id ?? null, firebaseId: (selectedList as any).firebaseId ?? null };
      localStorage.setItem(`lastSelectedGroceryList:${user.uid}`, JSON.stringify(payload));
    } catch {}
  }, [user, selectedList]);

  return (
    <Container maxWidth={false} disableGutters sx={{ height: 'calc(100vh - 100px)',
      position: 'fixed', top: 60, overflowY: 'auto', px: 1 }}>
      <Typography variant="h5" sx={{ color: 'primary.main', mt: 0.5, mb: 1 }}>
        Your Lists
      </Typography>

      <Grid container spacing={1}>
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
                  No lists found
                </Typography>
              </Box>
            ) : (
              <List sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                {filteredLists.map((list) => (
                  <React.Fragment key={list.id || list.firebaseId}>
                    <ListItemButton
                      selected={selectedList?.id === list.id || selectedList?.firebaseId === list.firebaseId}
                      onClick={() => handleSelectList(list)}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {list.name}
                            {list.isShared && (
                              <Tooltip title={list.userId === user?.uid 
                                ? `Shared with ${list.sharedWith?.length} people` 
                                : "Shared with you"}>
                                <PeopleIcon fontSize="small" sx={{ ml: 1, color: 'primary.main' }} />
                              </Tooltip>
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" component="span">
                            {`${list.items.length} items`}
                          </Typography>
                        }
                      />
                      <ShareGroceryButton 
                        groceryList={list} 
                        onListUpdated={handleListUpdated}
                      />
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
                        disabled={!list.id} // Disable delete for shared lists we don't own
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
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle1">{selectedList.name}</Typography>
                  </Box>
                  <Box>
                    <Tooltip title="Edit">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleEditList(selectedList)}
                          sx={{ mr: 0.5 }}
                          disabled={selectedList.userId !== user?.uid}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <ShareGroceryButton 
                      groceryList={selectedList} 
                      onListUpdated={handleListUpdated}
                    />
                    <Tooltip title="Delete">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteList(selectedList.id!)}
                          sx={{ ml: 0.5 }}
                          disabled={!selectedList.id || selectedList.userId !== user?.uid}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>

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
                {/* Metadata removed per design: created/updated not shown */}
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
        <DialogTitle>Delete List</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this list? This action cannot be undone.
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