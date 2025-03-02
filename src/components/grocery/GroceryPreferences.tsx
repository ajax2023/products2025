import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import { groceryDb, GroceryPreference, GroceryItem } from '../../config/groceryDb';
import { useAuth } from '../../auth/useAuth';

export default function GroceryPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<GroceryPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ index: number; title: string } | null>(null);
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userPrefs = await groceryDb.groceryPreferences
        .where('userId')
        .equals(user.uid)
        .toArray();
      
      if (userPrefs.length > 0) {
        setPreferences(userPrefs[0]);
      } else {
        // Create default preferences if none exist
        const defaultPrefs: GroceryPreference = {
          userId: user.uid,
          title: 'My Grocery Preferences',
          items: [],
          categories: [
            { title: 'Produce', items: [] },
            { title: 'Dairy', items: [] },
            { title: 'Meat', items: [] },
            { title: 'Pantry', items: [] },
            { title: 'Frozen', items: [] },
            { title: 'Household', items: [] }
          ]
        };
        
        const id = await groceryDb.groceryPreferences.add(defaultPrefs);
        setPreferences({ ...defaultPrefs, id });
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('Failed to load your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences || !user) return;
    
    try {
      await groceryDb.groceryPreferences.update(preferences.id!, preferences);
      setNotification({
        open: true,
        message: 'Preferences saved successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
      setNotification({
        open: true,
        message: 'Failed to save preferences',
        severity: 'error'
      });
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim() || !preferences) return;
    
    const updatedCategories = [
      ...(preferences.categories || []),
      { title: newCategory, items: [] }
    ];
    
    setPreferences({
      ...preferences,
      categories: updatedCategories
    });
    
    setNewCategory('');
  };

  const handleDeleteCategory = async (index: number) => {
    if (!preferences?.categories) return;
    
    const categoryToDelete = preferences.categories[index];
    
    // Check if the category has items
    if (categoryToDelete.items.length > 0) {
      setNotification({
        open: true,
        message: 'Cannot delete a category that contains items. Please remove all items first.',
        severity: 'error'
      });
      return;
    }
    
    const updatedCategories = [...preferences.categories];
    updatedCategories.splice(index, 1);
    
    const updatedPreferences = {
      ...preferences,
      categories: updatedCategories
    };
    
    // Update state
    setPreferences(updatedPreferences);
    
    if (selectedCategory === index) {
      setSelectedCategory(null);
    }
    
    try {
      // Save to database
      await groceryDb.groceryPreferences.update(preferences.id!, updatedPreferences);
      
      setNotification({
        open: true,
        message: 'Category deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting category:', err);
      setNotification({
        open: true,
        message: 'Failed to delete category',
        severity: 'error'
      });
      
      // Revert state if save fails
      loadPreferences();
    }
  };

  const handleEditCategory = (index: number) => {
    if (!preferences?.categories) return;
    setEditingCategory({ index, title: preferences.categories[index].title });
  };

  const handleSaveEditCategory = () => {
    if (!editingCategory || !preferences?.categories) return;
    
    const updatedCategories = [...preferences.categories];
    updatedCategories[editingCategory.index] = {
      ...updatedCategories[editingCategory.index],
      title: editingCategory.title
    };
    
    setPreferences({
      ...preferences,
      categories: updatedCategories
    });
    
    setEditingCategory(null);
  };

  const handleAddItem = () => {
    if (!newItem.trim() || selectedCategory === null || !preferences?.categories) return;
    
    const updatedCategories = [...preferences.categories];
    updatedCategories[selectedCategory] = {
      ...updatedCategories[selectedCategory],
      items: [...updatedCategories[selectedCategory].items, newItem]
    };
    
    setPreferences({
      ...preferences,
      categories: updatedCategories
    });
    
    setNewItem('');
  };

  const handleDeleteItem = async (categoryIndex: number, itemIndex: number) => {
    if (!preferences?.categories) return;
    
    const updatedCategories = [...preferences.categories];
    const items = [...updatedCategories[categoryIndex].items];
    const deletedItem = items[itemIndex];
    items.splice(itemIndex, 1);
    
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      items
    };
    
    // Also remove the item from the main items array
    const updatedItems = preferences.items.filter(item => 
      !item.name || item.name !== deletedItem
    );
    
    const updatedPreferences = {
      ...preferences,
      categories: updatedCategories,
      items: updatedItems
    };
    
    // Update state
    setPreferences(updatedPreferences);
    
    try {
      // Save to database
      await groceryDb.groceryPreferences.update(preferences.id!, updatedPreferences);
      
      setNotification({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      setNotification({
        open: true,
        message: 'Failed to delete item',
        severity: 'error'
      });
      
      // Revert state if save fails
      loadPreferences();
    }
  };

  const handleAddFromCanadianProduct = (productId: string, productName: string) => {
    if (!preferences) return;
    
    // Add to canadianProducts array
    const updatedCanadianProducts = [
      ...(preferences.canadianProducts || []),
      productId
    ];
    
    // Also add as a regular item if it doesn't exist
    const updatedItems = [...preferences.items];
    if (!updatedItems.some(item => item.name === productName)) {
      updatedItems.push({
        id: `${Date.now()}-${Math.random()}`,
        name: productName,
        canadianProductId: productId,
        checked: false
      });
    }
    
    setPreferences({
      ...preferences,
      canadianProducts: updatedCanadianProducts,
      items: updatedItems
    });
    
    savePreferences();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Grocery Preferences</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={savePreferences}
        >
          Save Changes
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Categories</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', mb: 2 }}>
              <TextField
                label="New Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                size="small"
                fullWidth
                sx={{ mr: 1 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
                sx={{ minWidth: 0, p: 1 }}
              >
                <AddIcon />
              </Button>
            </Box>
            
            <List>
              {preferences?.categories?.map((category, index) => (
                <ListItem
                  key={index}
                  button
                  selected={selectedCategory === index}
                  onClick={() => setSelectedCategory(index)}
                  secondaryAction={
                    <>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(index);
                        }}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(index);
                        }}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={category.title}
                    secondary={`${category.items.length} items`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            {selectedCategory !== null && preferences?.categories ? (
              <>
                <Typography variant="h6" gutterBottom>
                  {preferences.categories[selectedCategory].title} Items
                </Typography>
                
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <TextField
                    label="New Item"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ mr: 1 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddItem}
                    disabled={!newItem.trim()}
                    sx={{ minWidth: 0, p: 1 }}
                  >
                    <AddIcon />
                  </Button>
                </Box>
                
                {preferences.categories[selectedCategory].items.length === 0 ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No items in this category. Add some items above.
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {preferences.categories[selectedCategory].items.map((item, itemIndex) => (
                      <ListItem
                        key={itemIndex}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteItem(selectedCategory, itemIndex)}
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Select a category from the left to manage its items
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={!!editingCategory}
        onClose={() => setEditingCategory(null)}
      >
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={editingCategory?.title || ''}
            onChange={(e) => setEditingCategory(prev => prev ? { ...prev, title: e.target.value } : null)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCategory(null)}>Cancel</Button>
          <Button onClick={handleSaveEditCategory} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}