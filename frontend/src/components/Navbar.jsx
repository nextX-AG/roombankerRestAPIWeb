import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faBell, faGear, faList, faCode, faUser, 
  faSignOutAlt, faBuilding, faNetworkWired, faDesktop, faBug, faEnvelope, faFileText, faLayers, faCpu
} from '@fortawesome/free-solid-svg-icons';
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
                <Nav.Link as={Link} to="/customers" active={location.pathname === '/customers'}>
                  <FontAwesomeIcon icon={faBuilding} className="me-1" /> Kunden
                </Nav.Link>
                <Nav.Link as={Link} to="/gateways" active={location.pathname === '/gateways'}>
                  <FontAwesomeIcon icon={faNetworkWired} className="me-1" /> Gateways
                </Nav.Link>
                <Nav.Link as={Link} to="/devices" active={location.pathname === '/devices'}>
                  <FontAwesomeIcon icon={faDesktop} className="me-1" /> Geräte
                </Nav.Link>
                <Nav.Link as={Link} to="/device-registry" active={location.pathname === '/device-registry'}>
                  <FontAwesomeIcon icon={faCpu} className="me-1" /> Device Registry
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/messages" 
                  className="d-flex align-items-center gap-2"
                  active={location.pathname === '/messages'}
                  title="Nachrichten"
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span className="nav-link-text">Nachrichten</span>
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/debugger" 
                  className="d-flex align-items-center gap-2"
                  active={location.pathname === '/debugger'}
                  title="Debugger"
                >
                  <FontAwesomeIcon icon={faBug} />
                  <span className="nav-link-text">Debugger</span>
                </Nav.Link>
                <Nav.Link as={Link} to="/templates" active={location.pathname === '/templates'}>
                  <FontAwesomeIcon icon={faFileText} className="me-1" />
                  Templates
                </Nav.Link>
                <Nav.Link as={Link} to="/template-groups" active={location.pathname === '/template-groups'}>
                  <FontAwesomeIcon icon={faLayers} className="me-1" />
                  Template-Gruppen
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
