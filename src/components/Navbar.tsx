import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';

// Import all required icons
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
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
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainer = React.useRef<HTMLDivElement | null>(null);

  const isAdmin = claims?.role === 'admin' || claims?.role === 'super_admin';
  const [touchStartX, setTouchStartX] = React.useState(0);
  const [isTouching, setIsTouching] = React.useState(false);

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

  // Touch event handlers for mobile scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsTouching(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouching || !scrollContainer.current) return;
    
    const touchCurrentX = e.touches[0].clientX;
    const diff = touchStartX - touchCurrentX;
    
    // Scroll the container based on touch movement
    scrollContainer.current.scrollBy({
      left: diff * 1.2, // Increased sensitivity for more responsive feel
      behavior: 'auto', // Using 'auto' for more responsive feel
    });
    
    // Update the touch start position for continuous scrolling
    setTouchStartX(touchCurrentX);
  };

  const handleTouchEnd = () => {
    setIsTouching(false);
  };

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
          justifyContent: 'space-between', 
          minHeight: { xs: '48px' },
          overflow: 'hidden'
        }}>
          <Box sx={{ mr: "20px" }}>
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
              display: 'flex',
              overflowX: 'auto', // Just focus on horizontal scrolling
              flexGrow: 1,
              gap: 0.5,
              mx: -2,
              px: 2,
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              whiteSpace: 'nowrap',
              '& > *': {
                flex: 'none'
              },
              WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
              touchAction: 'pan-x', // Explicitly allow horizontal panning
              userSelect: 'none', // Prevent text selection during touch
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '30px',
                background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.1))',
                pointerEvents: 'none', // Ensure it doesn't interfere with clicks
              },
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

            {/* Master Category Editor - Only show if admin */}
            {isAdmin && (
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
                    marginLeft: '15px',
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
