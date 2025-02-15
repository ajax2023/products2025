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
import ReceiptIcon from '@mui/icons-material/Receipt';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsTrophyIcon from '@mui/icons-material/SportsTrophy';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import InventoryIcon from '@mui/icons-material/Inventory';

import { collection, query, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { ViewState } from '../types/navigation';

interface NavbarProps {
  onTabChange?: (tab: ViewState) => void;
  activeTab?: ViewState;
  user?: any;
}

export function Navbar({ onTabChange, activeTab, user }: NavbarProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      if (!auth.currentUser) return;
      
      // Automatically set ajax@online101.ca as admin
      if (auth.currentUser.email === 'ajax@online101.ca') {
        setIsAdmin(true);
        return;
      }
      
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('_id', '==', auth.currentUser.uid))
      );
      
      if (!userDoc.empty) {
        setIsAdmin(userDoc.docs[0].data().role === 'admin');
      }
    };

    checkUserRole();
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed">
        <Toolbar sx={{ 
          minHeight: { xs: '48px' },
          overflow: 'hidden'
        }}>
          {/* Logo */}
          <img 
            src="/maple-leaf.svg" 
            alt="Maple Leaf"
            style={{ 
              height: '32px',
              marginRight: '16px'
            }} 
          />

          <Box 
            component="div"
            sx={{
              display: 'flex',
              overflow: 'auto',
              flexGrow: 1,
              gap: 0.5,
              mx: -2,
              px: 2,
              '& > *': {
                flex: 'none'
              }
            }}
          >
            {/* Home */}
            <Link to="/home" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton color="inherit">
                <Tooltip title="Home">
                  <HomeIcon />
                </Tooltip>
              </IconButton>
            </Link>
           
            {/* Products */}
            {/* <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                sx={{
                  bgcolor: isActive('/') ? alpha(theme.palette.common.white, 0.15) : 'transparent',
                }}
              >
                <Tooltip title="Products">
                  <ShoppingCartIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Canadian Products */}
            <Link to="/canadian-products" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                sx={{
                  bgcolor: isActive('/canadian-products') ? alpha(theme.palette.common.white, 0.15) : 'transparent',
                  '& .MuiSvgIcon-root': {
                    color: '#FF0000',
                  }
                }}
              >
                <Tooltip title="Canadian Products">
                  <ShoppingCartIcon />
                </Tooltip>
              </IconButton>
            </Link>

            {/* Product Management - Only show if admin */}
            {isAdmin && (
              <Link to="/admin/products" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit">
                  <Tooltip title="Product Management">
                    <InventoryIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}

            {/* Search */}
            {/* <Link to="/search" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton color="inherit">
                <Tooltip title="Search">
                  <SearchIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Receipts */}
            {/* <Link to="/receipts" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton color="inherit">
                <Tooltip title="Receipts">
                  <ReceiptIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Companies */}
            {/* <Link to="/companies" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton color="inherit">
                <Tooltip title="Companies">
                  <BusinessIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Leaderboard */}
            {/* <Link to="/leaderboard" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton color="inherit">
                <Tooltip title="Leaderboard">
                  <EmojiEventsIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* User Management - Only show if admin */}
            {isAdmin && (
              <Link to="/admin/users" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton color="inherit">
                  <Tooltip title="User Management">
                    <PeopleIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}



            {/* Settings */}
            <Link to="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton color="inherit">
                <Tooltip title="Settings">
                  <SettingsIcon />
                </Tooltip>
              </IconButton>
            </Link>

           
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />  {/* Spacer for fixed AppBar */}
    </Box>
  );
}
