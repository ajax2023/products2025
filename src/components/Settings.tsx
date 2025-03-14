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
  FormGroup,
  Alert
} from '@mui/material';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { 
  GoogleAuthProvider, 
  reauthenticateWithPopup,
  deleteUser 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch
} from 'firebase/firestore';
import { UserSettings, User } from '../types/user';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../auth/useAuth';

const getModifiedPhotoUrl = (url: string | null) => {
  if (!url) return '';
  // Replace s96-c with s400 for larger size
  return url.replace('s96-c', 's400');
};

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const defaultSettings: UserSettings = {
    _id: '',
    email: '',
    displayName: '',
    role: 'viewer', // Default role is viewer
    status: 'active',
    location: {
      country: 'Canada',
      province: '',
      city: ''
    },
    preferences: {
      language: 'English',
      currency: 'CAD',
      useLocation: false
    },
    sharing: {
      showPicture: false,
      showUsername: false,
      showCountry: false,
      showOnLeaderboard: false
    },
    created_at: new Date().toISOString(),
    created_by: ''
  };

  const [userSettings, setUserSettings] = useState<UserSettings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [contributorRequestStatus, setContributorRequestStatus] = useState<'none' | 'pending' | 'sent'>('none');

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError('');
        setLoading(true);

        // Get user and settings documents in parallel
        const [userDoc, settingsDoc] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getDoc(doc(db, 'userSettings', user.uid))
        ]);
        
        if (!userDoc.exists()) {
          console.error('User document not found after login');
          setError('Error loading user data. Please try signing out and in again.');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        setUserRole(userData.role);

        // Try to get cached settings for UI only
        const cachedSettings = localStorage.getItem(`userSettings-${user.uid}`);
        if (cachedSettings) {
          const parsedSettings = JSON.parse(cachedSettings);
          setUserSettings(parsedSettings);
        }

        let settingsData: UserSettings;
        if (!settingsDoc.exists()) {
          settingsData = {
            ...defaultSettings,
            _id: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            role: userData.role,
            created_by: user.uid
          };
          await setDoc(doc(db, 'userSettings', user.uid), settingsData);
        } else {
          const rawSettingsData = settingsDoc.data() as UserSettings;
          settingsData = {
            ...defaultSettings,
            ...rawSettingsData,
            sharing: {
              ...defaultSettings.sharing,
              ...rawSettingsData.sharing
            }
          };
        }

        // Cache the settings
        localStorage.setItem(`userSettings-${user.uid}`, JSON.stringify(settingsData));
        
        setUserSettings(settingsData);
        setLoading(false);
        setError('');
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Error loading settings. Please try again.');
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadSettings();
    }
  }, [user, authLoading]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setSaveMessage('');

      const updates = [];

      // Update display name in Firebase Auth if it changed
      if (userSettings.displayName !== user.displayName) {
        updates.push(
          updateProfile(user, {
            displayName: userSettings.displayName
          }),
          setDoc(doc(db, 'users', user.uid), {
            displayName: userSettings.displayName,
            updated_at: new Date().toISOString(),
            updated_by: user.uid
          }, { merge: true })
        );
      }

      // Update settings
      updates.push(
        setDoc(doc(db, 'userSettings', user.uid), {
          ...userSettings,
          updated_at: new Date().toISOString(),
          updated_by: user.uid
        }, { merge: true })
      );

      // Execute all updates in parallel
      await Promise.all(updates);

      // Update cache
      localStorage.setItem(`userSettings-${user.uid}`, JSON.stringify(userSettings));

      setSaveMessage('Settings saved successfully');
      setLoading(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Error saving settings. Please try again.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      setError('You must be logged in to delete your account');
      return;
    }

    const confirmDelete = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      
      // Get the current user's ID
      const uid = user.uid;
      console.log('Current UID:', uid);
      
      // Reauthenticate first
      const provider = new GoogleAuthProvider();
      try {
        const result = await reauthenticateWithPopup(user, provider);
        console.log('Reauthentication successful:', result.user.uid);
      } catch (error: any) {
        console.error('Error reauthenticating:', error);
        setError('Failed to reauthenticate. Please try signing in again.');
        return;
      }

      // Delete Firestore documents first while we're still authenticated
      try {
        console.log('Attempting to delete user data...');
        
        // Delete userSettings if it exists
        const userSettingsRef = doc(db, 'userSettings', uid);
        await deleteDoc(userSettingsRef);
        console.log('UserSettings document deleted');

        // Delete user document
        const userRef = doc(db, 'users', uid);
        await deleteDoc(userRef);
        console.log('User document deleted');

      } catch (error: any) {
        console.error('Error deleting Firestore documents:', error);
        throw new Error(`Failed to delete user data: ${error.message}`);
      }

      // Then delete Auth user
      try {
        console.log('Attempting to delete Auth user...');
        await deleteUser(user);
        console.log('Auth user deleted successfully');
        
        // Redirect to login page immediately
        window.location.replace('/login');
      } catch (error: any) {
        console.error('Error deleting auth user:', error);
        throw new Error(`Auth user deletion failed: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error in deletion process:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign in again before deleting your account.');
      } else {
        setError(`Failed to delete account: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContributorRequest = async () => {
    if (!user) return;

    try {
      // Create a contributor request
      await addDoc(collection(db, 'contributorRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        status: 'pending',
        createdAt: new Date(),
        currentRole: userRole
      });

      setContributorRequestStatus('sent');
      setSaveMessage('Contributor request sent successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error sending contributor request:', error);
      setError('Failed to send contributor request. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return <Box sx={{ p: 1 }}>Loading settings...</Box>;
  }

  return (
    <Box sx={{ p: 0.5, maxWidth: 900, margin: '0px auto' }}>
      <Paper elevation={10} sx={{ p: 0.5 }}>
        <Grid container spacing={2}>
          {/* Profile Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      sx={{ width: 70, height: 70, mb: 1 }}
                      src={user?.photoURL || ''}
                      alt={user?.displayName || 'User'}
                      imgProps={{
                        referrerPolicy: "no-referrer",
                        crossOrigin: "anonymous",
                        onError: () => {
                          console.log("Failed to load image");
                        }
                      }}
                    >
                      <PersonIcon />
                    </Avatar>
                    <Typography variant="body2" color="textSecondary">
                      {user?.displayName || user?.email || 'User'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Display Name"
                        value={userSettings.displayName}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          displayName: e.target.value
                        }))}
                        size="small"
                        helperText="This name will be shown to other users"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={user?.email || ''}
                        size="small"
                        disabled
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Location Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <LocationOnIcon color="primary" />
                <Typography variant="h6">Location</Typography>

                <FormControlLabel
                    control={
                      <Switch
                        checked={userSettings.preferences.useLocation}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            useLocation: e.target.checked
                          }
                        }))}
                        disabled={!userSettings.location.country || !userSettings.location.province || !userSettings.location.city}
                      />
                    }
                    label={
                      <Box>
                        <Typography>Use My Location</Typography>
                        {(!userSettings.location.country || !userSettings.location.province || !userSettings.location.city) && (
                          <Typography variant="caption" color="text.secondary">
                            Fill in your location details above to enable this option
                          </Typography>
                        )}
                      </Box>
                    }
                  />
          
              </Box> */}
              <Grid container spacing={1}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Country"
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
                    label="Province/State"
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
                    required
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
                {/* <Grid item xs={12}>
                  
                </Grid> */}
              </Grid>
            </Card>
          </Grid>

          {/* Preferences Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">Preferences</Typography>
              </Box>
              <Grid container spacing={2}>
                {/* Preferences Fields */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Language"
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

          {/* Role Section */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <WorkIcon color="primary" />
                <Typography variant="h6">Role & Permissions</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  Current Role: <strong>{loading ? 'Loading...' : userRole}</strong>
                </Typography>
                {!loading && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {userRole === 'viewer' && 'As a viewer, you can view products.'}
                    {userRole === 'contributor' && 'As a contributor, you can add products.'}
                    {userRole === 'admin' && 'As an admin, you have full access to manage products, and users.'}
                    {userRole === 'super_admin' && 'As a super admin, you have complete control over the system.'}
                    {!user && 'Unregistered User - you can access a small number of products.'}
                  </Typography>
                )}
              </Box>
              {!user && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    You currently have access to a limited number of features.
                  </Typography>
                  <Typography variant="body2">
                    Register <strong>FOR FREE</strong> to unlock access to our full database of 1,500+ Canadian products.                  </Typography>
                  <Typography variant="body2">
                    We're adding more products all the time, and some features are exclusively available to registered users.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    href="/login"
                    sx={{ mt: 2 }}
                  >
                    Register Now
                  </Button>
                </Alert>
              )}
              {user && userRole === 'viewer' && contributorRequestStatus === 'none' && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleContributorRequest}
                  startIcon={<WorkIcon />}
                >
                  Request Contributor Access
                </Button>
              )}
              {contributorRequestStatus === 'pending' && (
                <Alert severity="info">
                  Your contributor request is pending approval from administrators.
                </Alert>
              )}
              {contributorRequestStatus === 'sent' && (
                <Alert severity="success">
                  Your contributor request has been sent! Administrators will review it soon.
                </Alert>
              )}
            </Card>
          </Grid>

          {/* Sharing Preferences Section */}
          <Grid item xs={12}>
            {/* <Card sx={{ p: 2 }}>
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
                      checked={userSettings.sharing.showPicture ?? true}
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
                      checked={userSettings.sharing.showUsername ?? true}
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
                      checked={userSettings.sharing.showCountry ?? true}
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
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.sharing.showOnLeaderboard ?? false}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        sharing: {
                          ...prev.sharing,
                          showOnLeaderboard: e.target.checked
                        }
                      }))}
                    />
                  }
                  label="Show my contributions on leaderboard"
                />
              </FormGroup>
            </Card> */}
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
              <Alert 
                severity="success"
                sx={{
                  mt: 2,
                  fontSize: '1.1rem',
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  },
                  backgroundColor: '#e8f5e9',
                  border: '1px solid #81c784'
                }}
              >
                {saveMessage}
              </Alert>
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
