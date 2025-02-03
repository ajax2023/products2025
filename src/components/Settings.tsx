import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
  Paper,
  Avatar,
  FormGroup
} from '@mui/material';
import { auth, db } from '../firebaseConfig';
import { getDoc, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { updateProfile, reauthenticateWithPopup, GoogleAuthProvider, deleteUser } from 'firebase/auth';
import { UserSettings } from '../types/user';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';

const getGravatarUrl = (email: string) => {
  const hash = require('crypto').createHash('md5').update(email.toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=80&d=identicon`;
};

export default function Settings() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    location: {
      country: 'Canada',
      province: '',
      city: ''
    },
    preferences: {
      language: 'English',
      currency: 'CAD'
    },
    sharing: {
      showPicture: true,
      showUsername: true,
      showCountry: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      if (!auth.currentUser) return;

      try {
        const settingsDoc = await getDoc(doc(db, 'userSettings', auth.currentUser.uid));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as UserSettings;
          setUserSettings(prev => ({
            ...prev,
            ...data
          }));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;

    try {
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), {
        ...userSettings,
        updatedAt: new Date(),
      });

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Error saving settings. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      
      // Reauthenticate first
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(auth.currentUser, provider);
      
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'userSettings', auth.currentUser.uid));
      
      // Delete user from Firebase Auth
      await deleteUser(auth.currentUser);
      
      // User will be automatically signed out
    } catch (error: any) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign in again before deleting your account.');
      } else {
        setError('Failed to delete account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading settings...</Box>;
  }

  return (
    <Box sx={{ p: 2, maxWidth: 800, margin: '0 auto' }}>
      <Paper elevation={0} sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {/* Profile Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      sx={{ width: 70, height: 70, mb: 0.5 }}
                      src={auth.currentUser?.photoURL || getGravatarUrl(auth.currentUser?.email || '')}
                    >
                      <PersonIcon />
                    </Avatar>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                      {auth.currentUser?.photoURL ? 'Google Photo' : 'Gravatar'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Display Name"
                        value={auth.currentUser?.displayName || ''}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={auth.currentUser?.email || ''}
                        size="small"
                        disabled
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Location and Preferences Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {/* Location Fields */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Country"
                    defaultValue="Canada"
                    value={userSettings.location.country}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        country: e.target.value
                      }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Province"
                    value={userSettings.location.province}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        province: e.target.value
                      }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={userSettings.location.city}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        city: e.target.value
                      }
                    }))}
                  />
                </Grid>

                {/* Preferences Fields */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Language"
                    defaultValue="English"
                    value={userSettings.preferences.language}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        language: e.target.value
                      }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Currency"
                    defaultValue="CAD"
                    value={userSettings.preferences.currency}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        currency: e.target.value
                      }
                    }))}
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Sharing Preferences Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LockIcon sx={{ fontSize: '1rem', mr: 1, color: 'text.secondary' }} />
                <Typography variant="h6" gutterBottom>
                  Privacy & Sharing
                </Typography>
              </Box>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.sharing.showPicture}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        sharing: {
                          ...prev.sharing,
                          showPicture: e.target.checked
                        }
                      }))}
                    />
                  }
                  label="Show profile picture to others"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.sharing.showUsername}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        sharing: {
                          ...prev.sharing,
                          showUsername: e.target.checked
                        }
                      }))}
                    />
                  }
                  label="Show username to others"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.sharing.showCountry}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        sharing: {
                          ...prev.sharing,
                          showCountry: e.target.checked
                        }
                      }))}
                    />
                  }
                  label="Show country to others"
                />
              </FormGroup>
            </Card>
          </Grid>

          {/* Actions Section */}
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 1 
            }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                size="small"
              >
                Save Changes
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleSignOut}
                size="small"
              >
                Sign Out
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                Delete Account
              </Button>
            </Box>
            {saveMessage && (
              <Typography
                color={saveMessage.includes('Error') ? 'error' : 'success'}
                sx={{ mt: 1, fontSize: '0.875rem' }}
              >
                {saveMessage}
              </Typography>
            )}
            {error && (
              <Typography
                color="error"
                sx={{ mt: 1, fontSize: '0.875rem' }}
              >
                {error}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
