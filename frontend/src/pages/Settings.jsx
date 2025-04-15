import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

const Settings = () => {
  const [endpoints, setEndpoints] = useState([
    { name: 'evalarm', url: 'https://tas.dev.evalarm.de/api/v1/espa', username: 'eva.herford', password: 'GW8OoLZE' }
  ]);
  const [newEndpoint, setNewEndpoint] = useState({ name: '', url: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEndpointChange = (index, field, value) => {
    const updatedEndpoints = [...endpoints];
    updatedEndpoints[index][field] = value;
    setEndpoints(updatedEndpoints);
  };

  const handleNewEndpointChange = (field, value) => {
    setNewEndpoint({ ...newEndpoint, [field]: value });
  };

  const handleAddEndpoint = () => {
    // Validierung
    if (!newEndpoint.name || !newEndpoint.url) {
      setError('Name und URL sind erforderlich');
      return;
    }

    // Prüfen, ob Name bereits existiert
    if (endpoints.some(ep => ep.name === newEndpoint.name)) {
      setError(`Ein Endpunkt mit dem Namen "${newEndpoint.name}" existiert bereits`);
      return;
    }

    setEndpoints([...endpoints, newEndpoint]);
    setNewEndpoint({ name: '', url: '', username: '', password: '' });
    setSuccess('Endpunkt hinzugefügt');
    setError('');
  };

  const handleRemoveEndpoint = (index) => {
    const updatedEndpoints = [...endpoints];
    updatedEndpoints.splice(index, 1);
    setEndpoints(updatedEndpoints);
    setSuccess('Endpunkt entfernt');
  };

  const handleSaveSettings = () => {
    // In einer echten Anwendung würden die Einstellungen zum Server gesendet werden
    setSuccess('Einstellungen gespeichert');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <Container>
      <h1 className="mb-4">Einstellungen</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          API-Endpunkte
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Benutzername</th>
                <th>Passwort</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint, index) => (
                <tr key={index}>
                  <td>
                    <Form.Control
                      type="text"
                      value={endpoint.name}
                      onChange={(e) => handleEndpointChange(index, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      value={endpoint.url}
                      onChange={(e) => handleEndpointChange(index, 'url', e.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      value={endpoint.username}
                      onChange={(e) => handleEndpointChange(index, 'username', e.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="password"
                      value={endpoint.password}
                      onChange={(e) => handleEndpointChange(index, 'password', e.target.value)}
                    />
                  </td>
                  <td>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleRemoveEndpoint(index)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    value={newEndpoint.name}
                    onChange={(e) => handleNewEndpointChange('name', e.target.value)}
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="URL"
                    value={newEndpoint.url}
                    onChange={(e) => handleNewEndpointChange('url', e.target.value)}
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="Benutzername (optional)"
                    value={newEndpoint.username}
                    onChange={(e) => handleNewEndpointChange('username', e.target.value)}
                  />
                </td>
                <td>
                  <Form.Control
                    type="password"
                    placeholder="Passwort (optional)"
                    value={newEndpoint.password}
                    onChange={(e) => handleNewEndpointChange('password', e.target.value)}
                  />
                </td>
                <td>
                  <Button 
                    variant="success" 
                    size="sm"
                    onClick={handleAddEndpoint}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header className="bg-primary text-white">
          Allgemeine Einstellungen
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>API-Server URL</Form.Label>
                <Form.Control
                  type="text"
                  defaultValue="http://localhost:8080"
                />
                <Form.Text className="text-muted">
                  URL des API-Servers, der MQTT-Nachrichten empfängt
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Message Processor URL</Form.Label>
                <Form.Control
                  type="text"
                  defaultValue="http://localhost:8081"
                />
                <Form.Text className="text-muted">
                  URL des Message Processors, der Nachrichten transformiert
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Aktualisierungsintervall (Sekunden)</Form.Label>
                <Form.Control
                  type="number"
                  defaultValue="10"
                  min="1"
                  max="60"
                />
                <Form.Text className="text-muted">
                  Intervall für die automatische Aktualisierung der Daten
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Maximale Anzahl gespeicherter Nachrichten</Form.Label>
                <Form.Control
                  type="number"
                  defaultValue="50"
                  min="10"
                  max="1000"
                />
                <Form.Text className="text-muted">
                  Maximale Anzahl der im Speicher gehaltenen Nachrichten
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
            <Button variant="primary" onClick={handleSaveSettings}>
              <FontAwesomeIcon icon={faSave} className="me-2" />
              Einstellungen speichern
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Settings;
