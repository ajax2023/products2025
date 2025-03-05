import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../auth/useAuth';
import { Update } from '../types/update';
import { getUpdates } from '../services/updateService';
import UpdateManager from './UpdateManager';

export default function AboutCanadianProducts() {
  const { user, claims } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUpdates, setExpandedUpdates] = useState<Record<string, boolean>>({});
  
  // State for update manager dialog
  const [updateManagerOpen, setUpdateManagerOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null);
  
  // Check if user is admin
  const isAdmin = user?.email === 'ajax@online101.ca' || claims?.role === 'super_admin' || claims?.role === 'admin';
  
  // Fetch updates from Firestore
  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const updatesData = await getUpdates();
      setUpdates(updatesData);
      setError(null);
    } catch (err) {
      console.error('Error fetching updates:', err);
      setError('Failed to load updates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUpdates();
  }, []);
  
  // Toggle expanded state for an update
  const toggleExpand = (updateId: string) => {
    setExpandedUpdates(prev => ({
      ...prev,
      [updateId]: !prev[updateId]
    }));
  };
  
  // Handle opening the update manager for adding a new update
  const handleAddUpdate = () => {
    setSelectedUpdate(null);
    setUpdateManagerOpen(true);
  };
  
  // Handle opening the update manager for editing an existing update
  const handleEditUpdate = (update: Update) => {
    setSelectedUpdate(update);
    setUpdateManagerOpen(true);
  };
  
  // Handle closing the update manager
  const handleCloseUpdateManager = () => {
    setUpdateManagerOpen(false);
  };
  
  // Handle after an update is saved or deleted
  const handleUpdateSaved = () => {
    fetchUpdates();
  };
  
  // Function to truncate content and add "Read More" button
  const renderUpdateContent = (update: Update) => {
    const isExpanded = expandedUpdates[update.id] || false;
    const content = update.content || '';
    
    // Split content into lines and get first 3 lines
    const lines = content.split('\n');
    const firstThreeLines = lines.slice(0, 3).join('\n');
    
    // Check if content needs truncation
    const needsTruncation = lines.length > 3 || content.length > 300;
    
    // Custom components for markdown rendering
    const markdownComponents = {
      p: ({ children }: any) => (
        <Typography 
          component="p" 
          variant="body1" 
          color="text.primary"
          sx={{ 
            mt: 1,
            mb: 1
          }}
        >
          {children}
        </Typography>
      ),
      // Add more custom components as needed
    };
    
    if (!needsTruncation) {
      return (
        <Box sx={{ mt: 1 }}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </Box>
      );
    }
    
    return (
      <>
        <Box sx={{ mt: 1 }}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {isExpanded ? content : firstThreeLines + (needsTruncation ? '...' : '')}
          </ReactMarkdown>
        </Box>
        <Button 
          onClick={() => toggleExpand(update.id)} 
          sx={{ mt: 2 }}
          size="small"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </Button>
      </>
    );
  };
  
  // Format date for display
  const formatDate = (dateValue: Date | string) => {
    if (!dateValue) return '';
    
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <Typography variant="h5" component="h1" color="primary" align="center" gutterBottom>
        About Canadian Products
      </Typography>
      
      {/* App Made in Canada */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        my: 1 
      }}>
        <img 
          src="/2.png" 
          alt="Canada Flag" 
          style={{ 
            width: '120px', 
            height: 'auto' 
          }} 
        />
      </Box>
      
      <Typography variant="h6" align="center" gutterBottom>
      This application is proudly made in Canada—created by Canadians, for Canadians, and for those who support Canada!
      </Typography>
      
      <Typography variant="body1" align="center" sx={{ mb: 1 }}>
        Designed and developed to help Canadians discover and support local products and businesses.
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: 4,
        justifyContent: 'center',
        mb: 4
      }}>
        {/* Product of Canada */}
        <Paper
          elevation={6}
          sx={{
            bgcolor: 'success.light',
            color: 'success.dark',
            p: 2,
            borderLeft: '5px solid',
            borderColor: 'success.main',
            borderRadius: 2,
            flex: 1,
            maxWidth: { xs: '100%', md: '45%' }
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 2
          }}>
            <img 
              src="/Product_of_Canada.png" 
              alt="Product of Canada" 
              style={{ 
                width: '80px', 
                height: 'auto',
                marginRight: '16px'
              }} 
            />
            <Typography variant="h5" fontWeight="bold">
              Product of Canada
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            When you see a "Product of Canada" label, it means that at least 98% of the ingredients, processing, and labor costs are Canadian.
          </Typography>
          
          <Typography variant="body1">
            These products represent the highest standard of Canadian content and support local farmers, manufacturers, and the Canadian economy.
          </Typography>
        </Paper>

        {/* Made in Canada */}
        <Paper
          elevation={6}
          sx={{
            bgcolor: 'primary.light',
            color: 'primary.dark',
            p: 1,
            borderLeft: '5px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            flex: 1,
            maxWidth: { xs: '100%', md: '45%' }
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 1
          }}>
            <img 
              src="/Made_in_Canada.png" 
              alt="Made in Canada" 
              style={{ 
                width: '80px', 
                height: 'auto',
                marginRight: '16px'
              }} 
            />
            <Typography variant="h5" fontWeight="bold">
              Made in Canada
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            The "Made in Canada" designation indicates that at least 51% of the total direct costs of producing or manufacturing the product occurred in Canada.
          </Typography>
          
          <Typography variant="body1">
            While these products may contain some imported ingredients or components, they still represent significant Canadian contribution and support local jobs.
          </Typography>
        </Paper>
      </Box>
      
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        By choosing Canadian products, you're supporting local businesses, reducing environmental impact from shipping, and helping strengthen the Canadian economy.
      </Typography>

      {/* Updates and News Section */}
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" color="primary">
          Updates and News
        </Typography>
        
        {isAdmin && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAddUpdate}
          >
            Add Update
          </Button>
        )}
      </Box>
      
      <Typography variant="body2" align="center" sx={{ mb: 2, color: 'text.secondary' }}>
        Stay informed about our latest features, press releases, and Canadian product news.
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" align="center" sx={{ my: 2 }}>
          {error}
        </Typography>
      ) : updates.length === 0 ? (
        <Typography align="center" sx={{ my: 2 }}>
          No updates available at this time.
        </Typography>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {updates.map((update) => (
            <Paper 
              key={update.id}
              elevation={8}
              sx={{ 
                mb: 3, 
                p: 2,
                borderRadius: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                position: 'relative'
              }}
            >
              {isAdmin && (
                <IconButton 
                  size="small"
                  onClick={() => handleEditUpdate(update)}
                  sx={{ 
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              
              <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                <Box sx={{ 
                  display: 'flex', 
                  width: '100%', 
                  justifyContent: 'space-between',
                  mb: 1,
                  pr: isAdmin ? 4 : 0 // Add padding when admin button is shown
                }}>
                  <Typography variant="h6" color="primary">
                    {update.title}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {formatDate(update.createdAt)}
                  </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                  {renderUpdateContent(update)}
                </Box>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
      
      {/* Update Manager Dialog */}
      {updateManagerOpen && (
        <UpdateManager
          open={updateManagerOpen}
          onClose={handleCloseUpdateManager}
          update={selectedUpdate}
          userId={user?.uid || ''}
          onUpdateSaved={handleUpdateSaved}
        />
      )}
    </Container>
  );
}
