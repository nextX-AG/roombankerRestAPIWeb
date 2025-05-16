import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { Outlet, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, RefreshCw, Users, Eye, Router, Server, Info } from 'lucide-react';
import GatewayStatusIcons from '../components/GatewayStatusIcons';
import config, { API_VERSION } from '../config';
import { gatewayApi, customerApi, templateApi } from '../api';

// Verwende die konfigurierte Gateway-URL mit API-Version
const API_URL = `${config.apiBaseUrl}/${API_VERSION}`;

/**
 * Gateways-Verwaltungskomponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Gateways = () => {
  const [gateways, setGateways] = useState([]);
  const [unassignedGateways, setUnassignedGateways] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentGateway, setCurrentGateway] = useState(null);
  const [showDevicesList, setShowDevicesList] = useState(false);
  const [currentDevices, setCurrentDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [gatewayLatestData, setGatewayLatestData] = useState({});
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    uuid: '',
    customer_id: '',
    name: '',
    description: '',
    template_id: '',
    status: 'online'
  });

  // Lade initialisierungsdaten: Gateways, Kunden, Templates
  useEffect(() => {
    fetchData();
    fetchTemplates();
  }, []);

  // Hole alle Daten
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching data from API endpoints...');
      
      try {
        // Gateways abrufen
        const gatewaysResponse = await gatewayApi.list();
        console.log('Gateways response:', gatewaysResponse);
        
        if (gatewaysResponse.status === 'success') {
          const gatewaysList = gatewaysResponse.data || [];
          setGateways(Array.isArray(gatewaysList) ? gatewaysList : []);
          
          // Lade die neuesten Telemetriedaten für alle Gateways
          const latestDataMap = {};
          await Promise.all(
            gatewaysList.map(async (gateway) => {
              try {
                const response = await gatewayApi.latest(gateway.uuid);
                if (response.status === 'success') {
                  latestDataMap[gateway.uuid] = response.data || {};
                }
              } catch (err) {
                console.warn(`Keine aktuellen Telemetriedaten für Gateway ${gateway.uuid}`, err);
              }
            })
          );
          setGatewayLatestData(latestDataMap);
        } else {
          throw new Error(gatewaysResponse.error?.message || 'Fehler beim Laden der Gateways');
        }
      } catch (err) {
        console.error('Error fetching gateways:', err);
        setError(`Fehler beim Laden der Gateways: ${err.message}`);
        setGateways([]);
      }
      
      try {
        // Kunden abrufen
        const customersResponse = await customerApi.list();
        console.log('Customers response:', customersResponse);
        
        if (customersResponse.status === 'success') {
          const customersList = customersResponse.data || [];
          setCustomers(Array.isArray(customersList) ? customersList : []);
        } else {
          throw new Error(customersResponse.error?.message || 'Fehler beim Laden der Kunden');
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError(`Fehler beim Laden der Kunden: ${err.message}`);
        setCustomers([]);
      }
      
      try {
        // Nicht zugeordnete Gateways abrufen
        console.log('Fetching unassigned gateways');
        const unassignedResponse = await gatewayApi.unassigned();
        console.log('Unassigned gateways response:', unassignedResponse);
        
        if (unassignedResponse.status === 'success') {
          const unassignedList = unassignedResponse.data || [];
          setUnassignedGateways(Array.isArray(unassignedList) ? unassignedList : []);
        } else {
          throw new Error(unassignedResponse.error?.message || 'Fehler beim Laden der unregistrierten Gateways');
        }
      } catch (err) {
        console.error('Error fetching unassigned gateways:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        setError(`Fehler beim Laden der unregistrierten Gateways: ${err.message}`);
        setUnassignedGateways([]);
      }
    } catch (err) {
      console.error('General error in fetchData:', err);
      setError(`Allgemeiner Fehler beim Laden der Daten: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Lade alle verfügbaren Templates
  const fetchTemplates = async () => {
    try {
      const response = await templateApi.list();
      console.log('Templates response:', response);
      
      if (response.status === 'success') {
        const templates = response.data || [];
        setAvailableTemplates(Array.isArray(templates) ? templates : []);
      } else {
        throw new Error(response.error?.message || 'Fehler beim Laden der Templates');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Templates:', err);
      setError('Templates konnten nicht geladen werden.');
      setAvailableTemplates([]);
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
      const response = await gatewayApi.create(formData);
      if (response.status === 'success') {
        setShowAddModal(false);
        resetForm();
        fetchData();
      } else {
        throw new Error(response.error?.message || 'Fehler beim Hinzufügen des Gateways');
      }
    } catch (err) {
      console.error('Fehler beim Hinzufügen des Gateways:', err);
      setError('Gateway konnte nicht hinzugefügt werden.');
    }
  };

  // Gateway bearbeiten
  const handleEditGateway = async (e) => {
    e.preventDefault();
    try {
      const response = await gatewayApi.update(currentGateway.uuid, formData);
      if (response.status === 'success') {
        setShowEditModal(false);
        resetForm();
        fetchData();
      } else {
        throw new Error(response.error?.message || 'Fehler beim Bearbeiten des Gateways');
      }
    } catch (err) {
      console.error('Fehler beim Bearbeiten des Gateways:', err);
      setError('Gateway konnte nicht bearbeitet werden.');
    }
  };

  // Gateway löschen
  const handleDeleteGateway = async () => {
    try {
      const response = await gatewayApi.delete(currentGateway.uuid);
      if (response.status === 'success') {
        setShowDeleteConfirm(false);
        fetchData();
      } else {
        throw new Error(response.error?.message || 'Fehler beim Löschen des Gateways');
      }
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
      // Annahme: Es gibt einen devices-Endpunkt in der API
      const response = await fetch(`${API_URL}/devices?gateway_uuid=${gateway.uuid}`);
      const data = await response.json();
      
      if (data && data.status === 'success') {
        const devicesList = data.data || [];
        setCurrentDevices(Array.isArray(devicesList) ? devicesList : []);
      } else {
        throw new Error(data.error?.message || 'Fehler beim Laden der Geräte');
      }
      setShowDevicesList(true);
    } catch (err) {
      console.error('Fehler beim Laden der Geräte:', err);
      setError('Geräte konnten nicht geladen werden.');
      setCurrentDevices([]);
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

  // Gateway-Detailseite öffnen
  const navigateToDetail = (gateway) => {
    navigate(`/gateways/${gateway.uuid}`);
  };

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <Router size={24} className="me-2" />
        Gateway-Verwaltung
      </h1>

      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* 3. Inhalt in Karten */}
      <Row className="mb-4">
        <Col xs={12} className="d-flex justify-content-end">
          <Button 
            variant="primary" 
            className="me-2" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} className="me-1" /> Gateway hinzufügen
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchData}
          >
            <RefreshCw size={16} className="me-1" /> Aktualisieren
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>Gateways</Card.Header>
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
                      <th>Status-Icons</th>
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
                        <td>
                          {gatewayLatestData[gateway.uuid] && 
                           gatewayLatestData[gateway.uuid].data && 
                           GatewayStatusIcons({ gatewayData: gatewayLatestData[gateway.uuid].data }) &&
                           GatewayStatusIcons({ gatewayData: gatewayLatestData[gateway.uuid].data }).primary}
                        </td>
                        <td>{formatDateTime(gateway.last_contact)}</td>
                        <td>
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            className="me-1"
                            onClick={() => navigateToDetail(gateway)}
                            title="Details anzeigen"
                          >
                            <Info size={16} />
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            className="me-1"
                            onClick={() => fetchDevices(gateway)}
                            title="Geräte anzeigen"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-1"
                            onClick={() => openEditModal(gateway)}
                            title="Bearbeiten"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => openDeleteConfirm(gateway)}
                            title="Löschen"
                          >
                            <Trash size={16} />
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
                  <Form.Label>Template zur Transformation</Form.Label>
                  <Form.Select
                    name="template_id"
                    value={formData.template_id}
                    onChange={handleChange}
                  >
                    <option value="">Bitte auswählen</option>
                    {availableTemplates.map((template) => (
                      <option key={template.id || template} value={template.id || template}>
                        {template.name || template}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Wählen Sie ein Template für die Nachrichten-Transformation. Dies ist notwendig für die Weiterleitung an evAlarm.
                  </Form.Text>
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
                  <Form.Label>Template zur Transformation</Form.Label>
                  <Form.Select
                    name="template_id"
                    value={formData.template_id}
                    onChange={handleChange}
                  >
                    <option value="">Bitte auswählen</option>
                    {availableTemplates.map((template) => (
                      <option key={template.id || template} value={template.id || template}>
                        {template.name || template}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Wählen Sie ein Template für die Nachrichten-Transformation. Dies ist notwendig für die Weiterleitung an evAlarm.
                  </Form.Text>
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
            <Server size={18} className="me-2" />
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
      
      {/* Outlet für verschachtelte Routen (GatewayDetailDrawer) */}
      <Outlet />
    </>
  );
};

export default Gateways; 