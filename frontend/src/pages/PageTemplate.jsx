import React from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';

/**
 * Seitenvorlage für alle Komponenten
 * 
 * Struktur:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers (Card, Card.Header, Card.Body)
 */
const PageTemplate = () => {
  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <FontAwesomeIcon icon={faFile} className="icon" />
        Seitenvorlage
      </h1>
      
      {/* 2. Fehler/Erfolgs-Anzeigen (bei Bedarf) */}
      <Alert variant="info" className="mb-4">
        Diese Seite dient als Vorlage für das einheitliche Layout aller Seiten.
      </Alert>
      
      {/* 3. Inhalt in Karten */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              Kartenüberschrift
            </Card.Header>
            <Card.Body>
              <p>Karteninhalt mit einheitlichem Abstand.</p>
              <p>Verwende Bootstrap-Klassen für Layout und Formatierung.</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              Weitere Informationen
            </Card.Header>
            <Card.Body>
              <p>Alle Seiten sollten diesem Grundlayout folgen:</p>
              <ul>
                <li>Seiten-Titel mit Icon</li>
                <li>Alerts für Feedback</li>
                <li>Karten für Inhalte</li>
                <li>Konsistente Abstände (mb-4, etc.)</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PageTemplate; 