import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <Container fluid>
        <Row className="align-items-center">
          <Col md={6} className="text-md-start text-center mb-2 mb-md-0">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start">
              <div className="footer-logo-placeholder me-2">
                {/* Platzhalter für das Logo */}
                <div className="logo-placeholder"></div>
              </div>
              <span className="footer-text">powered by nextX AG</span>
            </div>
          </Col>
          <Col md={6} className="text-md-end text-center">
            <span className="footer-version">Version 1.0.0</span>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer; 