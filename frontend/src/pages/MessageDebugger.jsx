import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Alert, InputGroup, Badge, Nav, Tab, Accordion } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faBug, faArrowRight, faCopy, faCheck, faTimes, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { messageApi } from '../api';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

/**
 * Message Debugger Komponente
 * 
 * Visualisiert jeden Schritt in der Nachrichtenverarbeitungs-Pipeline:
 * Nachricht → Extraktion → Normalisierung → Filterung → Transformation → Weiterleitung
 */
const MessageDebugger = () => {
  // State für die Rohdaten und die verarbeiteten Daten nach jedem Pipeline-Schritt
  const [rawMessage, setRawMessage] = useState('');
  const [processedMessage, setProcessedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState('raw'); // Aktiver Pipeline-Schritt
  const [debugResult, setDebugResult] = useState({
    extracted: null,
    normalized: null,
    filtered: null,
    transformed: null,
    forwarded: null
  });
  
  // Aktuelle Test-Nachricht für das Testformular
  const [testMessage, setTestMessage] = useState(JSON.stringify({
    "gateway_id": "gw-test-123",
    "message": {
      "code": 2030,
      "subdeviceid": 673922542395461,
      "alarmstatus": "alarm",
      "alarmtype": "panic",
      "batterystatus": "connected",
      "ts": 1747344697
    }
  }, null, 2));

  // Funktion zum Verarbeiten und Debuggen einer Nachricht
  const debugMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parsen der eingegebenen Nachricht
      let messageObject;
      try {
        messageObject = JSON.parse(rawMessage);
      } catch (e) {
        throw new Error('Ungültiges JSON-Format: ' + e.message);
      }
      
      // API-Aufruf zum Debugging der Nachricht
      const response = await messageApi.debugMessage(messageObject);
      
      if (response.status === 'success') {
        setProcessedMessage(response.data);
        
        // Setze die Ergebnisse der einzelnen Pipeline-Schritte
        setDebugResult({
          extracted: response.data.extraction_result || null,
          normalized: response.data.normalized_message || null,
          filtered: {
            should_forward: response.data.filter_result?.should_forward || false,
            matching_rules: response.data.filter_result?.matching_rules || [],
            all_rules: response.data.filter_result?.all_rules || []
          },
          transformed: response.data.transformed_message || null,
          forwarded: response.data.forwarding_result || null
        });
        
        // Setze den aktiven Schritt auf den ersten verfügbaren
        setActiveStep('raw');
      } else {
        throw new Error(response.error?.message || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      console.error('Fehler beim Debuggen der Nachricht:', error);
      setError(error.message || 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Funktion zum Laden einer vorgefertigten Testnachricht
  const useTestMessage = () => {
    setRawMessage(testMessage);
  };

  // Funktion zum Kopieren von JSON in die Zwischenablage
  const copyToClipboard = (data) => {
    try {
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(jsonString);
      alert('JSON in Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
      alert('Fehler beim Kopieren: ' + error.message);
    }
  };

  // Render-Funktion für die verschiedenen Pipeline-Schritte
  const renderPipelineStep = (step) => {
    switch (step) {
      case 'raw':
        return (
          <Card.Body>
            <h5 className="mb-3">Rohe Eingangsnachricht</h5>
            <p>
              Dies ist die unverarbeitete Nachricht, wie sie von einem Gateway empfangen wird. 
              Geben Sie eine JSON-Nachricht ein oder verwenden Sie die Test-Nachricht.
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Nachricht (JSON-Format)</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={10}
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                placeholder='{ "gateway_id": "gw-123", "message": { "code": 2030, ... } }'
              />
            </Form.Group>
            <div className="d-flex gap-2 mb-3">
              <Button 
                variant="secondary" 
                onClick={useTestMessage}
              >
                Test-Nachricht laden
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => copyToClipboard(rawMessage)}
              >
                <FontAwesomeIcon icon={faCopy} className="me-1" />
                Kopieren
              </Button>
            </div>
            <div className="mt-4 d-grid gap-2">
              <Button 
                variant="primary" 
                onClick={debugMessage}
                disabled={loading || !rawMessage.trim()}
              >
                <FontAwesomeIcon icon={faBug} className="me-2" />
                {loading ? 'Verarbeite...' : 'Nachricht debuggen'}
              </Button>
            </div>
          </Card.Body>
        );
      
      case 'extraction':
        return (
          <Card.Body>
            <h5 className="mb-3">Extrahierte Daten</h5>
            <p>
              In dieser Phase werden grundlegende Informationen aus der Rohnachricht extrahiert, 
              wie Gateway-ID und die eigentliche Nutzdaten.
            </p>
            {debugResult.extracted ? (
              <>
                <div className="border rounded p-3 bg-light mb-3" style={{maxHeight: '400px', overflowY: 'auto'}}>
                  <JsonView data={debugResult.extracted} />
                </div>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => copyToClipboard(debugResult.extracted)}
                >
                  <FontAwesomeIcon icon={faCopy} className="me-1" />
                  Kopieren
                </Button>
              </>
            ) : (
              <Alert variant="info">Keine Extraktionsdaten verfügbar</Alert>
            )}
          </Card.Body>
        );
      
      case 'normalization':
        return (
          <Card.Body>
            <h5 className="mb-3">Normalisierte Nachricht</h5>
            <p>
              In dieser Phase wird die Nachricht in ein standardisiertes internes Format konvertiert,
              unabhängig vom ursprünglichen Format der Eingangsnachricht.
            </p>
            {debugResult.normalized ? (
              <>
                <div className="border rounded p-3 bg-light mb-3" style={{maxHeight: '400px', overflowY: 'auto'}}>
                  <JsonView data={debugResult.normalized} />
                </div>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => copyToClipboard(debugResult.normalized)}
                >
                  <FontAwesomeIcon icon={faCopy} className="me-1" />
                  Kopieren
                </Button>
              </>
            ) : (
              <Alert variant="info">Keine normalisierten Daten verfügbar</Alert>
            )}
          </Card.Body>
        );
      
      case 'filtering':
        return (
          <Card.Body>
            <h5 className="mb-3">Filterung</h5>
            <p>
              In dieser Phase wird anhand von Filterregeln entschieden, ob die Nachricht 
              weitergeleitet werden soll oder nicht.
            </p>
            {debugResult.filtered ? (
              <>
                <div className="mb-3">
                  <h6>Filterentscheidung:</h6>
                  {debugResult.filtered.should_forward ? (
                    <Alert variant="success">
                      <FontAwesomeIcon icon={faCheck} className="me-2" />
                      Diese Nachricht wird weitergeleitet
                    </Alert>
                  ) : (
                    <Alert variant="warning">
                      <FontAwesomeIcon icon={faTimes} className="me-2" />
                      Diese Nachricht wird NICHT weitergeleitet
                    </Alert>
                  )}
                </div>
                
                <div className="mb-3">
                  <h6>Zutreffende Filterregeln ({debugResult.filtered.matching_rules.length}):</h6>
                  {debugResult.filtered.matching_rules.length > 0 ? (
                    <ul className="list-group">
                      {debugResult.filtered.matching_rules.map((rule, index) => (
                        <li className="list-group-item" key={index}>
                          <Badge bg="success" className="me-2">Trifft zu</Badge>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Keine zutreffenden Filterregeln gefunden.</p>
                  )}
                </div>
                
                <div className="mb-3">
                  <h6>Alle geprüften Filterregeln ({debugResult.filtered.all_rules.length}):</h6>
                  {debugResult.filtered.all_rules.length > 0 ? (
                    <div className="border rounded p-3 bg-light mb-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                      <JsonView data={debugResult.filtered.all_rules} />
                    </div>
                  ) : (
                    <p>Keine Filterregeln verfügbar.</p>
                  )}
                </div>
              </>
            ) : (
              <Alert variant="info">Keine Filterergebnisse verfügbar</Alert>
            )}
          </Card.Body>
        );
      
      case 'transformation':
        return (
          <Card.Body>
            <h5 className="mb-3">Transformation</h5>
            <p>
              In dieser Phase wird die normalisierte Nachricht in ein Zielformat (z.B. evAlarm)
              transformiert, basierend auf einem Template.
            </p>
            {debugResult.transformed ? (
              <>
                <h6>Verwendetes Template:</h6>
                <p><code>{processedMessage?.template_name || 'Unbekannt'}</code></p>
                
                <h6>Transformiertes Ergebnis:</h6>
                <div className="border rounded p-3 bg-light mb-3" style={{maxHeight: '400px', overflowY: 'auto'}}>
                  <JsonView data={debugResult.transformed} />
                </div>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => copyToClipboard(debugResult.transformed)}
                >
                  <FontAwesomeIcon icon={faCopy} className="me-1" />
                  Kopieren
                </Button>
              </>
            ) : (
              <Alert variant="info">Keine Transformationsdaten verfügbar</Alert>
            )}
          </Card.Body>
        );
      
      case 'forwarding':
        return (
          <Card.Body>
            <h5 className="mb-3">Weiterleitung</h5>
            <p>
              In dieser Phase wird die transformierte Nachricht an das Zielsystem (z.B. evAlarm) 
              weitergeleitet oder die Weiterleitung simuliert.
            </p>
            {debugResult.forwarded ? (
              <>
                <h6>Weiterleitungsziel:</h6>
                <p><code>{debugResult.forwarded.endpoint || 'N/A'}</code></p>
                
                <h6>API-Antwort:</h6>
                <Alert variant={debugResult.forwarded.success ? 'success' : 'danger'}>
                  {debugResult.forwarded.success ? (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="me-2" />
                      Weiterleitung erfolgreich 
                      (Status: {debugResult.forwarded.response_status || 'N/A'})
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faTimes} className="me-2" />
                      Weiterleitung fehlgeschlagen 
                      (Status: {debugResult.forwarded.response_status || 'N/A'})
                    </>
                  )}
                </Alert>
                
                {debugResult.forwarded.response_data && (
                  <>
                    <h6>Antwortdaten:</h6>
                    <div className="border rounded p-3 bg-light mb-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                      <JsonView data={debugResult.forwarded.response_data} />
                    </div>
                  </>
                )}
                
                {debugResult.forwarded.error && (
                  <>
                    <h6>Fehlermeldung:</h6>
                    <Alert variant="danger">
                      {debugResult.forwarded.error}
                    </Alert>
                  </>
                )}
              </>
            ) : (
              <Alert variant="info">Keine Weiterleitungsdaten verfügbar</Alert>
            )}
            
            <div className="mt-4">
              <Button 
                variant="primary" 
                onClick={() => alert('Diese Funktion ist noch nicht implementiert')}
                disabled={!debugResult.transformed || loading}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                Nachricht manuell weiterleiten
              </Button>
            </div>
          </Card.Body>
        );
      
      default:
        return <Card.Body>Unbekannter Schritt</Card.Body>;
    }
  };

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <FontAwesomeIcon icon={faBug} className="icon" />
        Nachrichten-Debugger
      </h1>
      
      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      
      {/* 3. Einführungstext */}
      <Card className="mb-4">
        <Card.Body>
          <h5>Nachrichten-Verarbeitungs-Pipeline</h5>
          <p>
            Dieses Tool hilft bei der Analyse und dem Debugging der Nachrichtenverarbeitung.
            Jeder Schritt in der Pipeline kann separat betrachtet werden:
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-center">
            <Badge bg="light" text="dark" className="p-2">Rohe Nachricht</Badge>
            <FontAwesomeIcon icon={faArrowRight} />
            <Badge bg="light" text="dark" className="p-2">Extraktion</Badge>
            <FontAwesomeIcon icon={faArrowRight} />
            <Badge bg="light" text="dark" className="p-2">Normalisierung</Badge>
            <FontAwesomeIcon icon={faArrowRight} />
            <Badge bg="light" text="dark" className="p-2">Filterung</Badge>
            <FontAwesomeIcon icon={faArrowRight} />
            <Badge bg="light" text="dark" className="p-2">Transformation</Badge>
            <FontAwesomeIcon icon={faArrowRight} />
            <Badge bg="light" text="dark" className="p-2">Weiterleitung</Badge>
          </div>
        </Card.Body>
      </Card>
      
      {/* 4. Pipeline-Visualisierung */}
      <Row>
        <Col md={3}>
          <Card className="mb-4">
            <Card.Header>Pipeline-Schritte</Card.Header>
            <div className="list-group list-group-flush">
              <button 
                className={`list-group-item list-group-item-action ${activeStep === 'raw' ? 'active' : ''}`}
                onClick={() => setActiveStep('raw')}
              >
                1. Rohe Nachricht
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeStep === 'extraction' ? 'active' : ''}`}
                onClick={() => setActiveStep('extraction')}
                disabled={!processedMessage}
              >
                2. Extraktion
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeStep === 'normalization' ? 'active' : ''}`}
                onClick={() => setActiveStep('normalization')}
                disabled={!debugResult.normalized}
              >
                3. Normalisierung
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeStep === 'filtering' ? 'active' : ''}`}
                onClick={() => setActiveStep('filtering')}
                disabled={!debugResult.filtered}
              >
                4. Filterung
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeStep === 'transformation' ? 'active' : ''}`}
                onClick={() => setActiveStep('transformation')}
                disabled={!debugResult.transformed}
              >
                5. Transformation
              </button>
              <button 
                className={`list-group-item list-group-item-action ${activeStep === 'forwarding' ? 'active' : ''}`}
                onClick={() => setActiveStep('forwarding')}
                disabled={!debugResult.forwarded}
              >
                6. Weiterleitung
              </button>
            </div>
          </Card>
          
          {processedMessage && (
            <Card className="mb-4">
              <Card.Header>Verarbeitungs-Info</Card.Header>
              <Card.Body>
                <p className="mb-1"><strong>Gateway-ID:</strong> {processedMessage.gateway_id || 'N/A'}</p>
                <p className="mb-1"><strong>Template:</strong> {processedMessage.template_name || 'N/A'}</p>
                <p className="mb-1">
                  <strong>Weiterleitung:</strong>{' '}
                  {debugResult.filtered?.should_forward ? (
                    <Badge bg="success">Ja</Badge>
                  ) : (
                    <Badge bg="warning">Nein</Badge>
                  )}
                </p>
                <p className="mb-1">
                  <strong>Status:</strong>{' '}
                  {processedMessage.success ? (
                    <Badge bg="success">Erfolgreich</Badge>
                  ) : (
                    <Badge bg="danger">Fehlgeschlagen</Badge>
                  )}
                </p>
              </Card.Body>
            </Card>
          )}
        </Col>
        
        <Col md={9}>
          <Card className="mb-4">
            <Card.Header>
              {activeStep === 'raw' && 'Eingangsnachricht'}
              {activeStep === 'extraction' && 'Extraktionsergebnis'}
              {activeStep === 'normalization' && 'Normalisierte Nachricht'}
              {activeStep === 'filtering' && 'Filterung'}
              {activeStep === 'transformation' && 'Transformationsergebnis'}
              {activeStep === 'forwarding' && 'Weiterleitungsergebnis'}
            </Card.Header>
            {renderPipelineStep(activeStep)}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default MessageDebugger; 