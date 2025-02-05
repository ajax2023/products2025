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
import { getDoc, setDoc, doc, deleteDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { updateProfile, reauthenticateWithPopup, GoogleAuthProvider, deleteUser } from 'firebase/auth';
import { UserSettings, User } from '../types/user';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import WorkIcon from '@mui/icons-material/Work';

const getModifiedPhotoUrl = (url: string | null) => {
  if (!url) return '';
  // Replace s96-c with s400 for larger size
  return url.replace('s96-c', 's400');
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
  const [userRole, setUserRole] = useState<string>('');
  const [contributorRequestStatus, setContributorRequestStatus] = useState<'none' | 'pending' | 'sent'>('none');

  useEffect(() => {
    const loadSettings = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      console.log('Debug - auth.currentUser:', {
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL,
        displayName: auth.currentUser.displayName,
        uid: auth.currentUser.uid
      });

      try {
        // Load user settings
        const settingsDoc = await getDoc(doc(db, 'userSettings', auth.currentUser.uid));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as UserSettings;
          setUserSettings(prev => ({
            ...prev,
            ...data
          }));
        }

        // Load user role
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUserRole(userData.role);
          
          // Check if there's a pending contributor request
          if (userData.role === 'viewer') {
            const requestsRef = collection(db, 'contributorRequests');
            const requestSnapshot = await getDocs(query(requestsRef, where('userId', '==', auth.currentUser.uid), where('status', '==', 'pending')));
            if (!requestSnapshot.empty) {
              setContributorRequestStatus('pending');
            }
          }
        } else {
          // If user document doesn't exist, create it with default viewer role
          const newUser: User = {
            _id: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            role: 'viewer',
            displayName: auth.currentUser.displayName || '',
            created_at: new Date(),
            created_by: auth.currentUser.uid,
            status: 'active'
          };
          await setDoc(doc(db, 'users', auth.currentUser.uid), newUser);
          setUserRole('viewer');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setError('Error loading settings. Please try again.');
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;

    try {
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), userSettings);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000); // Clear message after 3 seconds
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

  const handleContributorRequest = async () => {
    if (!auth.currentUser) return;

    try {
      // Create a contributor request
      await addDoc(collection(db, 'contributorRequests'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: auth.currentUser.displayName,
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
                      src={auth.currentUser?.photoURL || ''}
                      alt={auth.currentUser?.displayName || 'User'}
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
                      {auth.currentUser?.displayName || auth.currentUser?.email || 'User'}
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
                  Current Role: <strong>{userRole || 'Loading...'}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {userRole === 'viewer' && 'As a viewer, you can view products and their prices.'}
                  {userRole === 'contributor' && 'As a contributor, you can add products and prices, and edit your own entries.'}
                  {userRole === 'admin' && 'As an admin, you have full access to manage products, prices, and users.'}
                  {userRole === 'super_admin' && 'As a super admin, you have complete control over the system.'}
                </Typography>
              </Box>
              {userRole === 'viewer' && contributorRequestStatus === 'none' && (
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
