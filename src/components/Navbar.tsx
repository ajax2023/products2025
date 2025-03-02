import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  useTheme,
  alpha,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

// Import all required icons
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
// import ReceiptIcon from '@mui/icons-material/Receipt';
// import BusinessIcon from '@mui/icons-material/Business';
// import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
// import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
// import SportsTrophyIcon from '@mui/icons-material/SportsTrophy';
import HomeIcon from '@mui/icons-material/Home';
// import SearchIcon from '@mui/icons-material/Search';
// import LocalMallIcon from '@mui/icons-material/LocalMall';
import InventoryIcon from '@mui/icons-material/Inventory';
import GetAppIcon from '@mui/icons-material/GetApp';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BookmarkIcon from '@mui/icons-material/Bookmark';

import { useAuth } from '../auth/useAuth';
import { ViewState } from '../types/navigation';

interface NavbarProps {
  onTabChange?: (tab: ViewState) => void;
  activeTab?: ViewState;
}

export function Navbar({ onTabChange, activeTab }: NavbarProps) {
  const { claims } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = claims?.role === 'admin' || claims?.role === 'super_admin';

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Before install prompt fired');
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to show install button
      console.log('Setting isInstallable to true');
      setIsInstallable(true);
    };

    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      console.log('Is app in standalone mode?', isStandalone);
      console.log('Setting isInstallable to:', !isStandalone);
      setIsInstallable(!isStandalone);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      console.log('App was installed');
      setIsInstallable(false);
    });
    
    console.log('Running initial installation check...');
    checkInstalled();

    return () => {
      console.log('Cleaning up install prompt listeners');
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => setIsInstallable(false));
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Clear the deferredPrompt variable
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed">
        
        <Toolbar sx={{ 
          display: 'flex', 
          // alignItems: 'center', 
          justifyContent: 'space-between', 
          minHeight: { xs: '48px' },
          overflow: 'hidden'
        }}>
          <Box sx={{ mr: "40px" }}>
          {/* Logo */}

          <Tooltip title="About Canadian Products">
            <IconButton
              onClick={() => navigate('/about-canadian-products')}
              sx={{ p: 0 }}
            >
              <img 
                src="/maple-leaf.png" 
                alt="Maple Leaf"
                style={{ 
                  height: '30px',
                  alignItems: 'center',
                }} 
              />
            </IconButton>
          </Tooltip>
          </Box>

          <Box 
            component="div"
            sx={{
              display: 'flex',
              overflow: 'auto',
              flexGrow: 0, // Prevent this box from growing
              gap: 0.5,
              mx: -2,
              px: 2,
              '& > *': {
                flex: 'none'
              }
            }}
          >
            {/* Home */}
            {/* <Link to="/home" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/home') ? '#FF0000' : 'inherit'
                  }
                }}
              >
                <Tooltip title="Home">
                  <HomeIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Canadian Products */}
            <Link to="/canadian-products" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                onClick={() => onTabChange && onTabChange('list')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/canadian-products') || activeTab === 'list' ? '#FF0000' : 'inherit'
                  }
                }}
              >
                <Tooltip title="Canadian Products">
                  <ShoppingCartIcon />
                </Tooltip>
              </IconButton>
            </Link>

            {/* Groceries */}
            <Link to="/groceries" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                onClick={() => onTabChange && onTabChange('groceries')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/groceries') || activeTab === 'groceries' ? '#FF0000' : 'inherit'
                  }
                }}
              >
                <Tooltip title="Grocery Lists">
                  <ListAltIcon />
                </Tooltip>
              </IconButton>
            </Link>

            {/* Grocery Preferences */}
            <Link to="/grocery-preferences" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                onClick={() => onTabChange && onTabChange('grocery-preferences')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/grocery-preferences') || activeTab === 'grocery-preferences' ? '#FF0000' : 'inherit'
                  }
                }}
              >
                <Tooltip title="Grocery Preferences">
                  <BookmarkIcon />
                </Tooltip>
              </IconButton>
            </Link>

            {/* Product Management - Only show if admin */}
            {isAdmin && (
              <Link to="/admin/products" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit"
                 onClick={() => onTabChange && onTabChange('admin/products')}
                 sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/admin/products') || activeTab === 'admin/products' ? '#00FF00' : 'inherit'
                  },

                }}>
                  <Tooltip title="Product Management">
                    <InventoryIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}

            {/* User Management - Only show if admin */}
            {isAdmin && (
              <Link to="/admin/users" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit"
                onClick={() => onTabChange && onTabChange('admin/users')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/admin/users') || activeTab === 'admin/users' ? '#00FF00' : 'inherit'
                  },

                }}
                >
                  <Tooltip title="User Management">
                    <PeopleIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}
          </Box>

            {/* Settings */}
            <Link to="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                onClick={() => onTabChange && onTabChange('settings')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/settings') || activeTab === 'settings' ? '#FF0000' : 'inherit'
                  },
                  marginLeft: '2px',
                }}
              >
                <Tooltip title="Settings">
                  <SettingsIcon />
                </Tooltip>
              </IconButton>
            </Link>

          <Box sx={{ flexGrow: 1 }} /> {/* This pushes the following items to the right */}

          {isInstallable && (
            <Box sx={{ marginLeft: 'auto' }}> {/* Ensures it aligns to the right */}
              <Tooltip title="Install App">
                <IconButton
                  onClick={handleInstallClick}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.white, 0.1),
                    },
                    marginLeft: '32px',
                  }}
                >
                  <GetAppIcon sx={{ color: 'white' }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
