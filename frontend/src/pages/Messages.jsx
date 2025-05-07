import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert, InputGroup, Badge, Nav, Tab, Accordion } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faSearch, faInfoCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import config from '../config';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('time'); // 'time', 'gateway', 'type'

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

  useEffect(() => {
    fetchMessages();
    
    // Alle 10 Sekunden aktualisieren
    const interval = setInterval(() => {
      fetchMessages();
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
      const date = new Date(timestamp);
      return date.toLocaleString('de-DE');
    } catch (e) {
      return timestamp;
    }
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

  return (
    <Container fluid className="py-4">
      <h1 className="mb-4">Nachrichten</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <InputGroup className="mb-3">
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

      <Tab.Container id="message-view-tabs" defaultActiveKey="groupedView">
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="groupedView">Nach Gateways gruppiert</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="chronologicalView">Chronologisch</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="groupedView">
            <Row>
              <Col md={6}>
                <Card className="message-list-card mb-4">
                  <Card.Header className="bg-primary text-white">
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
                                              <td>{formatTimestamp(message.timestamp)}</td>
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
                  <Card.Header className="bg-primary text-white">
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
                              <td>{formatTimestamp(selectedMessage.timestamp)}</td>
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
            <Card.Header className="bg-primary text-white">
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
                              <td>{formatTimestamp(message.timestamp)}</td>
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
            <Card.Header className="bg-primary text-white">
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
                              <td>{formatTimestamp(selectedMessage.timestamp)}</td>
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
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default Messages;
