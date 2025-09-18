import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Tooltip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/system';

// Import all required icons
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import GetAppIcon from '@mui/icons-material/GetApp';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import EmailIcon from '@mui/icons-material/Email';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';

import { useAuth } from '../auth/useAuth';
import { ViewState } from '../types/navigation';
import { swUpdateEvent } from '../serviceWorker';
import { InstallInstructions } from './InstallInstructions';

interface NavbarProps {
  onTabChange?: (tab: ViewState) => void;
  activeTab?: ViewState;
}

// Add type declaration for iOS standalone mode
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export function Navbar({ onTabChange, activeTab }: NavbarProps) {
  const { claims } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [swRegistration, setSwRegistration] = React.useState<ServiceWorkerRegistration | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false);
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainer = React.useRef<HTMLDivElement | null>(null);

  const isAdmin = claims?.role === 'admin' || claims?.role === 'super_admin';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  React.useEffect(() => {
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
      const isInStandaloneMode = window.navigator.standalone === true;
      console.log('Is app in standalone mode?', isStandalone || isInStandaloneMode);
      console.log('Setting isInstallable to:', !(isStandalone || isInStandaloneMode));
      setIsInstallable(!(isStandalone || isInStandaloneMode));
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

  // Listen for service worker updates
  React.useEffect(() => {
    const handleSwUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('New version available!');
      setUpdateAvailable(true);
      if (customEvent.detail && customEvent.detail.registration) {
        setSwRegistration(customEvent.detail.registration);
      }
    };

    window.addEventListener(swUpdateEvent, handleSwUpdate);
    
    return () => {
      window.removeEventListener(swUpdateEvent, handleSwUpdate);
    };
  }, []);

  // Enable scrolling with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent) => {
    if (scrollContainer.current) {
      e.preventDefault();
      scrollContainer.current.scrollBy({
        left: e.deltaY * 1.5, // Adjust speed if needed
        behavior: 'smooth',
      });
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

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

  const handleUpdateClick = () => {
    if (swRegistration && swRegistration.waiting) {
      // Send message to service worker to skip waiting
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // Reload the page to get the new version
    window.location.reload();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed">
        
        <Toolbar sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          minHeight: { xs: '48px' },
          overflow: 'hidden',
          flexWrap: 'nowrap'
        }}>
          <Box sx={{ mr: "28px" }}>
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
                  height: '28px',
                  alignItems: 'center',
                }} 
              />
            </IconButton>
          </Tooltip>
          </Box>

          <Box 
            component="div"
            ref={scrollContainer}
            onWheel={handleWheelScroll}
            sx={{
              display: 'flex',
              overflowX: 'auto',
              // flexGrow: 1,
              gap: 0.25,
              mx: -2,
              px: 1,
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              whiteSpace: 'nowrap',
              '& > *': {
                flex: 'none'
              }
            }}
          >
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
                <Tooltip title="Lists">
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

          {updateAvailable && (
            <Box sx={{ marginLeft: 'auto' }}> {/* Ensures it aligns to the right */}
              <Tooltip title="Update Available - Click to Refresh">
                <IconButton
                  onClick={handleUpdateClick}
                  sx={{
                    color: '#FF9800', // Orange color to indicate update
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.6 },
                      '100%': { opacity: 1 },
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.white, 0.1),
                    },
                    marginLeft: '15px',
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {isInstallable && (
            <Tooltip title={isIOS ? "Install on iOS" : "Install app"}>
              <IconButton
                color="inherit"
                onClick={handleInstallClick}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                <GetAppIcon />
              </IconButton>
            </Tooltip>
          )}

            {/* Admin Menu Toggle - Only show if admin */}
            {isAdmin && !showAdminMenu && (
              <IconButton 
                color="inherit"
                onClick={() => setShowAdminMenu(true)}
                sx={{
                  '& .MuiSvgIcon-root': {
                    // color: '#336699'
                    color: '#00FF00'
                  }
                }}
              >
                <Tooltip title="Show Admin Menu">
                  <AdminPanelSettingsIcon />
                </Tooltip>
              </IconButton>
            )}

            {/* Admin Close Button - Only show if admin menu is open */}
            {isAdmin && showAdminMenu && (
              <IconButton 
                color="inherit"
                onClick={() => setShowAdminMenu(false)}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: '#00FF00'
                  }
                }}
              >
                <Tooltip title="Hide Admin Menu">
                  <CloseIcon />
                </Tooltip>
              </IconButton>
            )}

            {/* Product Management - Only show if admin and admin menu is open */}
            {isAdmin && showAdminMenu && (
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

            {/* Master Category Editor - Only show if admin and admin menu is open */}
            {isAdmin && showAdminMenu && (
              <Link to="/admin/master-categories" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit"
                onClick={() => onTabChange && onTabChange('admin/master-categories')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/admin/master-categories') || activeTab === 'admin/master-categories' ? '#00FF00' : 'inherit'
                  },
                }}>
                  <Tooltip title="Master Category Editor">
                    <ListAltIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}

            {/* User Management - Only show if admin and admin menu is open */}
            {isAdmin && showAdminMenu && (
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

            {/* Email Management - Only show if admin and admin menu is open */}
            {isAdmin && showAdminMenu && (
              <Link to="/admin/email" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit"
                onClick={() => onTabChange && onTabChange('admin/email')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/admin/email') || activeTab === 'admin/email' ? '#00FF00' : 'inherit'
                  },
                }}
                >
                  <Tooltip title="Email Management">
                    <EmailIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}

            {/* Product Submissions Review - Only show if admin and admin menu is open */}
            {isAdmin && showAdminMenu && (
              <Link to="/admin/submissions" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit"
                onClick={() => onTabChange && onTabChange('admin/submissions')}
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: isActive('/admin/submissions') || activeTab === 'admin/submissions' ? '#00FF00' : 'inherit'
                  },
                }}
                >
                  <Tooltip title="Product Submissions">
                    <AssignmentIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}
          </Box>

        </Toolbar>
      </AppBar>
      <InstallInstructions 
        open={showIOSInstructions} 
        onClose={() => setShowIOSInstructions(false)} 
      />
    </Box>
  );
}
