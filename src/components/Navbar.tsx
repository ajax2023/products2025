import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  InputBase,
  Box,
  useTheme,
  alpha,
  Tooltip,
  Typography,
  InputAdornment,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LabelIcon from '@mui/icons-material/Label';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { ViewState } from '../types/navigation';

interface NavbarProps {
  onTabChange: (tab: ViewState) => void;
  activeTab: ViewState;
  user: any;
}

export function Navbar({ onTabChange, activeTab, user }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
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
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    // Navigate to products page with search query
    navigate('/?search=' + encodeURIComponent(searchQuery));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    navigate('/');
  };

  const handleRefresh = async () => {
    // Call the refresh function exposed by ProductList
    if (typeof (window as any).refreshProducts === 'function') {
      try {
        await (window as any).refreshProducts();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    } else {
      console.warn('Refresh function not available');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar>
        <Toolbar sx={{ gap: 1, px: 1 }}>
          <img 
            src="/maple-leaf.svg" 
            alt="Maple Leaf"
            style={{ 
              height: '24px', 
              marginRight: '16px'
            }} 
          />
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Products */}
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                sx={{ 
                  color: isActive('/') ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Products">
                  <ShoppingCartIcon />
                </Tooltip>
              </IconButton>
            </Link>

            {/* Add Product */}
            {/* <Link to="/add" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton
                color="inherit"
                sx={{ 
                  color: isActive('/add') ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Add Product">
                  <AddCircleOutlineIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Brands */}
            {/* <Link to="/brands" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton
                color="inherit"
                sx={{ 
                  color: isActive('/brands') ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Brands">
                  <LabelIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Companies */}
            <Link to="/companies" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton
                color="inherit"
                sx={{ 
                  color: isActive('/companies') ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Companies">
                  <BusinessIcon />
                </Tooltip>
              </IconButton>
            </Link>

            {/* Company Info */}
            {/* <Link to="/company" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton
                color="inherit"
                sx={{ 
                  color: isActive('/company') ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Company Info">
                  <StorefrontIcon />
                </Tooltip>
              </IconButton>
            </Link> */}

            {/* Admin Users - Only show if admin */}
            {isAdmin && (
              <Link to="/admin/users" style={{ textDecoration: 'none', color: 'inherit' }}>
                <IconButton
                  color="inherit"
                  sx={{ 
                    color: isActive('/admin/users') ? 'white' : alpha(theme.palette.common.white, 0.7)
                  }}
                >
                  <Tooltip title="User Management">
                    <AdminPanelSettingsIcon />
                  </Tooltip>
                </IconButton>
              </Link>
            )}

            {/* Settings */}
            <Link to="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton
                color="inherit"
                sx={{ 
                  color: isActive('/settings') ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Settings">
                  <SettingsIcon />
                </Tooltip>
              </IconButton>
            </Link>
          </Box>

          {/* Search Box */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                position: 'relative',
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.common.white, 0.15),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.25),
                },
                marginLeft: 0,
                width: 'auto',
              }}
            >
              <Box sx={{ padding: theme.spacing(0, 2), height: '100%', position: 'absolute', display: 'flex', alignItems: 'center' }}>
                <SearchIcon />
              </Box>
              <InputBase
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products & prices..."
                sx={{
                  color: 'inherit',
                  padding: theme.spacing(1, 1, 1, 0),
                  paddingLeft: `calc(1em + ${theme.spacing(4)})`,
                  width: '100%',
                  minWidth: '300px',
                }}
                endAdornment={
                  searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        sx={{ 
                          color: 'inherit',
                          padding: '4px',
                          marginRight: '4px',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.common.white, 0.1),
                          }
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              />
            </Box>
            <IconButton
              color="inherit"
              onClick={handleRefresh}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                }
              }}
            >
              <Tooltip title="Refresh">
                <RefreshIcon />
              </Tooltip>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer for fixed AppBar */}
    </Box>
  );
}
