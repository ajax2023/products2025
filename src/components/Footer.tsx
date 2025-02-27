import React from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import SecurityIcon from '@mui/icons-material/Security';
import Balance from '@mui/icons-material/Balance';  
import HomeIcon from '@mui/icons-material/Home';

import { BUILD_NUMBER } from '../buildInfo';

export function Footer() {
  const theme = useTheme();

  return (
    <AppBar 
      position="fixed" 
      color="primary" 
      sx={{ 
        top: 'auto',
        bottom: 0,
        backgroundColor: '#1976D2',
        borderTop: `1px solid ${theme.palette.divider}`,
        zIndex: '10',
      }}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        minHeight: { xs: '48px' },
        overflow: 'hidden'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              opacity: 0.7,
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: 'white'
            }}
          >
            {BUILD_NUMBER}
          </Typography>
          <Typography variant="caption" color="white">
            2025 Canadian Products
          </Typography>
        </Box>

        <Box 
          component="div"
          sx={{
            display: 'flex',
            overflow: 'auto',
            flexGrow: 0,
            gap: 0.5,
            mx: -2,
            px: 2,
            '& > *': {
              flex: 'none'
            }
          }}
        >
  
          <Link to="/home" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton color="inherit" size="small">
              <Tooltip title="Home">
                <HomeIcon />
              </Tooltip>
            </IconButton>
          </Link>

          <Link to="/about" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton color="inherit" size="small">
              <Tooltip title="About Us">
                <InfoIcon />
              </Tooltip>
            </IconButton>
          </Link>

          <Link to="/contact" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton color="inherit" size="small">
              <Tooltip title="Contact Us">
                <ContactSupportIcon />
              </Tooltip>
            </IconButton>
          </Link>

          <Link to="/privacy" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton color="inherit" size="small">
              <Tooltip title="Privacy Policy">
                <SecurityIcon />
              </Tooltip>
            </IconButton>
          </Link>

          <Link to="/terms" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton color="inherit" size="small">
              <Tooltip title="Terms and Conditions">
                <Balance />
              </Tooltip>
            </IconButton>
          </Link>

        </Box>
      </Toolbar>
    </AppBar>
  );
}