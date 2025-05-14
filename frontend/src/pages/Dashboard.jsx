import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faExchangeAlt, faCheckCircle, faExclamationTriangle, faBell, faTachometerAlt, faSync } from '@fortawesome/free-solid-svg-icons';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Link } from 'react-router-dom';
import config from '../config';
import { systemApi, templateApi, messageApi } from '../api';

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
  const [loading, setLoading] = useState(true);

  // Zentrale Funktion zum Laden aller Daten
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        checkApiStatus(),
        checkProcessorStatus(),
        checkWorkerStatus(),
        fetchMessages(),
        fetchTemplates(),
        fetchEndpoints()
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Dashboard-Daten:', error);
      setError('Einige Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  // API-Status prüfen
  const checkApiStatus = async () => {
    try {
      console.log('Prüfe API-Status');
      const response = await systemApi.health();
      console.log('API-Status-Antwort:', response);
      if (response.status === 'success') {
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
      console.log('Prüfe Processor-Status');
      const response = await systemApi.health();
      console.log('Processor-Status-Antwort:', response);
      if (response.status === 'success') {
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
      console.log('Prüfe Worker-Status (integriert im Processor)');
      const response = await systemApi.health();
      console.log('Worker-Status-Antwort:', response);
      
      if (response.status === 'success') {
        setWorkerStatus('online');
      } else {
        setWorkerStatus('offline');
      }
    } catch (err) {
      console.error('Fehler beim Prüfen des Worker-Status:', err);
      setWorkerStatus('offline');
    }
  };

  const fetchTemplates = async () => {
    try {
      console.log('Lade Templates');
      const response = await templateApi.list();
      console.log('Templates-Antwort:', response);
      if (response.status === 'success') {
        setTemplates(response.data || []);
        setTemplateCount((response.data || []).length);
      } else {
        setTemplates([]);
        setTemplateCount(0);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Templates:', error);
      setTemplates([]);
      setTemplateCount(0);
    }
  };

  const fetchEndpoints = async () => {
    try {
      console.log('Lade Endpoints');
      const response = await systemApi.endpoints();
      console.log('Endpoints-Antwort:', response);
      if (response.status === 'success') {
        setEndpoints(response.data || []);
        setEndpointCount((response.data || []).length);
      } else {
        setEndpoints([]);
        setEndpointCount(0);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Endpunkte:', error);
      setEndpoints([]);
      setEndpointCount(0);
    }
  };

  const fetchMessages = async () => {
    try {
      console.log('Lade Nachrichten');
      const response = await messageApi.list();
      console.log('Nachrichten-Antwort:', response);
      if (response.status === 'success') {
        // Extrahiere die Nachrichten aus dem data-Feld
        const messages = response.data || [];
        // Sortiere die Nachrichten nach dem Zeitstempel in absteigender Reihenfolge
        const sortedMessages = Array.isArray(messages) 
          ? [...messages].sort((a, b) => {
              // Verwende created_at als Zeitstempel für die Sortierung
              const timeA = a.created_at || 0;
              const timeB = b.created_at || 0;
              return timeB - timeA;
            })
          : [];
        
        setMessageCount(sortedMessages.length);
        // Nehme die neuesten 3 Nachrichten
        setLatestMessages(sortedMessages.slice(0, 3));
      } else {
        setMessageCount(0);
        setLatestMessages([]);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Nachrichten:', error);
      setMessageCount(0);
      setLatestMessages([]);
    }
  };

  // Initial und alle 10 Sekunden aktualisieren
  useEffect(() => {
    // Initial laden
    loadAllData();

    // Polling-Intervall einrichten
    const interval = setInterval(() => {
      loadAllData();
    }, 10000);

    // Aufräumen beim Unmounten
    return () => clearInterval(interval);
  }, []);
  
  // Manuelles Neuladen implementieren
  const handleRefresh = () => {
    loadAllData();
  };

  const createTestMessage = async () => {
    try {
      setCreatingMessage(true);
      const response = await systemApi.testMessage(); // Annahme, dass dies im systemApi implementiert ist
      if (response.status === 'success') {
        setCreationSuccess(true);
        
        // Nachrichten sofort aktualisieren
        await fetchMessages();
        
        setTimeout(() => setCreationSuccess(false), 3000);
      } else {
        throw new Error(response.error?.message || 'Fehler beim Erstellen der Testnachricht');
      }
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
      
      {/* Manueller Refresh-Button */}
      <Row className="mb-4">
        <Col className="d-flex justify-content-end">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faSync} className="me-1" />
            {loading ? 'Wird aktualisiert...' : 'Aktualisieren'}
          </Button>
        </Col>
      </Row>
      
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
                disabled={apiStatus !== 'online' || creatingMessage}
              >
                {creatingMessage ? 'Sende Testnachricht...' : 'Panic-Button Testnachricht senden'}
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
                        <span>
                          {message.status === 'failed' ? (
                            <Badge bg="danger">Fehlgeschlagen</Badge>
                          ) : message.status === 'processed' ? (
                            <Badge bg="success">Verarbeitet</Badge>
                          ) : (
                            <Badge bg="info">{message.status}</Badge>
                          )}
                        </span>
                        <span>Erstellt: {new Date(message.created_at * 1000).toLocaleString()}</span>
                      </Card.Header>
                      <Card.Body>
                        {message.error && (
                          <Alert variant="danger" className="mb-3">
                            <strong>Fehler:</strong> {message.error}
                          </Alert>
                        )}
                        <div className="mb-3">
                          <h6>Gateway-ID:</h6>
                          <code>{message.gateway_id || 'Nicht verfügbar'}</code>
                        </div>
                        <div className="mb-3">
                          <h6>Template:</h6>
                          <code>{message.template || 'Kein Template'}</code>
                        </div>
                        <h6>Nachrichteninhalt:</h6>
                        <JsonView data={message.message || {}} />
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
