import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Alert, InputGroup, Badge, Nav, Tab, Accordion } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faSearch, faInfoCircle, faExclamationTriangle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import config from '../config';

/**
 * Nachrichten-Verwaltungskomponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('time'); // 'time', 'gateway', 'type'
  const [forwardingStatus, setForwardingStatus] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [queueStatus, setQueueStatus] = useState({});

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiBaseUrl}/messages`);
        setMessages(response.data);
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Abrufen der Nachrichten:', error);
      setError('Fehler beim Abrufen der Nachrichten.');
      setLoading(false);
    }
  };

  const fetchForwardingStatus = async () => {
    try {
      setLoadingStatus(true);
      
      // Hole Weiterleitungsstatus vom Worker
      const forwardingResponse = await axios.get(`${config.workerUrl}/messages/forwarding`);
      setForwardingStatus([
        ...forwardingResponse.data.details.completed,
        ...forwardingResponse.data.details.failed
      ]);
      
      // Hole Queue-Status vom Worker
      const queueResponse = await axios.get(`${config.workerUrl}/messages/queue/status`);
      setQueueStatus(queueResponse.data);
      
      setLoadingStatus(false);
    } catch (error) {
      console.error('Fehler beim Abrufen des Weiterleitungsstatus:', error);
      setError('Fehler beim Abrufen des Weiterleitungsstatus.');
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchForwardingStatus();
    
    // Alle 10 Sekunden aktualisieren
    const interval = setInterval(() => {
      fetchMessages();
      fetchForwardingStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
  };

  const handleRefresh = () => {
    fetchMessages();
  };

  // Extrahiere Gateway-ID aus der Nachricht
  const getGatewayId = (message) => {
    try {
      // Versuche die gateway_id aus dem Inhalt zu extrahieren
      if (message.content && typeof message.content === 'object' && message.content.gateway_id) {
        return message.content.gateway_id;
      }
      // Fallback: Suche in der gesamten Nachricht nach gateway_id
      const contentStr = JSON.stringify(message);
      const match = contentStr.match(/"gateway_id"\s*:\s*"([^"]+)"/);
      return match ? match[1] : 'Unbekanntes Gateway';
    } catch (e) {
      return 'Unbekanntes Gateway';
    }
  };

  // Extrahiere Gerätetyp aus der Nachricht
  const getDeviceType = (message) => {
    try {
      // Prüfe auf alarmtype
      if (message.content && message.content.alarmtype) {
        return message.content.alarmtype.charAt(0).toUpperCase() + message.content.alarmtype.slice(1);
      }
      
      // Prüfe auf subdevicelist
      if (message.content && message.content.subdevicelist && message.content.subdevicelist.length > 0) {
        const device = message.content.subdevicelist[0];
        if (device.values && device.values.alarmtype) {
          return device.values.alarmtype.charAt(0).toUpperCase() + device.values.alarmtype.slice(1);
        }
      }
      
      // Fallbacks
      if (message.type) {
        return message.type.charAt(0).toUpperCase() + message.type.slice(1);
      }
      
      return 'Unbekannter Typ';
    } catch (e) {
      return 'Unbekannter Typ';
    }
  };

  // Filtere Nachrichten basierend auf der Suche
  const filteredMessages = messages.filter((message) => {
    const searchLower = searchQuery.toLowerCase();
    const messageStr = JSON.stringify(message).toLowerCase();
    return messageStr.includes(searchLower);
  });

  // Gruppiere Nachrichten nach Gateway
  const groupedByGateway = filteredMessages.reduce((acc, message) => {
    const gatewayId = getGatewayId(message);
    if (!acc[gatewayId]) {
      acc[gatewayId] = [];
    }
    acc[gatewayId].push(message);
    return acc;
  }, {});

  // Gruppiere nach Gateway, dann nach Typ
  const groupedByGatewayAndType = Object.keys(groupedByGateway).reduce((acc, gatewayId) => {
    acc[gatewayId] = groupedByGateway[gatewayId].reduce((typeAcc, message) => {
      const deviceType = getDeviceType(message);
      if (!typeAcc[deviceType]) {
        typeAcc[deviceType] = [];
      }
      typeAcc[deviceType].push(message);
      return typeAcc;
    }, {});
    return acc;
  }, {});

  // Formatiere Zeitstempel für bessere Lesbarkeit
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unbekannt';
    try {
      // DIREKTE LÖSUNG: Wenn der Timestamp ein Unix-Zeitstempel ist (etwa < 10^10),
      // dann multipliziere mit 1000, um Millisekunden zu erhalten
      if (typeof timestamp === 'number' || !isNaN(Number(timestamp))) {
        const numericTimestamp = Number(timestamp);
        if (numericTimestamp < 10000000000) {
          const date = new Date(numericTimestamp * 1000);
          return date.toLocaleString('de-DE');
        } else {
          const date = new Date(numericTimestamp);
          return date.toLocaleString('de-DE');
        }
      }
      
      // ISO-String Format verarbeiten
      if (typeof timestamp === 'string' && timestamp.includes('T')) {
        const date = new Date(timestamp);
        return date.toLocaleString('de-DE');
      }
      
      // Fallback
      const date = new Date(timestamp);
      return date.toLocaleString('de-DE');
    } catch (e) {
      console.error("Fehler beim Formatieren des Zeitstempels:", e, timestamp);
      return String(timestamp);
    }
  };

  // Hilfsfunktion zum Extrahieren des korrekten empfangenen Datums
  const getCorrectDate = (message) => {
    // Direkt received_at aus dem Nachrichtenobjekt verwenden, wenn vorhanden
    if (message.received_at) {
      return formatTimestamp(message.received_at);
    }
    
    // Wenn message.data und received_at vorhanden, dieses verwenden
    if (message.data && message.data.received_at) {
      return formatTimestamp(message.data.received_at);
    }
    
    // Fallback auf Timestamp
    return formatTimestamp(message.timestamp);
  };

  // Bestimme die Typ-Farbe für visuelle Unterscheidung
  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'alarm':
      case 'panic':
        return 'danger';
      case 'status':
        return 'info';
      case 'temperature':
        return 'primary';
      case 'humidity':
        return 'success';
      default:
        return 'secondary';
    }
  };

  // Kürze lange IDs für die Anzeige
  const shortenId = (id) => {
    if (!id) return 'N/A';
    if (id.length > 12) {
      return id.substring(0, 8) + '...';
    }
    return id;
  };

  // Status einer Nachricht formatieren
  const formatForwardingStatus = (status) => {
    switch(status) {
      case 'completed':
        return <Badge bg="success">Erfolgreich</Badge>;
      case 'failed':
        return <Badge bg="danger">Fehlgeschlagen</Badge>;
      case 'processing':
        return <Badge bg="warning">In Bearbeitung</Badge>;
      case 'pending':
        return <Badge bg="info">Ausstehend</Badge>;
      default:
        return <Badge bg="secondary">Unbekannt</Badge>;
    }
  };

  // Ziel der Weiterleitung formatieren
  const formatEndpoint = (endpoint) => {
    if (endpoint.startsWith('customer_')) {
      return `Kunde: ${endpoint.replace('customer_', '')}`;
    }
    return endpoint === 'evalarm_default' ? 'evAlarm (Standard)' : endpoint;
  };

  // Nachricht erneut versuchen
  const handleRetryMessage = async (messageId) => {
    try {
      await axios.post(`${config.workerUrl}/messages/retry/${messageId}`);
      fetchForwardingStatus();
    } catch (error) {
      console.error('Fehler beim erneuten Versuch:', error);
      setError('Nachricht konnte nicht erneut versucht werden.');
    }
  };

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <FontAwesomeIcon icon={faEnvelope} className="icon" />
        Nachrichten
      </h1>
      
      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      
      {/* 3. Suchleiste und Aktualisieren-Button */}
      <Card className="mb-4">
        <Card.Body>
          <InputGroup>
            <Form.Control
              placeholder="Suche in Nachrichten..."
              value={searchQuery}
              onChange={handleSearch}
            />
            <Button variant="primary" onClick={handleRefresh}>
              <FontAwesomeIcon icon={faSync} className="me-2" />
              Aktualisieren
            </Button>
          </InputGroup>
        </Card.Body>
      </Card>

      {/* 4. Tabs für verschiedene Nachrichtenansichten */}
      <Tab.Container id="message-view-tabs" defaultActiveKey="groupedView">
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="groupedView">Nach Gateways gruppiert</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="chronologicalView">Chronologisch</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="forwardingView">Weiterleitung</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="groupedView">
            <Row>
              <Col md={6}>
                <Card className="message-list-card mb-4">
                  <Card.Header>
                    Gateways und Geräte ({Object.keys(groupedByGatewayAndType).length})
                  </Card.Header>
                  <Card.Body style={{ maxHeight: '700px', overflowY: 'auto' }}>
                    {Object.keys(groupedByGatewayAndType).length > 0 ? (
                      <Accordion defaultActiveKey="0">
                        {Object.keys(groupedByGatewayAndType).map((gatewayId, idx) => (
                          <Accordion.Item key={gatewayId} eventKey={idx.toString()}>
                            <Accordion.Header>
                              <div className="d-flex justify-content-between w-100 align-items-center pr-3">
                                <span>
                                  <strong>Gateway:</strong> {gatewayId.substring(0, 12)}...
                                </span>
                                <Badge bg="info" className="ms-auto">
                                  {Object.values(groupedByGatewayAndType[gatewayId])
                                    .flat().length} Nachrichten
                                </Badge>
                              </div>
                            </Accordion.Header>
                            <Accordion.Body>
                              <Accordion>
                                {Object.keys(groupedByGatewayAndType[gatewayId]).map((deviceType, typeIdx) => (
                                  <Accordion.Item key={`${gatewayId}-${deviceType}`} eventKey={`${idx}-${typeIdx}`}>
                                    <Accordion.Header>
                                      <div className="d-flex justify-content-between w-100 align-items-center">
                                        <span>
                                          <strong>{deviceType}</strong>
                                        </span>
                                        <Badge bg={getTypeColor(deviceType)} className="ms-auto">
                                          {groupedByGatewayAndType[gatewayId][deviceType].length}
                                        </Badge>
                                      </div>
                                    </Accordion.Header>
                                    <Accordion.Body>
                                      <Table hover size="sm">
                                        <thead>
                                          <tr>
                                            <th>Zeit</th>
                                            <th>Status</th>
                                            <th>Aktion</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {groupedByGatewayAndType[gatewayId][deviceType].map((message) => (
                                            <tr 
                                              key={message.id}
                                              className={selectedMessage?.id === message.id ? 'table-primary' : ''}
                                              onClick={() => handleMessageSelect(message)}
                                              style={{ cursor: 'pointer' }}
                                            >
                                              <td>{getCorrectDate(message)}</td>
                                              <td>
                                                <Badge bg={getTypeColor(message.type || deviceType)}>
                                                  {message.type || deviceType}
                                                </Badge>
                                              </td>
                                              <td>
                                                <Button size="sm" variant="outline-primary" onClick={() => handleMessageSelect(message)}>
                                                  Details
                                                </Button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </Table>
                                    </Accordion.Body>
                                  </Accordion.Item>
                                ))}
                              </Accordion>
                            </Accordion.Body>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-center">Keine Nachrichten gefunden</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="message-detail-card">
                  <Card.Header>
                    Nachrichtendetails
                  </Card.Header>
                  <Card.Body>
                    {selectedMessage ? (
                      <>
                        <h5>Metadaten</h5>
                        <Table bordered size="sm" className="mb-3">
                          <tbody>
                            <tr>
                              <th>ID</th>
                              <td>{selectedMessage.id}</td>
                            </tr>
                            <tr>
                              <th>Empfangen</th>
                              <td>{getCorrectDate(selectedMessage)}</td>
                            </tr>
                            <tr>
                              <th>Timestamp</th>
                              <td>{selectedMessage.timestamp}</td>
                            </tr>
                            <tr>
                              <th>Typ</th>
                              <td>
                                <Badge bg={getTypeColor(getDeviceType(selectedMessage))}>
                                  {getDeviceType(selectedMessage)}
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </Table>

                        <h5>Nachrichteninhalt</h5>
                        <div className="border p-3 rounded bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <JsonView data={selectedMessage.content || selectedMessage} />
                        </div>
                      </>
                    ) : (
                      <p className="text-center">Wählen Sie eine Nachricht aus, um die Details anzuzeigen</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>
      
          <Tab.Pane eventKey="chronologicalView">
            <Row>
              <Col md={6}>
                <Card className="message-list-card mb-4">
                  <Card.Header>
                    Nachrichtenliste ({filteredMessages.length})
                  </Card.Header>
                  <Card.Body style={{ maxHeight: '700px', overflowY: 'auto' }}>
                    <Table hover>
                      <thead>
                        <tr>
                          <th>Zeitstempel</th>
                          <th>ID</th>
                          <th>Typ</th>
                          <th>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMessages.length > 0 ? (
                          filteredMessages.map((message) => (
                            <tr 
                              key={message.id}
                              className={selectedMessage?.id === message.id ? 'table-primary' : ''}
                              onClick={() => handleMessageSelect(message)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>{getCorrectDate(message)}</td>
                              <td>{shortenId(message.id)}</td>
                              <td>
                                <Badge bg={getTypeColor(getDeviceType(message))}>
                                  {getDeviceType(message)}
                                </Badge>
                              </td>
                              <td>
                                <Button 
                                  size="sm" 
                                  variant="outline-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMessageSelect(message);
                                  }}
                                >
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="text-center">
                              Keine Nachrichten gefunden
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
        
              <Col md={6}>
                <Card className="message-detail-card">
                  <Card.Header>
                    Nachrichtendetails
                  </Card.Header>
                  <Card.Body>
                    {selectedMessage ? (
                      <>
                        <h5>Metadaten</h5>
                        <Table bordered size="sm" className="mb-3">
                          <tbody>
                            <tr>
                              <th>ID</th>
                              <td>{selectedMessage.id}</td>
                            </tr>
                            <tr>
                              <th>Empfangen</th>
                              <td>{getCorrectDate(selectedMessage)}</td>
                            </tr>
                            <tr>
                              <th>Timestamp</th>
                              <td>{selectedMessage.timestamp}</td>
                            </tr>
                            <tr>
                              <th>Typ</th>
                              <td>
                                <Badge bg={getTypeColor(getDeviceType(selectedMessage))}>
                                  {getDeviceType(selectedMessage)}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <th>Gateway</th>
                              <td>{getGatewayId(selectedMessage)}</td>
                            </tr>
                          </tbody>
                        </Table>
                  
                        <h5>Nachrichteninhalt</h5>
                        <div className="border p-3 rounded bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <JsonView data={selectedMessage.content || selectedMessage} />
                        </div>
                      </>
                    ) : (
                      <p className="text-center">Wählen Sie eine Nachricht aus, um die Details anzuzeigen</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>
          
          <Tab.Pane eventKey="forwardingView">
            <Row>
              <Col md={12} lg={6}>
                <Card className="mb-4">
                  <Card.Header>Weiterleitungs-Status</Card.Header>
                  <Card.Body>
                    <Row className="mb-3">
                      <Col xs={6} md={3}>
                        <div className="d-flex align-items-center">
                          <div className="bg-info p-3 rounded me-2">
                            <FontAwesomeIcon icon={faSync} className="text-white" />
                          </div>
                          <div>
                            <div className="small text-muted">Ausstehend</div>
                            <h4 className="mb-0">{queueStatus.pending_count || 0}</h4>
                          </div>
                        </div>
                      </Col>
                      <Col xs={6} md={3}>
                        <div className="d-flex align-items-center">
                          <div className="bg-warning p-3 rounded me-2">
                            <FontAwesomeIcon icon={faSync} className="text-white fa-spin" />
                          </div>
                          <div>
                            <div className="small text-muted">In Bearbeitung</div>
                            <h4 className="mb-0">{queueStatus.processing_count || 0}</h4>
                          </div>
                        </div>
                      </Col>
                      <Col xs={6} md={3}>
                        <div className="d-flex align-items-center">
                          <div className="bg-success p-3 rounded me-2">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-white" />
                          </div>
                          <div>
                            <div className="small text-muted">Erfolgreich</div>
                            <h4 className="mb-0">{queueStatus.stats?.total_processed || 0}</h4>
                          </div>
                        </div>
                      </Col>
                      <Col xs={6} md={3}>
                        <div className="d-flex align-items-center">
                          <div className="bg-danger p-3 rounded me-2">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-white" />
                          </div>
                          <div>
                            <div className="small text-muted">Fehlgeschlagen</div>
                            <h4 className="mb-0">{queueStatus.failed_count || 0}</h4>
                          </div>
                        </div>
                      </Col>
                    </Row>
                    <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Zeit</th>
                            <th>Template</th>
                            <th>Ziel</th>
                            <th>Status</th>
                            <th>Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingStatus ? (
                            <tr>
                              <td colSpan="5" className="text-center">Lade Weiterleitungsdaten...</td>
                            </tr>
                          ) : forwardingStatus.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center">Keine Weiterleitungsdaten vorhanden</td>
                            </tr>
                          ) : (
                            forwardingStatus.map((status) => (
                              <tr 
                                key={status.id}
                                className={selectedMessage?.id === status.id ? 'table-primary' : ''}
                                onClick={() => handleMessageSelect(status.message)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td>{formatTimestamp(status.completed_at || status.failed_at || status.created_at)}</td>
                                <td>{status.template}</td>
                                <td>{formatEndpoint(status.endpoint)}</td>
                                <td>{formatForwardingStatus(status.status)}</td>
                                <td>
                                  <Button 
                                    size="sm" 
                                    variant="outline-primary"
                                    className="me-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMessageSelect(status.message);
                                    }}
                                  >
                                    Details
                                  </Button>
                                  {status.status === 'failed' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline-warning"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRetryMessage(status.id);
                                      }}
                                    >
                                      Wiederholen
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={12} lg={6}>
                <Card className="message-detail-card">
                  <Card.Header>
                    Nachrichtendetails
                  </Card.Header>
                  <Card.Body>
                    {selectedMessage ? (
                      <>
                        <h5>Metadaten</h5>
                        <Table bordered size="sm" className="mb-3">
                          <tbody>
                            <tr>
                              <th>ID</th>
                              <td>{selectedMessage.id}</td>
                            </tr>
                            <tr>
                              <th>Empfangen</th>
                              <td>{getCorrectDate(selectedMessage)}</td>
                            </tr>
                            <tr>
                              <th>Gateway</th>
                              <td>{getGatewayId(selectedMessage)}</td>
                            </tr>
                            {selectedMessage.result && (
                              <tr>
                                <th>API-Antwort</th>
                                <td>
                                  {selectedMessage.result.response_status === 200 ? (
                                    <Badge bg="success">Erfolgreich ({selectedMessage.result.response_status})</Badge>
                                  ) : (
                                    <Badge bg="danger">Fehler ({selectedMessage.result.response_status})</Badge>
                                  )}
                                </td>
                              </tr>
                            )}
                            {selectedMessage.error && (
                              <tr>
                                <th>Fehler</th>
                                <td><span className="text-danger">{selectedMessage.error}</span></td>
                              </tr>
                            )}
                          </tbody>
                        </Table>

                        <h5>Nachrichteninhalt</h5>
                        <div className="border p-3 rounded bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <JsonView data={selectedMessage.message || selectedMessage.content || selectedMessage} />
                        </div>

                        {selectedMessage.result && selectedMessage.result.transformed_message && (
                          <>
                            <h5 className="mt-3">Transformierte Nachricht</h5>
                            <div className="border p-3 rounded bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                              <JsonView data={selectedMessage.result.transformed_message} />
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-center">Wählen Sie eine Nachricht aus, um die Details anzuzeigen</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </>
  );
};

export default Messages;
