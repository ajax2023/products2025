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

  const handleVisitorSignIn = async () => {
    // go to canada2025.com
    window.location.href = 'https://canada2025.com';
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
      
            <Box         sx={{ 
            zIndex: 1,
                backgroundColor: '#fff',
                p: 1,
                borderRadius: 2
              }}>  
            <Typography 
              variant="h6" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                color: '#336699',
                zIndex: 1,
              }}
            >
              Canada2025.com <br />
            </Typography>

            <Typography sx={{ 
                fontWeight: 600,
                color: '#336699',
                zIndex: 1,
              }}>
            Please sign in to continue...
            Support Canada - eh!  

            </Typography>
            <Typography sx={{ 
                fontWeight: 600,
                color: '#336699',
                zIndex: 1,
              }}>
            ...and Mexico, the Commonwealth and allies in other Countries!

            </Typography>
</Box>

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
                mb: 1
              }}
            >
              Sign in with Google
            </Button>

            <Button
              variant="contained"
              color="primary" // light yellow
              onClick={handleVisitorSignIn}
              // startIcon={<GoogleIcon />}
              size="medium"
              sx={{
                // textTransform: 'capitals',
                // textTransform: '',
                px: 4,
                py: 1.5,
                color: '#336699',
                borderRadius: 2,
                backgroundColor: '#f0c42f',
                '&:hover': {
                  backgroundColor: '#333333',
                  color: '#fff'
                },
                mb: 1
              }}
            >
              First I'll just look around...
            </Button>
            {/* <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                color: '#336699',
                zIndex: 1,
                backgroundColor: '#fff',
                p: 2,
                borderRadius: 2
              }}
            >
              Support Canada - eh!
            </Typography> */}
          </Box>
        )}
      </Box>
    </Container>
  );
}
