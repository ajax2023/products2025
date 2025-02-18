import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
// import ProductForm from './components/ProductForm';
// import ProductList from './components/ProductList';
import Settings from './components/Settings';
// import CompanyInfo from './components/CompanyInfo';
// import CompanyList from './components/CompanyList';
// import BrandList from './components/BrandList';
import { Navbar } from './components/Navbar';
import { auth } from './firebaseConfig';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import './App.css';
import './components/Login.css';
import UserManagement from './components/admin/UserManagement';
import { ViewState } from './types/navigation';
import BackgroundImage from './components/BackgroundImage';
// import Receipts from './components/Receipts';
// import Leaderboard from './components/Leaderboard';
import Home from './components/Home';
import Search from './components/Search';
import CanadianProductSearch from './components/CanadianProductSearch';
import { AuthProvider, RequireAuth, RequireAdmin, useAuth, ProtectedRoute } from './auth';
import { NotificationProvider } from './components/common/NotificationSnackbar';
import ProductManagement from './components/admin/ProductManagement';
import { Footer } from './components/Footer';
import { Box } from '@mui/material';

function App() {
  const [activeTab, setActiveTab] = useState<ViewState>('list');

  
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <div className="App">
              <Routes>
                <Route path="/login" element={
                  <>
                    <BackgroundImage />
                    <Login />
                  </>
                } />
                <Route
                  path="/*"
                  element={
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      minHeight: '100vh'
                    }}>
                      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Routes>
                          <Route path="/" element={<CanadianProductSearch />} />
                          <Route path="/settings" element={<Settings />} />
                         
                          <Route path="/home" element={<Home />} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/canadian-products" element={<CanadianProductSearch />} />
                          <Route
                            path="/admin/products"
                            element={
                              <ProtectedRoute
                                requiredRole="admin"
                                fallback="/login"
                              >
                                <ProductManagement />
                              </ProtectedRoute>
                            }
                          />
                           <Route 
                           path="/admin/users" 
                           element={
                            <ProtectedRoute
                            requiredRole="admin"
                            fallback="/login"
                            >
                           <UserManagement />
                           </ProtectedRoute>
                        }
                      />
                        </Routes>
                      </Box>
                      <Footer />
                    </Box>
                  }
                />
              </Routes>
            </div>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
