import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Badge, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faSearch, faInfoCircle, faEdit, faNetworkWired, faServer, faDesktop, faMicrochip } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    device_type: ''
  });

  // Lade Daten beim Seitenaufruf
  useEffect(() => {
    fetchData();
  }, []);

  // Hole alle Daten
  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesResponse, gatewaysResponse] = await Promise.all([
        axios.get(`${API_URL}/devices`),
        axios.get(`${API_URL}/gateways`)
      ]);
      
      setDevices(devicesResponse.data);
      setGateways(gatewaysResponse.data);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
      setError('Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Handler für Formularänderungen
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Gerät bearbeiten
  const handleEditDevice = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/devices/${currentDevice.gateway_uuid}/${currentDevice.device_id}`, formData);
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error('Fehler beim Bearbeiten des Geräts:', err);
      setError('Gerät konnte nicht bearbeitet werden.');
    }
  };

  // Modal zum Bearbeiten öffnen
  const openEditModal = (device) => {
    setCurrentDevice(device);
    setFormData({
      name: device.name || '',
      description: device.description || '',
      device_type: device.device_type || ''
    });
    setShowEditModal(true);
  };

  // Modal für Gerätedetails öffnen
  const openDetailsModal = (device) => {
    setCurrentDevice(device);
    setShowDetailsModal(true);
  };

  // Gerätetyp formatieren
  const formatDeviceType = (type) => {
    switch (type) {
      case 'temperature_sensor': return 'Temperatursensor';
      case 'panic_button': return 'Panikknopf';
      case 'security_sensor': return 'Sicherheitssensor';
      default: return type || 'Unbekannt';
    }
  };

  // Gateway-Name aus UUID
  const getGatewayName = (gatewayUuid) => {
    const gateway = gateways.find(g => g.uuid === gatewayUuid);
    return gateway ? gateway.name : gatewayUuid;
  };

  // Zeitstempel formatieren
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE');
  };

  // Geräte filtern basierend auf der Suche
  const filteredDevices = devices.filter(device => {
    if (searchTerm === '') return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      device.name?.toLowerCase().includes(searchTermLower) ||
      device.device_id?.toLowerCase().includes(searchTermLower) ||
      device.device_type?.toLowerCase().includes(searchTermLower) ||
      device.gateway_uuid?.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h1 className="h3">
            <FontAwesomeIcon icon={faDesktop} className="me-2" />
            Geräteverwaltung
          </h1>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faSearch} />
            </InputGroup.Text>
            <Form.Control
              placeholder="Suche nach Name, Geräte-ID, Typ oder Gateway..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={6} className="d-flex justify-content-end">
          <Button 
            variant="secondary" 
            onClick={fetchData}
          >
            <FontAwesomeIcon icon={faSync} className="me-1" /> Aktualisieren
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center p-5">Lade Gerätedaten...</div>
              ) : devices.length === 0 ? (
                <div className="text-center p-5">Keine Geräte vorhanden.</div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Geräte-ID</th>
                      <th>Name</th>
                      <th>Typ</th>
                      <th>Gateway</th>
                      <th>Letztes Update</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => (
                      <tr key={`${device.gateway_uuid}-${device.device_id}`}>
                        <td>{device.device_id}</td>
                        <td>{device.name}</td>
                        <td>{formatDeviceType(device.device_type)}</td>
                        <td>{getGatewayName(device.gateway_uuid)}</td>
                        <td>{formatDateTime(device.last_update)}</td>
                        <td>
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            className="me-1"
                            onClick={() => openDetailsModal(device)}
                          >
                            <FontAwesomeIcon icon={faInfoCircle} />
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => openEditModal(device)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal: Gerät bearbeiten */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Gerät bearbeiten</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditDevice}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Geräte-ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={currentDevice?.device_id}
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Gateway</Form.Label>
                  <Form.Control
                    type="text"
                    value={getGatewayName(currentDevice?.gateway_uuid)}
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Typ</Form.Label>
                  <Form.Select
                    name="device_type"
                    value={formData.device_type}
                    onChange={handleChange}
                  >
                    <option value="unknown">Unbekannt</option>
                    <option value="temperature_sensor">Temperatursensor</option>
                    <option value="panic_button">Panikknopf</option>
                    <option value="security_sensor">Sicherheitssensor</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Beschreibung</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="submit">
              Speichern
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Gerätedetails */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faMicrochip} className="me-2" />
            Gerätedetails: {currentDevice?.name || currentDevice?.device_id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Col md={6}>
              <h6>Geräte-ID</h6>
              <p>{currentDevice?.device_id}</p>
            </Col>
            <Col md={6}>
              <h6>Gateway</h6>
              <p>{getGatewayName(currentDevice?.gateway_uuid)}</p>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col md={6}>
              <h6>Typ</h6>
              <p>{formatDeviceType(currentDevice?.device_type)}</p>
            </Col>
            <Col md={6}>
              <h6>Letztes Update</h6>
              <p>{formatDateTime(currentDevice?.last_update)}</p>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <h6>Beschreibung</h6>
              <p>{currentDevice?.description || 'Keine Beschreibung verfügbar'}</p>
            </Col>
          </Row>
          <Row>
            <Col>
              <h6>Status-Daten</h6>
              {currentDevice?.status ? (
                <div className="border rounded p-3 bg-light">
                  <JSONPretty id="json-pretty" data={currentDevice.status} />
                </div>
              ) : (
                <p>Keine Status-Daten vorhanden</p>
              )}
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Devices; 