import React from 'react';
import { Box, Button, useTheme } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { useAuth } from '../auth/useAuth';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithGoogle } from '../auth';

const scrollAnimation = keyframes`
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`;

const ScrollingContent = styled(Box)(({ theme }) => ({
  whiteSpace: 'nowrap',
  animation: `${scrollAnimation} 30s linear infinite`,
  color: '#ff0000',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: '0 20px',
  fontSize: '0.95rem',
  fontWeight: 500,
  '& > *': {
    display: 'inline-block',
  }
}));

const BannerContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  left: 0,
  right: 0,
  bottom: 40,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  zIndex: 1000,
}));

const SignInButton = styled(Button)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(2),
  zIndex: 1001,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export function PromotionalBanner() {
  const { user } = useAuth();
  const theme = useTheme();

  // Don't show banner for logged-in users
  if (user) return null;

  // Hard-code the values that match what's shown in the UI
  const publicProducts = 350;
  const moreProducts = 100;
  
  const message = `🍁 Support Canadian Made! Access ${publicProducts} Canadian Products. Register (It's free - no strings attached) to unlock thousands more and get early access to new features!`;

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <BannerContainer>
      <ScrollingContent>
        <span style={{ marginRight: '50px' }}>{message}</span>
        <span style={{ marginRight: '50px' }}>{message}</span>
      </ScrollingContent>
      <SignInButton
        variant="contained"
        startIcon={<GoogleIcon />}
        onClick={handleSignIn}
        size="small"
      >
        Sign In
      </SignInButton>
    </BannerContainer>
  );
}
