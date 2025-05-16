import React, { useState } from 'react';
import { Nav, Offcanvas } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import menu from './menu';
import { useAuth } from '../context/AuthContext';

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
    <>
      <div className="side-nav-header p-3 mb-4">
        <div className="d-flex align-items-center">
          <div className="side-nav-logo me-2">
            {/* Logo kann hier eingefügt werden */}
            <div className="logo-placeholder bg-primary text-white rounded d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
              NG
            </div>
          </div>
          {!collapsed && (
            <div className="side-nav-title fw-bold">
              Notfall-IoT Gateway
            </div>
          )}
        </div>
      </div>

      <Nav className="flex-column mb-auto">
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
    </>
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
        className="d-lg-none btn btn-dark position-fixed start-0 top-50 translate-middle-y mobile-nav-toggle"
        onClick={() => setShowMobileNav(true)}
        style={{ zIndex: 1030, borderRadius: '0 4px 4px 0', padding: '10px 5px' }}
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
          <Offcanvas.Title>Menü</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-0">
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