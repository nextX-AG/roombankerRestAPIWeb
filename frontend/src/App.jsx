import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';
import './App.css';

// Components
import AppNavbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Gateways from './pages/Gateways';
import GatewayDetail from './pages/GatewayDetail';
import Devices from './pages/Devices';
import Debugger from './pages/Debugger';

// Auth Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="d-flex justify-content-center p-5">Lade...</div>;
  }
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function AppContent() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="App d-flex flex-column min-vh-100">
      <AppNavbar />
      <main className="app-main-content">
        <Routes>
          <Route path="/login" element={isAuthenticated() ? <Navigate to="/" /> : <Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          } />
          <Route path="/gateways" element={
            <ProtectedRoute>
              <Gateways />
            </ProtectedRoute>
          } />
          <Route path="/gateways/:uuid" element={
            <ProtectedRoute>
              <GatewayDetail />
            </ProtectedRoute>
          } />
          <Route path="/devices" element={
            <ProtectedRoute>
              <Devices />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          <Route path="/message-debugger" element={
            <ProtectedRoute>
              <Debugger />
            </ProtectedRoute>
          } />
          <Route path="/templates" element={
            <ProtectedRoute>
              <Templates />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
