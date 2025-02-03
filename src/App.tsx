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
import { ThemeProvider, createTheme } from '@mui/material';
import './App.css';
import './components/Login.css';
import UserManagement from './components/admin/UserManagement';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'settings' | 'companies'>('list');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <div className="App">
          {user ? (
            <>
              <Navbar
                onTabChange={setActiveTab}
                activeTab={activeTab}
                user={user}
              />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<ProductList />} />
                  <Route path="/add" element={<ProductForm />} />
                    
                  <Route path="/brands" element={<BrandList />} />
                  <Route path="/companies" element={<CompanyList />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/company" element={<CompanyInfo />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                </Routes>
              </main>
            </>
          ) : (
            <div className="login-container">
              <h1>Product Finder 2025</h1>
              <Login />
            </div>
          )}
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
