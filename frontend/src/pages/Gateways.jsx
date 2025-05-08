import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSync, faUsers, faEye, faNetworkWired, faServer, faDesktop } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const Gateways = () => {
  const [gateways, setGateways] = useState([]);
  const [unassignedGateways, setUnassignedGateways] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentGateway, setCurrentGateway] = useState(null);
  const [showDevicesList, setShowDevicesList] = useState(false);
  const [currentDevices, setCurrentDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [formData, setFormData] = useState({
    uuid: '',
    customer_id: '',
    name: '',
    description: '',
    template_id: '',
    status: 'online'
  });

  // Lade Daten beim Seitenaufruf
  useEffect(() => {
    fetchData();
  }, []);

  // Hole alle Daten
  const fetchData = async () => {
    setLoading(true);
    try {
      const [gatewaysResponse, customersResponse, unassignedResponse] = await Promise.all([
        axios.get(`${API_URL}/gateways`),
        axios.get(`${API_URL}/customers`),
        axios.get(`${API_URL}/gateways/unassigned`)
      ]);
      
      setGateways(gatewaysResponse.data);
      setCustomers(customersResponse.data);
      setUnassignedGateways(unassignedResponse.data);
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

  // Handler für Auswahl eines unregistrierten Gateways
  const handleUnassignedGatewaySelect = (e) => {
    const selectedUuid = e.target.value;
    if (selectedUuid) {
      const selectedGateway = unassignedGateways.find(g => g.uuid === selectedUuid);
      if (selectedGateway) {
        setFormData({
          ...formData,
          uuid: selectedGateway.uuid,
          name: selectedGateway.name || formData.name,
          status: selectedGateway.status || formData.status
        });
      }
    }
  };

  // Gateway hinzufügen
  const handleAddGateway = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/gateways`, formData);
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Fehler beim Hinzufügen des Gateways:', err);
      setError('Gateway konnte nicht hinzugefügt werden.');
    }
  };

  // Gateway bearbeiten
  const handleEditGateway = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/gateways/${currentGateway.uuid}`, formData);
      setShowEditModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Fehler beim Bearbeiten des Gateways:', err);
      setError('Gateway konnte nicht bearbeitet werden.');
    }
  };

  // Gateway löschen
  const handleDeleteGateway = async () => {
    try {
      await axios.delete(`${API_URL}/gateways/${currentGateway.uuid}`);
      setShowDeleteConfirm(false);
      fetchData();
    } catch (err) {
      console.error('Fehler beim Löschen des Gateways:', err);
      setError('Gateway konnte nicht gelöscht werden.');
    }
  };

  // Lade die Geräte für ein Gateway
  const fetchDevices = async (gateway) => {
    setLoadingDevices(true);
    setCurrentGateway(gateway);
    try {
      const response = await axios.get(`${API_URL}/devices?gateway_uuid=${gateway.uuid}`);
      setCurrentDevices(response.data);
      setShowDevicesList(true);
    } catch (err) {
      console.error('Fehler beim Laden der Geräte:', err);
      setError('Geräte konnten nicht geladen werden.');
    } finally {
      setLoadingDevices(false);
    }
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setFormData({
      uuid: '',
      customer_id: '',
      name: '',
      description: '',
      template_id: '',
      status: 'online'
    });
  };

  // Modal zum Bearbeiten öffnen
  const openEditModal = (gateway) => {
    setCurrentGateway(gateway);
    setFormData({
      uuid: gateway.uuid || '',
      customer_id: gateway.customer_id || '',
      name: gateway.name || '',
      description: gateway.description || '',
      template_id: gateway.template_id || '',
      status: gateway.status || 'online'
    });
    setShowEditModal(true);
  };

  // Löschbestätigung öffnen
  const openDeleteConfirm = (gateway) => {
    setCurrentGateway(gateway);
    setShowDeleteConfirm(true);
  };

  // Status-Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'online':
        return <Badge bg="success">Online</Badge>;
      case 'offline':
        return <Badge bg="danger">Offline</Badge>;
      case 'maintenance':
        return <Badge bg="warning">Wartung</Badge>;
      default:
        return <Badge bg="secondary">Unbekannt</Badge>;
    }
  };

  // Kundenname aus ID
  const getCustomerName = (customerId) => {
    if (!customerId) return 'Nicht zugeordnet';
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unbekannt';
  };

  // Zeitstempel formatieren
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE');
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h1 className="h3">
            <FontAwesomeIcon icon={faNetworkWired} className="me-2" />
            Gateway-Verwaltung
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
        <Col xs={12} className="d-flex justify-content-end">
          <Button 
            variant="primary" 
            className="me-2" 
            onClick={() => setShowAddModal(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" /> Gateway hinzufügen
          </Button>
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
                <div className="text-center p-5">Lade Gateway-Daten...</div>
              ) : gateways.length === 0 ? (
                <div className="text-center p-5">Keine Gateways vorhanden. Fügen Sie ein neues Gateway hinzu.</div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>UUID</th>
                      <th>Name</th>
                      <th>Kunde</th>
                      <th>Status</th>
                      <th>Letzter Kontakt</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateways.map((gateway) => (
                      <tr key={gateway.uuid}>
                        <td>{gateway.uuid}</td>
                        <td>{gateway.name}</td>
                        <td>{getCustomerName(gateway.customer_id)}</td>
                        <td>{renderStatusBadge(gateway.status)}</td>
                        <td>{formatDateTime(gateway.last_contact)}</td>
                        <td>
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            className="me-1"
                            onClick={() => fetchDevices(gateway)}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-1"
                            onClick={() => openEditModal(gateway)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => openDeleteConfirm(gateway)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
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

      {/* Modal: Gateway hinzufügen */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Neues Gateway hinzufügen</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddGateway}>
          <Modal.Body>
            {unassignedGateways.length > 0 && (
              <Row className="mb-3">
                <Col>
                  <Alert variant="info">
                    Es wurden unregistrierte Gateways erkannt. Wählen Sie eines aus oder fügen Sie ein neues hinzu.
                  </Alert>
                  <Form.Group>
                    <Form.Label>Unregistrierte Gateways</Form.Label>
                    <Form.Select
                      onChange={handleUnassignedGatewaySelect}
                    >
                      <option value="">Bitte auswählen</option>
                      {unassignedGateways.map((gateway) => (
                        <option key={gateway.uuid} value={gateway.uuid}>
                          {gateway.uuid} (zuletzt aktiv: {formatDateTime(gateway.last_contact)})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            )}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>UUID *</Form.Label>
                  <Form.Control
                    type="text"
                    name="uuid"
                    value={formData.uuid}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Kunde *</Form.Label>
                  <Form.Select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Bitte auswählen</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Form.Select>
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
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Wartung</option>
                    <option value="unknown">Unbekannt</option>
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
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="submit">
              Speichern
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Gateway bearbeiten */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Gateway bearbeiten</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditGateway}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>UUID</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.uuid}
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Kunde *</Form.Label>
                  <Form.Select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Bitte auswählen</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Form.Select>
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
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Wartung</option>
                    <option value="unknown">Unbekannt</option>
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

      {/* Modal: Gateway löschen */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Gateway löschen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sind Sie sicher, dass Sie das Gateway <strong>{currentGateway?.name || currentGateway?.uuid}</strong> löschen möchten?
          <br />
          <strong className="text-danger">Hinweis: Alle zugehörigen Geräte werden ebenfalls gelöscht!</strong>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleDeleteGateway}>
            Löschen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal: Geräteliste anzeigen */}
      <Modal show={showDevicesList} onHide={() => setShowDevicesList(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faServer} className="me-2" />
            Geräte für Gateway: {currentGateway?.name || currentGateway?.uuid}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDevices ? (
            <div className="text-center p-4">Lade Gerätedaten...</div>
          ) : currentDevices.length === 0 ? (
            <div className="text-center p-4">Keine Geräte für dieses Gateway gefunden.</div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Geräte-ID</th>
                  <th>Name</th>
                  <th>Typ</th>
                  <th>Letztes Update</th>
                </tr>
              </thead>
              <tbody>
                {currentDevices.map((device) => (
                  <tr key={device.device_id}>
                    <td>{device.device_id}</td>
                    <td>{device.name}</td>
                    <td>{device.device_type}</td>
                    <td>{formatDateTime(device.last_update)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDevicesList(false)}>
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Gateways; 