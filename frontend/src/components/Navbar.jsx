import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faBell, faGear, faList, faCode, faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';

const AppNavbar = () => {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <FontAwesomeIcon icon={faBell} className="me-2" />
          Notfall-IoT Gateway
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          {isAuthenticated() ? (
            <>
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/" active={location.pathname === '/'}>
                  <FontAwesomeIcon icon={faHome} className="me-1" /> Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/messages" active={location.pathname === '/messages'}>
                  <FontAwesomeIcon icon={faList} className="me-1" /> Nachrichten
                </Nav.Link>
                <Nav.Link as={Link} to="/templates" active={location.pathname === '/templates'}>
                  <FontAwesomeIcon icon={faCode} className="me-1" /> Templates
                </Nav.Link>
                <Nav.Link as={Link} to="/settings" active={location.pathname === '/settings'}>
                  <FontAwesomeIcon icon={faGear} className="me-1" /> Einstellungen
                </Nav.Link>
              </Nav>
              <Nav>
                <Navbar.Text className="me-3">
                  <FontAwesomeIcon icon={faUser} className="me-1" />
                  {user?.name || user?.username}
                </Navbar.Text>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  <FontAwesomeIcon icon={faSignOutAlt} className="me-1" /> Logout
                </Button>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/login">
                <FontAwesomeIcon icon={faUser} className="me-1" /> Login
              </Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
