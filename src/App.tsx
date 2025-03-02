import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Settings from './components/Settings';
import { Navbar } from './components/Navbar';
import { auth } from './firebaseConfig';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import './App.css';
import './components/Login.css';
import UserManagement from './components/admin/UserManagement';
import { ViewState } from './types/navigation';
import BackgroundImage from './components/BackgroundImage';
import Home from './components/Home';
import Search from './components/Search';
import CanadianProductSearch from './components/CanadianProductSearch';
import { AuthProvider, RequireAuth, RequireAdmin, useAuth, ProtectedRoute } from './auth';
import { NotificationProvider } from './components/common/NotificationSnackbar';
import ProductManagement from './components/admin/ProductManagement';
import { Footer } from './components/Footer';
import { Box } from '@mui/material';
import { PromotionalBanner } from './components/PromotionalBanner';
import AboutUs from './components/AboutUs';
import PrivacyPolicy from './components/PrivacyPolicy';
import Terms from './components/Terms';
import Groceries from './components/grocery/Groceries';
import GroceryPreferences from './components/grocery/GroceryPreferences';

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
                      <Box sx={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>
                        <Routes>
                          <Route path="/" element={<CanadianProductSearch />} />
                          <Route path="/settings" element={<Settings />} />
                         
                          <Route path="/home" element={<Home />} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/canadian-products" element={<CanadianProductSearch />} />
                          <Route path="/about" element={<AboutUs />} />
                          <Route path="/privacy" element={<PrivacyPolicy />} />
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/groceries" element={
                            <ProtectedRoute fallback="/login">
                              <Groceries />
                            </ProtectedRoute>
                          } />
                          <Route path="/grocery-preferences" element={
                            <ProtectedRoute fallback="/login">
                              <GroceryPreferences />
                            </ProtectedRoute>
                          } />
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
                      <Box sx={{ position: 'relative', zIndex: 1000 }}>
                        <PromotionalBanner />
                        <Footer />
                      </Box>
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
