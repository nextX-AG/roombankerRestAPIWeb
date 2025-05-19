import React, { useState } from 'react';
import { Nav, Offcanvas } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import menu from './menu';
import { useAuth } from '../context/AuthContext';
import evalarmLogo from '../assets/evalarm-logo.png';

const SideNav = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // State für die Mobilansicht (Offcanvas)
  const [showMobileNav, setShowMobileNav] = useState(false);
  
  // Prüft, ob der angegebene Pfad der aktuelle Pfad ist oder ein Unterpfad davon
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  // Rendert ein einzelnes Menüitem
  const renderMenuItem = (item) => {
    const Icon = item.icon;
    
    return (
      <Nav.Link 
        as={Link} 
        to={item.to} 
        key={item.to}
        className={`side-nav-item d-flex align-items-center py-2 ${isActive(item.to) ? 'active' : ''}`}
        style={{ color: 'var(--evalarm-primary)' }}
      >
        {Icon && <Icon size={18} className="me-3" />}
        <span className={`${collapsed ? 'd-none' : ''}`}>{item.label}</span>
      </Nav.Link>
    );
  };
  
  // Rendert eine Gruppe mit Untermenüs
  const renderMenuGroup = (group, index) => {
    return (
      <div className="side-nav-group mb-3" key={index}>
        <div className="side-nav-group-title text-muted mb-2 px-3">
          {!collapsed && group.label}
        </div>
        <Nav className="flex-column">
          {group.items?.map(renderMenuItem)}
        </Nav>
      </div>
    );
  };

  // Inhalt der Navigation
  const navContent = (
    <div className="d-flex flex-column h-100">
      <div className="side-nav-header p-3 mb-4" style={{ borderBottom: '1px solid var(--evalarm-border)' }}>
        <div className="d-flex align-items-center">
          <div className="side-nav-logo me-2">
            {/* evAlarm Logo */}
            <img 
              src={evalarmLogo} 
              alt="evAlarm Logo" 
              style={{ height: '32px', width: 'auto' }} 
            />
          </div>
        </div>
      </div>

      <Nav className="flex-column flex-grow-1">
        {menu.map((item, index) => (
          item.items 
            ? renderMenuGroup(item, index) 
            : renderMenuItem(item)
        ))}
      </Nav>

      <div className="side-nav-footer p-3 mt-auto border-top">
        {!collapsed && (
          <div className="user-info small">
            <div className="fw-bold">{user?.name || user?.username}</div>
            <div className="text-muted">Administrator</div>
          </div>
        )}
      </div>
    </div>
  );

  // Desktop-Variante (permanent)
  const desktopNav = (
    <div className={`side-nav d-none d-lg-flex flex-column ${collapsed ? 'side-nav-collapsed' : ''}`}>
      {navContent}
    </div>
  );

  // Mobile-Variante (Offcanvas)
  const mobileNav = (
    <>
      <button 
        className="d-lg-none btn position-fixed start-0 top-50 translate-middle-y mobile-nav-toggle"
        onClick={() => setShowMobileNav(true)}
        style={{ 
          zIndex: 1030, 
          borderRadius: '0 4px 4px 0', 
          padding: '10px 5px',
          backgroundColor: 'var(--evalarm-primary)',
          color: 'white'
        }}
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      
      <Offcanvas 
        show={showMobileNav} 
        onHide={() => setShowMobileNav(false)}
        placement="start"
        className="side-nav-mobile"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <div className="d-flex align-items-center">
              <img 
                src={evalarmLogo} 
                alt="evAlarm Logo" 
                style={{ height: '28px', width: 'auto' }}
              />
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0 h-100">
          {navContent}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );

  return (
    <>
      {desktopNav}
      {mobileNav}
    </>
  );
};

export default SideNav; 