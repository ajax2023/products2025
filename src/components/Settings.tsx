import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Grid,
  Card,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  FormGroup,
  Alert
} from '@mui/material';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { 
  updateProfile, 
  deleteUser, 
  GoogleAuthProvider,
  reauthenticateWithPopup
} from 'firebase/auth';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';

interface Location {
  country: string;
  state: string;
  city: string;
}

interface Preferences {
  language: string;
  currency: string;
}

interface SharingPreferences {
  showEmail: boolean;
  showLocation: boolean;
  showProducts: boolean;
  allowMessages: boolean;
}

interface UserSettings {
  name: string;
  email: string;
  role: 'contributor' | 'admin' | 'user';
  location: Location;
  preferences: Preferences;
  sharing: SharingPreferences;
  approved: boolean;
  updatedAt: Date;
}

const LANGUAGES = ['English', 'French', 'Spanish'];
const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP'];
const COUNTRIES = ['United States', 'Canada', 'United Kingdom'];
const STATES = {
  'United States': ['California', 'New York', 'Texas'],
  'Canada': ['Ontario', 'British Columbia', 'Quebec'],
  'United Kingdom': ['England', 'Scotland', 'Wales']
};

const getGravatarUrl = (email: string) => {
  const hash = require('crypto').createHash('md5').update(email.toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=80&d=identicon`;
};

export default function Settings() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: auth.currentUser?.displayName || '',
    email: auth.currentUser?.email || '',
    role: 'contributor',
    location: {
      country: '',
      state: '',
      city: ''
    },
    preferences: {
      language: 'English',
      currency: 'USD'
    },
    sharing: {
      showEmail: false,
      showLocation: true,
      showProducts: true,
      allowMessages: true
    },
    approved: false,
    updatedAt: new Date()
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
            ...data,
            email: auth.currentUser?.email || '', // Always use auth email
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
      // Update auth profile
      await updateProfile(auth.currentUser, {
        displayName: userSettings.name
      });

      // Save to Firestore
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), {
        ...userSettings,
        updatedAt: new Date(),
      });

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    }
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  const handleSharingChange = (key: keyof SharingPreferences) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserSettings(prev => ({
      ...prev,
      sharing: {
        ...prev.sharing,
        [key]: event.target.checked
      }
    }));
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
      await deleteDoc(doc(db, 'users', auth.currentUser.uid));
      
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
                      src={auth.currentUser?.photoURL || getGravatarUrl(userSettings.email)}
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
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Name"
                        value={userSettings.name}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, name: e.target.value }))}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={userSettings.email}
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
                  <FormControl fullWidth size="small">
                    <InputLabel>Country</InputLabel>
                    <Select
                      value={userSettings.location.country}
                      label="Country"
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        location: {
                          ...prev.location,
                          country: e.target.value,
                          state: ''
                        }
                      }))}
                    >
                      {COUNTRIES.map(country => (
                        <MenuItem key={country} value={country}>{country}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>State/Province</InputLabel>
                    <Select
                      value={userSettings.location.state}
                      label="State/Province"
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        location: {
                          ...prev.location,
                          state: e.target.value
                        }
                      }))}
                      disabled={!userSettings.location.country}
                    >
                      {userSettings.location.country && 
                        STATES[userSettings.location.country as keyof typeof STATES].map(state => (
                          <MenuItem key={state} value={state}>{state}</MenuItem>
                        ))
                      }
                    </Select>
                  </FormControl>
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
                    size="small"
                  />
                </Grid>

                {/* Preferences Fields */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={userSettings.preferences.language}
                      label="Language"
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          language: e.target.value
                        }
                      }))}
                    >
                      {LANGUAGES.map(lang => (
                        <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={userSettings.preferences.currency}
                      label="Currency"
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          currency: e.target.value
                        }
                      }))}
                    >
                      {CURRENCIES.map(currency => (
                        <MenuItem key={currency} value={currency}>{currency}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Sharing Preferences Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LockIcon sx={{ fontSize: '1rem', mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Privacy & Sharing
                </Typography>
              </Box>
              <FormGroup>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={userSettings.sharing.showEmail}
                          onChange={handleSharingChange('showEmail')}
                        />
                      }
                      label={<Typography variant="body2">Show email to others</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={userSettings.sharing.showLocation}
                          onChange={handleSharingChange('showLocation')}
                        />
                      }
                      label={<Typography variant="body2">Show location on profile</Typography>}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={userSettings.sharing.showProducts}
                          onChange={handleSharingChange('showProducts')}
                        />
                      }
                      label={<Typography variant="body2">Show my products publicly</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={userSettings.sharing.allowMessages}
                          onChange={handleSharingChange('allowMessages')}
                        />
                      }
                      label={<Typography variant="body2">Allow messages from others</Typography>}
                    />
                  </Grid>
                </Grid>
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
                sx={{ mt: 2 }}
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
