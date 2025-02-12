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
import { AuthProvider } from './auth';

function App() {
  const [activeTab, setActiveTab] = useState<ViewState>('list');

  
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
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
                      <Route path="/" element={<ProductList />} />
                      <Route path="/add" element={<ProductForm />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/companies" element={<CompanyList />} />
                      <Route path="/companies/:id" element={<CompanyInfo />} />
                      <Route path="/brands" element={<BrandList />} />
                      <Route path="/admin/users" element={<UserManagement />} />
                      {/* <Route path="/receipts" element={<Receipts />} /> */}
                      <Route path="/leaderboard" element={<Leaderboard />} />
                      <Route path="/home" element={<Home />} />
                    </Routes>
                  </>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
