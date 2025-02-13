import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import { doc, addDoc, collection, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Product, PRODUCT_CATEGORIES } from '../../types/product';
import { uploadImageToStorage } from '../../utils/imageUtils';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ImageIcon from '@mui/icons-material/Image';
import CameraDialog from '../CameraDialog';
import CountrySelect from './CountrySelect';

interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  showMessage: (message: string, severity: 'success' | 'error') => void;
  user: any;
  companies: any[];
  handleNewCompany: (action: string) => void;
}

export default function AddProductDialog({ 
  open, 
  onClose, 
  onSuccess, 
  showMessage, 
  user,
  companies,
  handleNewCompany 
}: AddProductDialogProps) {
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    brand: "",
    category: "Food & Beverage",
    company_id: "",
    origin: {
      country: "Canada",
      province: "",
      city: ""
    },
    product_tags: {},
    prices: [],
    image: "",
    canadianOriginType: null
  });

  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [flagPickerOpen, setFlagPickerOpen] = useState(false);
  
  const attributeNameRef = useRef<HTMLInputElement>(null);
  const attributeValueRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    try {
      if (!newProduct.name || !newProduct.category || !newProduct.canadianOriginType) {
        showMessage("Name, Category, and Origin are required", "error");
        return;
      }

      // Verify user role first
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.error('User document not found:', user.uid);
        showMessage("User profile not found. Please try signing out and in again.", "error");
        return;
      }

      const userData = userSnap.data();
      if (!userData.role || (userData.role !== 'contributor' && userData.role !== 'admin' && userData.role !== 'super_admin')) {
        showMessage("You don't have permission to create products. Please request contributor access.", "error");
        return;
      }

      const productData = {
        ...newProduct,
        image: "", // Initialize with empty image URL
        created_at: new Date().toISOString(),
        created_by: user.uid,
        created_by_email: user.email || '',
        created_by_name: user.displayName || '',
        updated_at: new Date().toISOString(),
        updated_by: user.uid,
        updated_by_name: user.displayName || '',
        status: 'draft',
        is_active: true,
        version: 1
      };

      const productRef = await addDoc(collection(db, "products"), productData);

      // If there's an image (in base64), upload it to storage
      if (newProduct.image && typeof newProduct.image === 'string' && newProduct.image.startsWith('data:image')) {
        const imageUrl = await uploadImageToStorage(newProduct.image, productRef.id);
        await updateDoc(productRef, { image: imageUrl });
        productData.image = imageUrl;
      }

      const productWithId = { ...productData, _id: productRef.id } as Product;
      onSuccess(productWithId);
      
      setNewProduct({
        name: "",
        brand: "",
        category: "Food & Beverage",
        company_id: "",
        origin: {
          country: "Canada",
          province: "",
          city: ""
        },
        product_tags: {},
        prices: [],
        image: "",
        canadianOriginType: null
      });

      showMessage("Product added successfully", "success");
      onClose();
    } catch (error) {
      console.error("Error adding product:", error);
      showMessage("Failed to add product. Please try again.", "error");
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setNewProduct(prev => ({ ...prev, image: base64String }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      showMessage('Failed to upload image', 'error');
    }
  };

  const handleImageCapture = (imageUrl: string) => {
    setNewProduct(prev => ({ ...prev, image: imageUrl }));
    setShowCameraDialog(false);
  };

  const handleCountrySelect = (country: string) => {
    setNewProduct(prev => ({
      ...prev,
      canadianOriginType: country,
      origin: {
        ...prev.origin,
        country: country
      }
    }));
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {/* NAME AND BRAND INPUT */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Brand"
                value={newProduct.brand}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, brand: e.target.value }))}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {/* CATEGORY */}
              {!showNewCategoryInput ? (
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newProduct.category}
                    label="Category"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "add_new") {
                        setShowNewCategoryInput(true);
                        setNewProduct((prev) => ({ ...prev, category: "" }));
                      } else {
                        setNewProduct((prev) => ({ ...prev, category: value }));
                      }
                    }}
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                    <MenuItem value="add_new">
                      <em>+ Add New Category</em>
                    </MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField fullWidth label="New Category" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} required />
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (newCategoryInput.trim()) {
                        setNewProduct((prev) => ({ ...prev, category: newCategoryInput.trim() }));
                        if (!PRODUCT_CATEGORIES.includes(newCategoryInput.trim())) {
                          PRODUCT_CATEGORIES.push(newCategoryInput.trim());
                        }
                        setShowNewCategoryInput(false);
                        setNewCategoryInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>

            {/* Canadian Origin Type */}
            <Box sx={{ mt: 0 }}>
              {!newProduct.canadianOriginType && (
                <Typography variant="caption" color="error" >
                  Please select the Country of Origin
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant={newProduct.canadianOriginType === 'product_of_canada' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'product_of_canada'
                  }))}
                  sx={{ 
                    borderColor: 'success.main',
                    color: newProduct.canadianOriginType === 'product_of_canada' ? 'white' : 'success.main',
                    bgcolor: newProduct.canadianOriginType === 'product_of_canada' ? 'success.main' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === 'product_of_canada' ? 'success.dark' : 'success.light',
                      borderColor: 'success.main'
                    }
                  }}
                >
                  🍁 Product of Canada (98%+)
                </Button>

                <Button
                  variant={newProduct.canadianOriginType === 'made_in_canada' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'made_in_canada'
                  }))}
                  sx={{ 
                    borderColor: 'primary.main',
                    color: newProduct.canadianOriginType === 'made_in_canada' ? 'white' : 'primary.main',
                    bgcolor: newProduct.canadianOriginType === 'made_in_canada' ? 'primary.main' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === 'made_in_canada' ? 'primary.dark' : 'primary.light',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  🍁 Made in Canada (51%+)
                </Button>

                <Button
                  variant={newProduct.canadianOriginType === 'canada_with_imports' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'canada_with_imports'
                  }))}
                  sx={{ 
                    borderColor: 'info.main',
                    color: newProduct.canadianOriginType === 'canada_with_imports' ? 'white' : 'info.main',
                    bgcolor: newProduct.canadianOriginType === 'canada_with_imports' ? 'info.main' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === 'canada_with_imports' ? 'info.dark' : 'info.light',
                      borderColor: 'info.main'
                    }
                  }}
                >
                  🍁 Made in Canada (with imports)
                </Button>

                <Button
                  variant={newProduct.canadianOriginType === 'not_canadian' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setNewProduct(prev => ({
                    ...prev,
                    canadianOriginType: 'not_canadian'
                  }))}
                  sx={{ 
                    borderColor: 'grey.500',
                    color: newProduct.canadianOriginType === 'not_canadian' ? 'white' : 'grey.500',
                    bgcolor: newProduct.canadianOriginType === 'not_canadian' ? 'grey.500' : 'transparent',
                    '&:hover': {
                      bgcolor: newProduct.canadianOriginType === 'not_canadian' ? 'grey.600' : 'grey.100',
                      borderColor: 'grey.500'
                    }
                  }}
                >
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span role="img" aria-label="question mark">❓</span>
                    <span>Unknown</span>
                  </Box>
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setFlagPickerOpen(true)}
                  sx={{ borderColor: 'grey.500', color: 'grey.500' }}
                >
                  🌐 Select Country
                </Button>
              </Box>
            </Box>

            {/* COMPANY SELECT */}
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <FormControl fullWidth>
                <InputLabel>Company</InputLabel>
                <Select
                  value={newProduct.company_id || ""}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, company_id: e.target.value }))}
                  label="Company"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company._id} value={company._id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* ADD NEW COMPANY */}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => handleNewCompany("add")} variant="outlined">
                  Add New Company
                </Button>
              </Box>
            </Box>

            <Box sx={{ p: 0 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Camera and Image Upload Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<CameraAltIcon />}
                    onClick={() => setShowCameraDialog(true)}
                  >
                    Take Product Picture
                  </Button>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon />}
                  >
                    Upload Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                  {newProduct.image && (
                    <img 
                      src={newProduct.image} 
                      alt="Product" 
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* Tags Section */}
            <Box sx={{ mt: 0 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                {Object.entries(newProduct.product_tags || {}).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => {
                      setNewProduct((prev) => {
                        const newTags = { ...prev.product_tags };
                        delete newTags[key];
                        return { ...prev, product_tags: newTags };
                      });
                    }}
                    size="small"
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <TextField label="Tag Name" size="small" inputRef={attributeNameRef} />
                <TextField label="Value" size="small" fullWidth inputRef={attributeValueRef} />
                <Button
                  variant="outlined"
                  onClick={() => {
                    const name = attributeNameRef.current?.value;
                    const value = attributeValueRef.current?.value;
                    if (name && value) {
                      setNewProduct((prev) => ({
                        ...prev,
                        product_tags: {
                          ...prev.product_tags,
                          [name]: value
                        }
                      }));
                      if (attributeNameRef.current) attributeNameRef.current.value = "";
                      if (attributeValueRef.current) attributeValueRef.current.value = "";
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Add Product
          </Button>
        </DialogActions>
      </Dialog>

      <CameraDialog
        open={showCameraDialog}
        onClose={() => setShowCameraDialog(false)}
        onCapture={handleImageCapture}
      />

      <CountrySelect
        open={flagPickerOpen}
        onClose={() => setFlagPickerOpen(false)}
        onSelect={handleCountrySelect}
      />
    </>
  );
}
