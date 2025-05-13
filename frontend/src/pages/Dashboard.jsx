import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faExchangeAlt, faCheckCircle, faExclamationTriangle, faBell, faTachometerAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Link } from 'react-router-dom';
import config from '../config';

/**
 * Dashboard-Komponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Dashboard = () => {
  const [apiStatus, setApiStatus] = useState('checking');
  const [processorStatus, setProcessorStatus] = useState('checking');
  const [workerStatus, setWorkerStatus] = useState('checking');
  const [lastMessages, setLastMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [error, setError] = useState('');
  const [templateCount, setTemplateCount] = useState(0);
  const [endpointCount, setEndpointCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [latestMessages, setLatestMessages] = useState([]);
  const [creatingMessage, setCreatingMessage] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [creationError, setCreationError] = useState(false);

  // API-Status prüfen
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        console.log('Prüfe API-Status:', `${config.apiBaseUrl}/v1/health`);
        const response = await axios.get(`${config.apiBaseUrl}/v1/health`);
        console.log('API-Status-Antwort:', response.data);
        // Überprüfen, ob die Antwort das erwartete Format hat und ob der Status erfolgreich ist
        if (response.data && response.data.status === 'success') {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (error) {
        console.error('Fehler beim Prüfen des API-Status:', error);
        setApiStatus('offline');
      }
    };

    const checkProcessorStatus = async () => {
      try {
        console.log('Prüfe Processor-Status:', `${config.apiBaseUrl}/v1/system/health`);
        const response = await axios.get(`${config.apiBaseUrl}/v1/system/health`);
        console.log('Processor-Status-Antwort:', response.data);
        // Überprüfen, ob die Antwort das erwartete Format hat und ob der Status erfolgreich ist
        if (response.data && response.data.status === 'success') {
          setProcessorStatus('online');
        } else {
          setProcessorStatus('offline');
        }
      } catch (err) {
        console.error('Fehler beim Prüfen des Processor-Status:', err);
        setProcessorStatus('offline');
      }
    };

    const checkWorkerStatus = async () => {
      try {
        // Worker ist jetzt in Processor integriert, daher greifen wir auf denselben Endpunkt zu
        console.log('Prüfe Worker-Status (integriert im Processor):', `${config.apiBaseUrl}/v1/system/health`);
        const response = await axios.get(`${config.apiBaseUrl}/v1/system/health`);
        console.log('Worker-Status-Antwort:', response.data);
        
        if (response.data && response.data.status === 'success') {
          setWorkerStatus('online');
          
          // Wenn Worker erreichbar ist, Templates und Endpoints abrufen
          try {
            const templatesResponse = await axios.get(`${config.apiBaseUrl}/v1/templates`);
            setTemplates(templatesResponse.data.data || []);
            setTemplateCount((templatesResponse.data.data || []).length);
          } catch (error) {
            console.error('Fehler beim Abrufen der Templates:', error);
            setTemplates([]);
            setTemplateCount(0);
          }
          
          try {
            const endpointsResponse = await axios.get(`${config.apiBaseUrl}/v1/system/endpoints`);
            setEndpoints(endpointsResponse.data.data || []);
            setEndpointCount((endpointsResponse.data.data || []).length);
          } catch (error) {
            console.error('Fehler beim Abrufen der Endpunkte:', error);
            setEndpoints([]);
            setEndpointCount(0);
          }
        } else {
          setWorkerStatus('offline');
        }
      } catch (err) {
        console.error('Fehler beim Prüfen des Worker-Status:', err);
        setWorkerStatus('offline');
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/v1/list-messages`);
        setMessageCount((response.data.data || []).length);
        setLatestMessages((response.data.data || []).slice(0, 3));
      } catch (error) {
        console.error('Fehler beim Abrufen der Nachrichten:', error);
        setMessageCount(0);
        setLatestMessages([]);
      }
    };

    // Initial und alle 10 Sekunden aktualisieren
    checkApiStatus();
    checkProcessorStatus();
    checkWorkerStatus();
    fetchMessages();

    const interval = setInterval(() => {
      checkApiStatus();
      checkProcessorStatus();
      checkWorkerStatus();
      fetchMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const createTestMessage = async () => {
    try {
      setCreatingMessage(true);
      const response = await axios.post(`${config.apiBaseUrl}/v1/system/test-message`);
      setCreationSuccess(true);
      
      // Nachrichten aktualisieren
      const messagesResponse = await axios.get(`${config.apiBaseUrl}/v1/list-messages`);
      setMessageCount((messagesResponse.data.data || []).length);
      setLatestMessages((messagesResponse.data.data || []).slice(0, 3));
      
      setTimeout(() => setCreationSuccess(false), 3000);
    } catch (error) {
      console.error('Fehler beim Erstellen einer Testnachricht:', error);
      setCreationError(true);
      setTimeout(() => setCreationError(false), 3000);
    } finally {
      setCreatingMessage(false);
    }
  };

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <FontAwesomeIcon icon={faTachometerAlt} className="icon" />
        Dashboard
      </h1>
      
      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {creationSuccess && <Alert variant="success" className="mb-4">Testnachricht wurde erfolgreich erstellt!</Alert>}
      {creationError && <Alert variant="danger" className="mb-4">Fehler beim Erstellen der Testnachricht.</Alert>}
      
      {/* 3. Inhalt in Karten */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Header>
              <FontAwesomeIcon icon={faServer} className="me-2" />
              API-Server Status
            </Card.Header>
            <Card.Body className="d-flex flex-column align-items-center justify-content-center">
              {apiStatus === 'online' ? (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} size="3x" className="text-success mb-3" />
                  <h4>
                    <Badge bg="success">Online</Badge>
                  </h4>
                  <p className="text-center">Der API-Server ist aktiv und empfängt Nachrichten.</p>
                </>
              ) : apiStatus === 'checking' ? (
                <p>Prüfe Status...</p>
              ) : (
                <>
                  <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-danger mb-3" />
                  <h4>
                    <Badge bg="danger">Offline</Badge>
                  </h4>
                  <p className="text-center">Der API-Server ist nicht erreichbar.</p>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100">
            <Card.Header>
              <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
              Message Processor Status
            </Card.Header>
            <Card.Body className="d-flex flex-column align-items-center justify-content-center">
              {processorStatus === 'online' ? (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} size="3x" className="text-success mb-3" />
                  <h4>
                    <Badge bg="success">Online</Badge>
                  </h4>
                  <p className="text-center">Der Message Processor ist aktiv und verarbeitet Nachrichten.</p>
                </>
              ) : processorStatus === 'checking' ? (
                <p>Prüfe Status...</p>
              ) : (
                <>
                  <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-danger mb-3" />
                  <h4>
                    <Badge bg="danger">Offline</Badge>
                  </h4>
                  <p className="text-center">Der Message Processor ist nicht erreichbar.</p>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100">
            <Card.Header>
              <FontAwesomeIcon icon={faBell} className="me-2" />
              Testnachricht senden
            </Card.Header>
            <Card.Body className="d-flex flex-column align-items-center justify-content-center">
              <p className="text-center mb-4">
                Senden Sie eine Testnachricht, um die Funktionalität des Systems zu überprüfen.
              </p>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={createTestMessage}
                disabled={apiStatus !== 'online'}
              >
                Panic-Button Testnachricht senden
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              Verfügbare Templates ({templates.length})
            </Card.Header>
            <Card.Body>
              {templates.length > 0 ? (
                <ul className="list-group">
                  {templates.map((template, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      {template}
                      <Badge bg="info">Template</Badge>
                    </li>
                  ))}
                </ul>
              ) : processorStatus === 'online' ? (
                <p>Keine Templates verfügbar.</p>
              ) : (
                <p>Message Processor ist offline. Templates können nicht abgerufen werden.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              Verfügbare Endpunkte ({endpointCount})
            </Card.Header>
            <Card.Body>
              {endpoints.length > 0 ? (
                <ul className="list-group">
                  {endpoints.map((endpoint, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      {endpoint}
                      <Badge bg="info">API Endpunkt</Badge>
                    </li>
                  ))}
                </ul>
              ) : processorStatus === 'online' ? (
                <p>Keine Endpunkte verfügbar.</p>
              ) : (
                <p>Message Processor ist offline. Endpunkte können nicht abgerufen werden.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Header>
              Letzte Nachrichten ({latestMessages.length})
            </Card.Header>
            <Card.Body>
              {latestMessages.length > 0 ? (
                <div>
                  {latestMessages.map((message, index) => (
                    <Card key={index} className="mb-3">
                      <Card.Header className="d-flex justify-content-between">
                        <span>ID: {message.id}</span>
                        <span>Empfangen: {new Date(message.received_at).toLocaleString()}</span>
                      </Card.Header>
                      <Card.Body>
                        <JsonView data={message.data} />
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              ) : apiStatus === 'online' ? (
                <p>Keine Nachrichten verfügbar.</p>
              ) : (
                <p>API-Server ist offline. Nachrichten können nicht abgerufen werden.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Dashboard;
