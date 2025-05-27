import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { Outlet, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, RefreshCw, Eye, Router, Server } from 'lucide-react';
import GatewayStatusIcons from '../components/GatewayStatusIcons';
import config, { API_VERSION } from '../config';
import { gatewayApi, customerApi, templateApi } from '../api';
import BasicTable from '../components/BasicTable';

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
    template_group_id: '',
    status: 'online',
    forwarding_enabled: true,
    forwarding_mode: 'production'
  });
  const [templateGroups, setTemplateGroups] = useState([]);

  // Lade initialisierungsdaten: Gateways, Kunden, Templates
  useEffect(() => {
    fetchData();
    fetchTemplates();
    fetchTemplateGroups();
    
    // Polling für Live-Updates alle 10 Sekunden
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    
    return () => clearInterval(interval);
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

  // Lade alle verfügbaren Template-Gruppen
  const fetchTemplateGroups = async () => {
    try {
      const response = await templateApi.listGroups();
      console.log('Template groups response:', response);
      
      if (response.status === 'success') {
        const groups = response.data || [];
        setTemplateGroups(Array.isArray(groups) ? groups : []);
      } else {
        throw new Error(response.error?.message || 'Fehler beim Laden der Template-Gruppen');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Template-Gruppen:', err);
      setError('Template-Gruppen konnten nicht geladen werden.');
      setTemplateGroups([]);
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
      template_group_id: '',
      status: 'online',
      forwarding_enabled: true,
      forwarding_mode: 'production'
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
      template_group_id: gateway.template_group_id || '',
      status: gateway.status || 'online',
      forwarding_enabled: gateway.forwarding_enabled || true,
      forwarding_mode: gateway.forwarding_mode || 'production'
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

  // Erweitere die Suche für globalen Filter
  const enhanceSearchData = (gateways) => {
    return gateways.map(gateway => {
      const customerName = getCustomerName(gateway.customer_id);
      
      return {
        ...gateway,
        // Zusätzliche Suchfelder für den globalen Filter
        customerName,
        formattedStatus: gateway.status
      };
    });
  };

  // TanStack Table Spalten-Definition
  const columns = useMemo(
    () => [
      {
        accessorKey: 'uuid',
        header: 'UUID',
        size: 150,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 120,
      },
      {
        accessorKey: 'customerName',
        header: 'Kunde',
        size: 150,
        cell: ({ row }) => getCustomerName(row.original.customer_id),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        cell: ({ row }) => renderStatusBadge(row.original.status),
      },
      {
        accessorKey: 'forwarding_mode',
        header: 'Modus',
        size: 100,
        cell: ({ row }) => {
          const mode = row.original.forwarding_mode || 'production';
          const enabled = row.original.forwarding_enabled !== false;
          
          if (!enabled) {
            return <Badge bg="danger">Blockiert</Badge>;
          }
          
          switch (mode) {
            case 'production':
              return <Badge bg="success">Produktion</Badge>;
            case 'test':
              return <Badge bg="warning">Test</Badge>;
            case 'learning':
              return <Badge bg="info">Lernmodus</Badge>;
            default:
              return <Badge bg="secondary">{mode}</Badge>;
          }
        }
      },
      {
        id: 'status_icons',
        header: 'Status-Icons',
        size: 120,
        cell: ({ row }) => {
          const gateway = row.original;
          return (
            gatewayLatestData[gateway.uuid] && 
            gatewayLatestData[gateway.uuid].data && 
            GatewayStatusIcons({ gatewayData: gatewayLatestData[gateway.uuid].data }) &&
            GatewayStatusIcons({ gatewayData: gatewayLatestData[gateway.uuid].data }).primary
          );
        }
      },
      {
        accessorKey: 'last_contact',
        header: 'Letzter Kontakt',
        size: 150,
        cell: ({ row }) => formatDateTime(row.original.last_contact),
      }
    ],
    [gatewayLatestData, customers]
  );

  // Erweiterte Suchdaten für den Filter
  const enhancedData = useMemo(() => enhanceSearchData(gateways), [gateways, customers]);

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
              <BasicTable 
                data={enhancedData}
                columns={columns}
                isLoading={loading}
                emptyMessage="Keine Gateways vorhanden. Fügen Sie ein neues Gateway hinzu."
                onRowClick={navigateToDetail}
                filterPlaceholder="Suche nach UUID, Name, Kunde, Status..."
              />
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nachrichtenweiterleitung</Form.Label>
                  <Form.Check 
                    type="switch"
                    id="forwarding-enabled-add"
                    name="forwarding_enabled"
                    label={formData.forwarding_enabled ? "Aktiviert" : "Deaktiviert"}
                    checked={formData.forwarding_enabled !== false}
                    onChange={(e) => {
                      handleChange({
                        target: {
                          name: 'forwarding_enabled',
                          value: e.target.checked
                        }
                      });
                    }}
                  />
                  <Form.Text className="text-muted">
                    Wenn deaktiviert, werden Nachrichten nicht an evAlarm weitergeleitet.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Weiterleitungsmodus</Form.Label>
                  <Form.Select
                    name="forwarding_mode"
                    value={formData.forwarding_mode || 'production'}
                    onChange={handleChange}
                  >
                    <option value="production">Produktion</option>
                    <option value="test">Test</option>
                    <option value="learning">Lernmodus</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Im Test- oder Lernmodus werden keine Nachrichten weitergeleitet.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Template-Gruppe für Transformation</Form.Label>
                  <Form.Select
                    name="template_group_id"
                    value={formData.template_group_id}
                    onChange={handleChange}
                  >
                    <option value="">Bitte auswählen</option>
                    {templateGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.templates?.length || 0} Templates)
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Wählen Sie eine Template-Gruppe für die intelligente Nachrichten-Transformation. 
                    Das System wählt automatisch das passende Template basierend auf dem Nachrichtentyp.
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nachrichtenweiterleitung</Form.Label>
                  <Form.Check 
                    type="switch"
                    id="forwarding-enabled-add"
                    name="forwarding_enabled"
                    label={formData.forwarding_enabled ? "Aktiviert" : "Deaktiviert"}
                    checked={formData.forwarding_enabled !== false}
                    onChange={(e) => {
                      handleChange({
                        target: {
                          name: 'forwarding_enabled',
                          value: e.target.checked
                        }
                      });
                    }}
                  />
                  <Form.Text className="text-muted">
                    Wenn deaktiviert, werden Nachrichten nicht an evAlarm weitergeleitet.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Weiterleitungsmodus</Form.Label>
                  <Form.Select
                    name="forwarding_mode"
                    value={formData.forwarding_mode || 'production'}
                    onChange={handleChange}
                  >
                    <option value="production">Produktion</option>
                    <option value="test">Test</option>
                    <option value="learning">Lernmodus</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Im Test- oder Lernmodus werden keine Nachrichten weitergeleitet.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Template-Gruppe für Transformation</Form.Label>
                  <Form.Select
                    name="template_group_id"
                    value={formData.template_group_id}
                    onChange={handleChange}
                  >
                    <option value="">Bitte auswählen</option>
                    {templateGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.templates?.length || 0} Templates)
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Wählen Sie eine Template-Gruppe für die intelligente Nachrichten-Transformation. 
                    Das System wählt automatisch das passende Template basierend auf dem Nachrichtentyp.
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