// DO NOT REMOVE THE ZINDEX IVE ADDED

import { signInWithGoogle, logout, auth } from "../auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography, Container } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import "./Login.css";

export default function Login() {
  const [user, setUser] = useState(auth.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 2,
          textAlign: 'center'
        }}
      >
        {user ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%',
                  marginBottom: 1 
                }} 
              />
            )}
            <Typography variant="h6">
              Welcome, {user.displayName || user.email}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={logout}
              sx={{ mt: 2 }}
            >
              Sign Out
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Box 
              component="img"
              src="/icon-192x192.png"
              alt="Canada Leaf"
              sx={{
                width: 120,
                height: 120,
                mb: 2,
                display: 'block',
                zIndex: 1
              }}
            />

            <Typography 
              variant="h5" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                color: '#1a1a1a',
                zIndex: 1
              }}
            >
              Canada2025.com
            </Typography>

            <Typography 
              variant="subtitle1" 
              gutterBottom
              sx={{ mb: 3, zIndex: 1 }}
            >
              Please sign in to continue
            </Typography>

            <Button
              variant="contained"
              color="primary"
              onClick={handleGoogleSignIn}
              startIcon={<GoogleIcon />}
              size="large"
              sx={{
                textTransform: 'none',
                px: 4,
                py: 1.5,
                borderRadius: 2,
                backgroundColor: '#4285f4',
                '&:hover': {
                  backgroundColor: '#3367d6'
                },
                mb: 3
              }}
            >
              Sign in with Google
            </Button>

            <Typography 
              variant="body2" 
              sx={{ 
                color: '#666',
                fontWeight: 500,
                zIndex: 1
              }}
            >
              Buy Canadian - eh!
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}
