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
import { ViewState } from './types/navigation';
import BackgroundImage from './components/BackgroundImage';
import Receipts from './components/Receipts';

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
  const [activeTab, setActiveTab] = useState<ViewState>('list');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        // Wait for Firebase to be fully initialized
        setTimeout(() => {
          setUser(currentUser);
          setLoading(false);
        }, 1000);
      } else {
        setUser(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTabChange = (tab: ViewState) => {
    setActiveTab(tab);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return (
      <>
        <BackgroundImage />
        <div className="login-container">
          {/* i want a leaf image (/maple-leaf.svg) here: */}
          <img src="/maple-leaf.svg" alt="Leaf" className="leaf-image" />
          <h1>CanadianBuddy.ca</h1>
          <Login />
          <h1>Buy Canadian - eh!</h1>
        </div>
      </>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <div className="App">
          <Navbar
            onTabChange={handleTabChange}
            activeTab={activeTab}
            user={user}
          />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<ProductList />} />
              <Route path="/add" element={<ProductForm />} />
              <Route path="/brands" element={<BrandList />} />
              <Route path="/companies" element={<CompanyList />} />
              <Route path="/companies/:id" element={<CompanyInfo />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/users" element={<UserManagement />} />
            </Routes>
          </main>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
