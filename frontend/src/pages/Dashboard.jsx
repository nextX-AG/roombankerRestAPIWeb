import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faExchangeAlt, faCheckCircle, faExclamationTriangle, faBell, faTachometerAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Link } from 'react-router-dom';
import config from '../config';

const Dashboard = () => {
  const [apiStatus, setApiStatus] = useState('checking');
  const [processorStatus, setProcessorStatus] = useState('checking');
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
        const response = await axios.get(`${config.apiBaseUrl}/health`);
        setApiStatus(response.data.status === 'ok' ? 'online' : 'offline');
      } catch (error) {
        console.error('Fehler beim Prüfen des API-Status:', error);
        setApiStatus('offline');
      }
    };

    const checkProcessorStatus = async () => {
      try {
        const response = await axios.get(`${config.processorUrl}/templates`);
        if (response.status === 200) {
          setProcessorStatus('online');
          setTemplates(response.data);
        } else {
          setProcessorStatus('offline');
        }
      } catch (err) {
        setProcessorStatus('offline');
      }
    };

    const fetchEndpoints = async () => {
      try {
        const response = await axios.get(`${config.processorUrl}/endpoints`);
        setEndpointCount(response.data.length);
      } catch (error) {
        console.error('Fehler beim Abrufen der Endpunkte:', error);
        setEndpointCount(0);
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/messages`);
        setMessageCount(response.data.length);
        setLatestMessages(response.data.slice(0, 3));
      } catch (error) {
        console.error('Fehler beim Abrufen der Nachrichten:', error);
        setMessageCount(0);
        setLatestMessages([]);
      }
    };

    // Initial und alle 10 Sekunden aktualisieren
    checkApiStatus();
    checkProcessorStatus();
    fetchEndpoints();
    fetchMessages();

    const interval = setInterval(() => {
      checkApiStatus();
      checkProcessorStatus();
      fetchEndpoints();
      fetchMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const createTestMessage = async () => {
    try {
      setCreatingMessage(true);
      const response = await axios.post(`${config.apiBaseUrl}/test-message`);
      setCreationSuccess(true);
      
      // Nachrichten aktualisieren
      const messagesResponse = await axios.get(`${config.apiBaseUrl}/messages`);
      setMessageCount(messagesResponse.data.length);
      setLatestMessages(messagesResponse.data.slice(0, 3));
      
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
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <FontAwesomeIcon icon={faTachometerAlt} className="icon" />
          Dashboard
        </h1>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
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
          <Card>
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
          <Card>
            <Card.Header>
              Verfügbare Endpunkte ({endpoints.length})
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
    </div>
  );
};

export default Dashboard;
