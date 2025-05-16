import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';
import './App.css';

// Components
import AppShell from './components/AppShell';
import GatewayDetailDrawer from './components/GatewayDetailDrawer';
import CustomerDetailDrawer from './components/CustomerDetailDrawer';

// Pages
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Gateways from './pages/Gateways';
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

// Layout-wrapped routes mit AppShell
function ProtectedAppShell() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="App">
      <Routes>
        {/* Login-Route außerhalb des geschützten Layouts */}
        <Route path="/login" element={isAuthenticated() ? <Navigate to="/" /> : <Login />} />
        
        {/* Alle geschützten Routen innerhalb des AppShell */}
        <Route element={<ProtectedAppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />}>
            {/* Verschachtelte Route für Kunden-Detail als Drawer */}
            <Route path=":id" element={<CustomerDetailDrawer />} />
          </Route>
          <Route path="/gateways" element={<Gateways />}>
            {/* Verschachtelte Route für Gateway-Detail als Drawer */}
            <Route path=":uuid" element={<GatewayDetailDrawer />} />
          </Route>
          <Route path="/devices" element={<Devices />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/debugger" element={<Debugger />} />
          {/* Umleitung von alten Pfaden */}
          <Route path="/message-debugger" element={<Navigate to="/debugger" />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
          {/* Neue Betrieb-Routen */}
          <Route path="/status" element={<div>Live-Status (Implementierung folgt)</div>} />
        </Route>
      </Routes>
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
