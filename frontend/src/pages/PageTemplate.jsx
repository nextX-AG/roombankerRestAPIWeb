import React from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';

/**
 * Seitenvorlage für alle Komponenten
 * 
 * Struktur:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Beschreibung oder Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt (children)
 * 
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children - Der Inhalt der Seite
 * @param {string} props.title - Der Titel der Seite
 * @param {React.ReactNode} props.icon - Das Icon für die Seite (FontAwesomeIcon oder anderes React-Element)
 * @param {string} [props.description] - Optional: Eine Beschreibung der Seite
 */
const PageTemplate = ({ children, title, icon, description }) => {
  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        {icon || <FontAwesomeIcon icon={faFile} className="icon" />}
        {title || 'Seitenvorlage'}
      </h1>
      
      {/* 2. Beschreibung (bei Bedarf) */}
      {description && (
        <Alert variant="info" className="mb-4">
          {description}
        </Alert>
      )}
      
      {/* 3. Inhalt */}
      {children || (
        <Row className="mb-4">
          <Col md={12}>
            <Card className="h-100">
              <Card.Header>
                Beispielinhalt
              </Card.Header>
              <Card.Body>
                <p>Diese Seite verwendet das PageTemplate, aber es wurden keine Inhalte übergeben.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
};

export default PageTemplate; 