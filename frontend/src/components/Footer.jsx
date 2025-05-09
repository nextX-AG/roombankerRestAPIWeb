import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-logo"></div>
          <span className="footer-text">powered by nextX AG</span>
        </div>
        <span className="footer-version">Version 1.0.0</span>
      </div>
    </footer>
  );
};

export default Footer; 