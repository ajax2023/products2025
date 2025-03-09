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
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../auth/useAuth';
import { Update } from '../types/update';
import { getUpdates } from '../services/updateService';
import UpdateManager from './UpdateManager';
import ProductSubmissionForm from './product/ProductSubmissionForm';

export default function AboutCanadianProducts() {
  const { user, claims } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUpdates, setExpandedUpdates] = useState<Record<string, boolean>>({});
  const [speakingUpdateId, setSpeakingUpdateId] = useState<string | null>(null);

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

    // Cleanup speech synthesis when component unmounts
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.gofundme.com/static/js/embed.js';
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
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

  // Text-to-speech functionality
  const speakUpdate = (update: Update) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Create utterance with update title and content
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = `${update.title}. ${update.content}`;
    utterance.lang = 'en-CA';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Set speaking update ID
    setSpeakingUpdateId(update.id);

    // Handle when speech ends
    utterance.onend = () => {
      setSpeakingUpdateId(null);
    };

    // Handle speech errors
    utterance.onerror = () => {
      setSpeakingUpdateId(null);
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingUpdateId(null);
    }
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

      <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <ProductSubmissionForm />
        </Box>
     
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

        <Box sx={{ textAlign: 'center' }}>
          <a href="https://www.gofundme.com/f/buy-canadian-help-build-the-ultimate-local-product-finder" target="_blank" rel="noopener noreferrer">
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<FavoriteIcon />}
              size="large"
              sx={{ py: 1, px: 2 }}
            >
              GoFundMe - Support This Project
            </Button>
          </a>
        </Box>
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
          elevation={10}
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
          elevation={10}
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
              elevation={10}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                position: 'relative'
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1,
                display: 'flex',
                gap: 1
              }}>
                {/* Text-to-Speech Button */}
                <Tooltip title={speakingUpdateId === update.id ? "Stop Reading" : "Read Aloud"}>
                  <IconButton
                    size="small"
                    color={speakingUpdateId === update.id ? "secondary" : "primary"}
                    onClick={() => speakingUpdateId === update.id ? stopSpeaking() : speakUpdate(update)}
                    aria-label={speakingUpdateId === update.id ? "Stop reading" : "Read update aloud"}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 180,
                      zIndex: 1
                    }}
                  >
                    {speakingUpdateId === update.id ? <StopIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                {/* Edit Button (Admin only) */}
                {isAdmin && (
                  <IconButton
                    size="small"
                    onClick={() => handleEditUpdate(update)}
                    aria-label="Edit update"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                <Box sx={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between',
                  mb: 1,
                  pr: 8 // Add padding for the buttons
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
