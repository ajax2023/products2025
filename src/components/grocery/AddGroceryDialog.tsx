import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Grid,
  Paper,
  Checkbox,
  ListItemIcon,
  Collapse,
  InputAdornment,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { groceryDb, GroceryItem, GroceryList } from '../../config/groceryDb';
import { useAuth } from '../../auth/useAuth';

interface AddGroceryDialogProps {
  open: boolean;
  onClose: () => void;
  initialValues?: GroceryList | null;
  onSave: (list: GroceryList) => void;
}

interface AvailableItem {
  name: string;
  typicalPrice?: number;
  preferredStore?: string;
}

interface Category {
  title: string;
  items: AvailableItem[];
}

interface EditingItem {
  index: number;
  typicalPrice?: number;
  preferredStore?: string;
}

export default function AddGroceryDialog({
  open,
  onClose,
  initialValues,
  onSave,
}: AddGroceryDialogProps) {
  const { user } = useAuth();
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setListName(initialValues.name);
        setItems(initialValues.items);
      } else {
        setListName(`List ${new Date().toLocaleDateString()}`);
        setItems([]);
      }
      loadCategories();
    }
  }, [open, initialValues]);

  const loadCategories = async () => {
    if (!user) return;

    try {
      // Load grocery preferences
      const prefs = await groceryDb.groceryPreferences
        .where('userId')
        .equals(user.uid)
        .toArray();

      if (prefs.length > 0 && prefs[0].categories) {
        const loadedCategories = prefs[0].categories.map(cat => ({
          title: cat.title,
          items: cat.items.map(itemName => ({ name: itemName }))
        }));
        setCategories(loadedCategories);
      } else {
        // Default categories if none exist
        setCategories([
          { title: 'Produce', items: [] },
          { title: 'Dairy', items: [] },
          { title: 'Meat', items: [] },
          { title: 'Pantry', items: [] },
          { title: 'Frozen', items: [] },
          { title: 'Household', items: [] }
        ]);
      }

      // Load all available items from previous lists
      const allLists = await groceryDb.groceryLists
        .where('userId')
        .equals(user.uid)
        .toArray();

      const allItems = new Map<string, AvailableItem>();
      allLists.forEach(list => {
        list.items.forEach(item => {
          if (!allItems.has(item.name)) {
            allItems.set(item.name, {
              name: item.name,
              typicalPrice: item.typicalPrice,
              preferredStore: item.preferredStore
            });
          }
        });
      });

      setAvailableItems(Array.from(allItems.values()));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem: GroceryItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: newItemName,
      category: newItemCategory || undefined,
      checked: false,
    };

    console.log('Adding new item:', newItem);
    setItems(prevItems => [...prevItems, newItem]);
    setNewItemName('');
  };

  const handleSave = () => {
    if (!user || !listName.trim()) return;

    const list: GroceryList = {
      ...(initialValues?.id ? { id: initialValues.id } : {}),
      userId: user.uid,
      name: listName,
      date: Date.now(),
      items: items.map((item, index) => ({
        ...item,
        order: index
      }))
    };

    onSave(list);
    onClose();
  };

  const handleDeleteItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    setEditingItem({
      index,
      typicalPrice: items[index].typicalPrice,
      preferredStore: items[index].preferredStore
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[editingItem.index] = {
        ...newItems[editingItem.index],
        typicalPrice: editingItem.typicalPrice,
        preferredStore: editingItem.preferredStore
      };
      return newItems;
    });

    setEditingItem(null);
  };

  const handleCategoryItemClick = (item: AvailableItem) => {
    const newItem: GroceryItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: item.name,
      typicalPrice: item.typicalPrice,
      preferredStore: item.preferredStore,
      checked: false
    };

    setItems(prevItems => [...prevItems, newItem]);
  };

  const filteredAvailableItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(newItemName.toLowerCase())
  );

  useEffect(() => {
    if (newItemName.trim() && filteredAvailableItems.length > 0) {
      // Find the first matching item
      const matchingItem = filteredAvailableItems[0];
      
      // Find which category this item belongs to in our preferences
      for (const category of categories) {
        const categoryItems = category.items.map(item => 
          typeof item === 'string' ? item : item.name
        );
        
        if (categoryItems.some(itemName => 
          itemName.toLowerCase() === matchingItem.name.toLowerCase()
        )) {
          // Set the category if found
          setNewItemCategory(category.title);
          break;
        }
      }
    }
  }, [newItemName, filteredAvailableItems, categories]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {initialValues ? 'Edit Grocery List' : 'Create New Grocery List'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            label="List Name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Current Items
          </Typography>

          <Paper variant="outlined" sx={{ mb: 3, maxHeight: 200, overflow: 'auto' }}>
            {items.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No items added yet. Add items below.
                </Typography>
              </Box>
            ) : (
              <List dense>
                {items.map((item, index) => (
                  <ListItem
                    key={item.id}
                    secondaryAction={
                      <>
                        <IconButton
                          edge="end"
                          onClick={() => handleEditItem(index)}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteItem(index)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    }
                  >
                    <ListItemText
                      primary={item.name}
                      secondary={
                        <>
                          {item.category && (
                            <Chip
                              label={item.category}
                              size="small"
                              sx={{ mr: 1, mb: 0.5 }}
                            />
                          )}
                          {item.typicalPrice && `$${item.typicalPrice.toFixed(2)}`}
                          {item.typicalPrice && item.preferredStore && ' | '}
                          {item.preferredStore}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          {editingItem !== null && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Edit Item: {items[editingItem.index].name}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Typical Price"
                    type="number"
                    value={editingItem.typicalPrice || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        typicalPrice: e.target.value ? Number(e.target.value) : undefined
                      })
                    }
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      inputProps: { min: 0, step: 0.01 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Preferred Store"
                    value={editingItem.preferredStore || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        preferredStore: e.target.value
                      })
                    }
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => setEditingItem(null)}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </Button>
              </Box>
            </Paper>
          )}

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Add New Item
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField
                label="Item Name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                fullWidth
                variant="outlined"
                autoComplete="off"
                InputProps={{
                  endAdornment: newItemName && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setNewItemName('')}
                        edge="end"
                        size="small"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              {newItemName.trim() && filteredAvailableItems.length > 0 && (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    position: 'absolute', 
                    zIndex: 1000, 
                    width: '100%', 
                    maxHeight: 200, 
                    overflow: 'auto',
                    mt: 0.5
                  }}
                >
                  <List dense>
                    {filteredAvailableItems.slice(0, 5).map((item, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => {
                          setNewItemName(item.name);
                          // Find and set the appropriate category
                          for (const category of categories) {
                            const categoryItems = category.items.map(catItem => 
                              typeof catItem === 'string' ? catItem : catItem.name
                            );
                            
                            if (categoryItems.some(itemName => 
                              itemName.toLowerCase() === item.name.toLowerCase()
                            )) {
                              setNewItemCategory(category.title);
                              break;
                            }
                          }
                        }}
                      >
                        <ListItemText
                          primary={item.name}
                          secondary={
                            <>
                              {item.typicalPrice && `$${item.typicalPrice.toFixed(2)}`}
                              {item.typicalPrice && item.preferredStore && ' | '}
                              {item.preferredStore}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Category</InputLabel>
                <Select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {categories.map((category, index) => (
                    <MenuItem key={index} value={category.title}>
                      {category.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
                fullWidth
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!listName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}