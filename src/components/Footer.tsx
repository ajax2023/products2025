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
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import InfoIcon from '@mui/icons-material/Info';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import SecurityIcon from '@mui/icons-material/Security';

export function Footer() {
  const theme = useTheme();
  const buildTime = import.meta.env.VITE_BUILD_TIME;
  const buildDate = buildTime ? new Date(buildTime) : new Date();
  const formatNumber = (num: number) => num.toString().padStart(2, '0');
  const buildNumber = `Beta-${formatNumber(buildDate.getMonth() + 1)}${formatNumber(buildDate.getDate())}${buildDate.getFullYear().toString().slice(2)}-${formatNumber(buildDate.getHours())}:${formatNumber(buildDate.getMinutes())}`;

  return (
    <AppBar 
      position="static" 
      color="primary" 
      sx={{ 
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
            {buildNumber}
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
          <Link to="/privacy" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton color="inherit" size="small">
              <Tooltip title="Privacy Policy">
                <PrivacyTipIcon />
              </Tooltip>
            </IconButton>
          </Link>

          <Link to="/terms" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton color="inherit" size="small">
              <Tooltip title="Terms of Service">
                <SecurityIcon />
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
        </Box>
      </Toolbar>
    </AppBar>
  );
}