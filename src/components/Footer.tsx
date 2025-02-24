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
  const buildNumber = `Beta-${(buildDate.getMonth() + 1).toString().padStart(2, '0')}${buildDate.getDate().toString().padStart(2, '0')}${buildDate.getFullYear().toString().slice(2)}-${buildDate.getHours().toString().padStart(2, '0')}:${buildDate.getMinutes().toString().padStart(2, '0')}`;

  return (
    <AppBar 
      position="static" 
      color="primary" 
      sx={{ 
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        minHeight: { xs: '48px' },
        overflow: 'hidden'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            2025 Canadian Products Directory
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              opacity: 0.7,
              fontFamily: 'monospace',
              fontSize: '0.7rem'
            }}
          >
            {buildNumber}
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