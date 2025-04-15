import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faSearch } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import config from '../config';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiBaseUrl}/messages`);
      setMessages(response.data);
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

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
  };

  const filteredMessages = messages.filter(message => {
    if (!searchTerm) return true;
    
    // Suche in ID und Daten
    const messageStr = JSON.stringify(message).toLowerCase();
    return messageStr.includes(searchTerm.toLowerCase());
  });

  return (
    <Container>
      <h1 className="mb-4">Nachrichten</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Control
              type="text"
              placeholder="Suche in Nachrichten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={6} className="text-end">
          <Button variant="primary" onClick={fetchMessages}>
            <FontAwesomeIcon icon={faSync} className="me-2" />
            Aktualisieren
          </Button>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header className="bg-primary text-white">
              Nachrichtenliste ({filteredMessages.length})
            </Card.Header>
            <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {loading ? (
                <p>Lade Nachrichten...</p>
              ) : filteredMessages.length > 0 ? (
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
                    {filteredMessages.map((message, index) => (
                      <tr 
                        key={index} 
                        onClick={() => handleMessageSelect(message)}
                        className={selectedMessage && selectedMessage.id === message.id ? 'table-primary' : ''}
                      >
                        <td>{new Date(message.received_at).toLocaleTimeString()}</td>
                        <td>{message.id.substring(0, 8)}...</td>
                        <td>
                          {message.is_test ? 'Test' : 
                            message.data.subdevicelist ? 'Alarm' : 'Status'}
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
                            <FontAwesomeIcon icon={faSearch} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>Keine Nachrichten gefunden.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header className="bg-primary text-white">
              Nachrichtendetails
            </Card.Header>
            <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {selectedMessage ? (
                <div>
                  <h5>Metadaten</h5>
                  <Table bordered size="sm" className="mb-4">
                    <tbody>
                      <tr>
                        <th>ID</th>
                        <td>{selectedMessage.id}</td>
                      </tr>
                      <tr>
                        <th>Empfangen</th>
                        <td>{new Date(selectedMessage.received_at).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <th>Timestamp</th>
                        <td>{selectedMessage.timestamp}</td>
                      </tr>
                      <tr>
                        <th>Typ</th>
                        <td>
                          {selectedMessage.is_test ? 'Testnachricht' : 
                            selectedMessage.data.subdevicelist ? 'Alarmnachricht' : 'Statusnachricht'}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                  
                  <h5>Nachrichteninhalt</h5>
                  <div className="border p-3 rounded bg-light">
                    <JsonView data={selectedMessage.data} />
                  </div>
                  
                  <h5 className="mt-4">Header</h5>
                  <div className="border p-3 rounded bg-light">
                    <JsonView data={selectedMessage.headers} />
                  </div>
                </div>
              ) : (
                <p>Wählen Sie eine Nachricht aus der Liste aus, um Details anzuzeigen.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Messages;
