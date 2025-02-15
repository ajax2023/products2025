import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';
import Settings from './components/Settings';
import CompanyInfo from './components/CompanyInfo';
import CompanyList from './components/CompanyList';
import BrandList from './components/BrandList';
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
import Leaderboard from './components/Leaderboard';
import Home from './components/Home';
import Search from './components/Search';
import CanadianProductSearch from './components/CanadianProductSearch';
import { AuthProvider, RequireAuth, RequireAdmin, useAuth, ProtectedRoute } from './auth';
import { NotificationProvider } from './components/common/NotificationSnackbar';
import ProductManagement from './components/admin/ProductManagement';

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
                    <>
                      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
                      <Routes>
                        <Route path="/" element={<CanadianProductSearch />} />
                        <Route path="/add" element={<ProductForm />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/companies" element={<CompanyList />} />
                        <Route path="/companies/:id" element={<CompanyInfo />} />
                        <Route path="/brands" element={<BrandList />} />
                        <Route path="/admin/users" element={<UserManagement />} />
                        {/* <Route path="/receipts" element={<Receipts />} /> */}
                        <Route path="/leaderboard" element={<Leaderboard />} />
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
                      </Routes>
                    </>
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
