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
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LabelIcon from '@mui/icons-material/Label';
import PeopleIcon from '@mui/icons-material/People';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

interface NavbarProps {
  onTabChange: (tab: 'list' | 'add' | 'settings') => void;
  activeTab: 'list' | 'add' | 'settings';
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
    // TODO: Implement search functionality
    console.log('Search:', searchQuery);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        // position="fixed" 
        // sx={{ 
        //   zIndex: theme.zIndex.drawer + 1,
        //   '& .MuiToolbar-root': {
        //     minHeight: '40px',
        //     height: '40px',
        //   }
        // }}
      >
        <Toolbar sx={{ gap: 1, px: 1 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton 
                color="inherit"
                sx={{ 
                  color: location.pathname === '/' ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Products">
                  <ShoppingCartIcon />
                </Tooltip>
              </IconButton>
            </Link>
            <Link to="/add" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton
                color="inherit"
                sx={{ 
                  color: location.pathname === '/add' ? 'white' : alpha(theme.palette.common.white, 0.7)
                }}
              >
                <Tooltip title="Add Product">
                  <AddCircleOutlineIcon />
                </Tooltip>
              </IconButton>
            </Link>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                position: 'relative',
                marginRight: 2,
              }}
            >
              <SearchIcon sx={{ 
                position: 'absolute', 
                left: 8, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: alpha(theme.palette.common.white, 0.7)
              }} />
              <InputBase
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  color: 'inherit',
                  backgroundColor: alpha(theme.palette.common.white, 0.15),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.25),
                  },
                  borderRadius: 1,
                  paddingLeft: '32px',
                  paddingRight: '8px',
                  width: '200px',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* <Tooltip title="Products">
                <IconButton
                  color="inherit"
                  onClick={() => navigate('/')}
                >
                  <Inventory2Icon />
                </IconButton>
              </Tooltip> */}
              
              <Tooltip title="Companies">
                <IconButton
                  color="inherit"
                  onClick={() => navigate('/companies')}
                >
                  <BusinessIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Brands">
                <IconButton
                  color="inherit"
                  onClick={() => navigate('/brands')}
                >
                  <LabelIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton
                  color="inherit"
                  onClick={() => navigate('/settings')}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              {isAdmin && (
                <Tooltip title="User Management">
                  <IconButton
                    color="inherit"
                    onClick={() => navigate('/admin/users')}
                  >
                    <PeopleIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar sx={{ minHeight: '40px !important' }} /> {/* Add spacing below fixed AppBar */}
    </Box>
  );
}
