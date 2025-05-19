import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap';
import { User } from 'lucide-react';
import SideNav from './SideNav';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from './Drawer';
import evalarmLogo from '../assets/evalarm-logo.png';

// Temporärer Platzhalter für die Command Palette
const CommandPalette = () => (
  <button 
    className="btn border-0" 
    title="Befehlspalette (⌘ K)"
    onClick={() => alert('Command Palette wird in Sprint 4 implementiert')}
    style={{ backgroundColor: 'var(--evalarm-primary)', color: 'white' }}
  >
    <span className="me-1">⌘</span>
    <span>K</span>
  </button>
);

const AppShell = () => {
  const [sideNavCollapsed, setSideNavCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const { isOpen, width } = useDrawer();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Setze CSS-Variable für Drawer-Breite und Body-Klasse
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('drawer-open');
      document.documentElement.style.setProperty('--drawer-width', `${width}px`);
    } else {
      document.body.classList.remove('drawer-open');
    }
    
    return () => {
      document.body.classList.remove('drawer-open');
    };
  }, [isOpen, width]);
  
  // Bestimmt den aktuellen Seitentitel aus dem Pfad
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/customers')) return 'Kunden';
    if (path.startsWith('/gateways')) return 'Gateways';
    if (path.startsWith('/devices')) return 'Geräte';
    if (path.startsWith('/messages')) return 'Nachrichten';
    if (path.startsWith('/debugger')) return 'Debugger';
    if (path.startsWith('/templates')) return 'Templates';
    if (path.startsWith('/settings')) return 'Einstellungen';
    if (path.startsWith('/status')) return 'Live-Status';
    return '';
  };

  // Generiert Breadcrumbs basierend auf dem aktuellen Pfad
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [];
    
    // Immer Dashboard als erstes
    if (path !== '/') {
      crumbs.push({ label: 'Dashboard', path: '/' });
    }
    
    // Hauptkategorie
    if (path.startsWith('/customers')) {
      crumbs.push({ label: 'Kunden', path: '/customers' });
    } else if (path.startsWith('/gateways')) {
      crumbs.push({ label: 'Gateways', path: '/gateways' });
      
      // Detail-Ansicht mit Gateway-ID
      const matches = path.match(/\/gateways\/([^\/]+)/);
      if (matches && matches[1]) {
        crumbs.push({ label: matches[1], path: null });
      }
    } else if (path.startsWith('/devices')) {
      crumbs.push({ label: 'Geräte', path: '/devices' });
    } else if (path.startsWith('/messages')) {
      crumbs.push({ label: 'Nachrichten', path: '/messages' });
    } else if (path.startsWith('/debugger')) {
      crumbs.push({ label: 'Debugger', path: '/debugger' });
    } else if (path.startsWith('/templates')) {
      crumbs.push({ label: 'Templates', path: '/templates' });
    } else if (path.startsWith('/settings')) {
      crumbs.push({ label: 'Einstellungen', path: '/settings' });
    } else if (path.startsWith('/status')) {
      crumbs.push({ label: 'Betrieb', path: null });
      crumbs.push({ label: 'Live-Status', path: '/status' });
    }
    
    return crumbs;
  };

  const toggleSideNav = () => {
    setSideNavCollapsed(!sideNavCollapsed);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="app-container d-flex flex-column min-vh-100">
      {/* Top Navbar */}
      <Navbar 
        variant="dark" 
        expand="lg" 
        className="top-navbar px-3" 
        fixed="top"
        style={{ backgroundColor: 'var(--evalarm-primary)' }}
      >
        <Container fluid className="px-0">
          <button 
            className="btn border-0 me-2 d-none d-lg-block"
            onClick={toggleSideNav}
            style={{ backgroundColor: 'transparent', color: 'white' }}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <Navbar.Brand className="d-lg-none d-flex align-items-center">
            <img 
              src={evalarmLogo} 
              alt="evAlarm Logo" 
              style={{ height: '28px', width: 'auto', marginRight: '10px' }} 
            />
            evAlarm IoT Gateway
          </Navbar.Brand>
          
          <Nav className="d-flex flex-grow-1 justify-content-between align-items-center">
            <div className="d-none d-lg-flex">
              <CommandPalette />
            </div>
            
            <div className="d-flex">
              <NavDropdown 
                title={<User size={18} />} 
                align="end"
                className="user-dropdown"
              >
                <NavDropdown.Item disabled>
                  {user?.name || user?.username}
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            </div>
          </Nav>
        </Container>
      </Navbar>

      <div className="d-flex flex-grow-1 app-content">
        {/* Side Navigation */}
        <SideNav collapsed={sideNavCollapsed} onToggleCollapse={toggleSideNav} />
        
        {/* Main Content */}
        <main 
          className={`flex-grow-1 main-content ${sideNavCollapsed ? 'main-content-expanded' : ''}`}
          style={isOpen ? { transition: 'margin-right 0.3s ease' } : {}}
        >
          {/* Breadcrumbs */}
          <div className="breadcrumb-container px-4 py-2 border-bottom">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 small">
                {getBreadcrumbs().map((crumb, index) => (
                  <li 
                    key={index} 
                    className={`breadcrumb-item ${!crumb.path ? 'active' : ''}`}
                  >
                    {crumb.path ? (
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); navigate(crumb.path); }}
                        style={{ color: 'var(--evalarm-primary)' }}
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      crumb.label
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          
          {/* Page Content */}
          <div className="page-content p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell; 