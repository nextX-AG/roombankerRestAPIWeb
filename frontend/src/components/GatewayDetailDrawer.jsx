import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Badge, Alert, Tabs, Tab, Row, Col, Form, Modal } from 'react-bootstrap';
import Drawer from './Drawer';
import { formatDateTime } from '../utils/formatters';
import GatewayStatusIcons from './GatewayStatusIcons';
import { ArrowLeft, Settings, Server, History, BarChart, Save, X, Trash } from 'lucide-react';
import { gatewayApi, customerApi, templateApi, deviceApi } from '../api';

const GatewayDetailDrawer = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // Bearbeitungszustand
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    uuid: '',
    customer_id: '',
    name: '',
    description: '',
    template_id: '',
    status: 'online',
    forwarding_enabled: true,
    forwarding_mode: 'production'
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Löschen-Zustand
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchGatewayData(),
          fetchCustomers(),
          fetchTemplates()
        ]);
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [uuid]);

  // Gateway-Daten laden
  const fetchGatewayData = async () => {
    try {
      console.log('Lade Gateway-Details für UUID:', uuid);
      
      // Gateway-Daten laden über die zentrale API
      const gatewayResponse = await gatewayApi.detail(uuid);
      console.log('Gateway-Detail-Antwort:', gatewayResponse);
      
      if (gatewayResponse.status === 'success' && gatewayResponse.data) {
        const gatewayData = gatewayResponse.data;
        setGateway(gatewayData);
        
        // Initialisiere Formulardaten
        setFormData({
          uuid: gatewayData.uuid || '',
          customer_id: gatewayData.customer_id || '',
          name: gatewayData.name || '',
          description: gatewayData.description || '',
          template_id: gatewayData.template_id || '',
          status: gatewayData.status || 'online',
          forwarding_enabled: gatewayData.forwarding_enabled || true,
          forwarding_mode: gatewayData.forwarding_mode || 'production'
        });
        
        // Wenn Gateway einen Kunden hat, lade Kundendaten
        if (gatewayData.customer_id) {
          try {
            const customerResponse = await customerApi.detail(gatewayData.customer_id);
            if (customerResponse.status === 'success' && customerResponse.data) {
              setCustomer(customerResponse.data);
            }
          } catch (err) {
            console.error('Fehler beim Laden der Kundendaten:', err);
          }
        }
        
        // Neueste Telemetriedaten laden
        try {
          const telemetryResponse = await gatewayApi.latest(uuid);
          if (telemetryResponse.status === 'success') {
            setLatestData(telemetryResponse.data);
          }
        } catch (err) {
          console.warn('Keine aktuellen Telemetriedaten gefunden:', err);
        }
        
        // Geräte laden
        try {
          const devicesResponse = await deviceApi.listByGateway(uuid);
          if (devicesResponse.status === 'success') {
            setDevices(devicesResponse.data || []);
          }
        } catch (err) {
          console.warn('Keine Geräte gefunden:', err);
          setDevices([]);
        }
      } else {
        throw new Error(gatewayResponse.error?.message || 'Gateway-Daten konnten nicht geladen werden');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Gateway-Daten:', err);
      setError('Gateway-Daten konnten nicht geladen werden.');
    }
  };

  // Kunden laden
  const fetchCustomers = async () => {
    try {
      const response = await customerApi.list();
      if (response.status === 'success') {
        setCustomers(response.data || []);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err);
    }
  };

  // Templates laden
  const fetchTemplates = async () => {
    try {
      const response = await templateApi.list();
      if (response.status === 'success') {
        setTemplates(response.data || []);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Templates:', err);
    }
  };

  // Formularänderungen verarbeiten
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Gateway aktualisieren
  const handleUpdateGateway = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const response = await gatewayApi.update(uuid, formData);
      console.log("Gateway update response:", response);
      
      if (response.status === 'success') {
        setSaveSuccess(true);
        setEditMode(false);
        
        // Daten neu laden
        await fetchGatewayData();
        
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        throw new Error(response.error?.message || 'Fehler beim Aktualisieren des Gateways');
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Gateways:', err);
      setSaveError('Gateway konnte nicht aktualisiert werden: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Gateway löschen
  const handleDeleteGateway = async () => {
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await gatewayApi.delete(uuid);
      
      if (response.status === 'success') {
        // Zurück zur Gateway-Übersicht navigieren
        navigate('/gateways');
      } else {
        throw new Error(response.error?.message || 'Fehler beim Löschen des Gateways');
      }
    } catch (err) {
      console.error('Fehler beim Löschen des Gateways:', err);
      setDeleteError('Gateway konnte nicht gelöscht werden: ' + err.message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };
  
  // Status-Badge basierend auf Gateway-Status
  const renderStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unbekannt</Badge>;
    
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
  
  // Formatiere Zeitstempel
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return formatDateTime(timestamp);
    } catch (e) {
      return '-';
    }
  };
  
  // Detaillierte technische Daten anzeigen
  const renderTechnicalData = () => {
    if (!latestData || !latestData.data || !latestData.data.gateway) 
      return <p>Keine technischen Daten verfügbar</p>;
    
    const { gateway } = latestData.data;
    return (
      <Table responsive striped size="sm">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Wert</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {gateway.alarmstatus && (
            <tr>
              <td>Alarm-Status</td>
              <td>{gateway.alarmstatus}</td>
              <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('alarmstatus')}</td>
            </tr>
          )}
          {gateway.batterystatus && (
            <tr>
              <td>Batterie-Status</td>
              <td>{gateway.batterystatus}</td>
              <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('batterystatus')}</td>
            </tr>
          )}
          {gateway.powerstatus && (
            <tr>
              <td>Stromversorgung</td>
              <td>{gateway.powerstatus}</td>
              <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('powerstatus')}</td>
            </tr>
          )}
          {gateway.dbm && (
            <tr>
              <td>Signalstärke</td>
              <td>{gateway.dbm} dBm</td>
              <td></td>
            </tr>
          )}
        </tbody>
      </Table>
    );
  };
  
  // Geräte-Liste anzeigen
  const renderDevices = () => {
    if (devices.length === 0) {
      return <p>Keine Geräte mit diesem Gateway verbunden</p>;
    }
    
    return (
      <Table responsive hover size="sm">
        <thead>
          <tr>
            <th>Geräte-ID</th>
            <th>Typ</th>
            <th>Letztes Update</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.device_id}>
              <td>{device.device_id}</td>
              <td>{device.device_type}</td>
              <td>{formatTime(device.last_update)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  // Render Bearbeitungsformular
  const renderEditForm = () => {
    return (
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>UUID</Form.Label>
          <Form.Control 
            type="text" 
            name="uuid"
            value={formData.uuid} 
            disabled
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Kunde <span className="text-danger">*</span></Form.Label>
          <Form.Select 
            name="customer_id" 
            value={formData.customer_id || ''} 
            onChange={handleChange}
          >
            <option value="">Bitte auswählen</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Form.Select>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control 
            type="text" 
            name="name"
            value={formData.name} 
            onChange={handleChange}
          />
        </Form.Group>
        
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
          </Form.Select>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Template zur Transformation</Form.Label>
          <Form.Select 
            name="template_id" 
            value={formData.template_id || ''} 
            onChange={handleChange}
          >
            <option value="">Bitte auswählen</option>
            {templates.map(t => (
              <option key={typeof t === 'object' ? t.id : t} value={typeof t === 'object' ? t.id : t}>
                {typeof t === 'object' ? t.name : t}
              </option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            Wählen Sie ein Template für die Nachrichten-Transformation. Dies ist notwendig für die Weiterleitung an evAlarm.
          </Form.Text>
        </Form.Group>
        
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Nachrichtenweiterleitung</Form.Label>
              <Form.Check 
                type="switch"
                id="forwarding-enabled-edit"
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
        
        <Form.Group className="mb-3">
          <Form.Label>Beschreibung</Form.Label>
          <Form.Control 
            as="textarea" 
            name="description"
            value={formData.description || ''} 
            onChange={handleChange}
            rows={3}
          />
        </Form.Group>
        
        <div className="d-flex justify-content-end mt-4">
          <Button 
            variant="outline-secondary" 
            className="me-2" 
            onClick={() => setEditMode(false)}
            disabled={saving}
          >
            <X size={16} className="me-1" />
            Abbrechen
          </Button>
          <Button 
            variant="success" 
            onClick={handleUpdateGateway}
            disabled={saving}
          >
            <Save size={16} className="me-1" />
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </Form>
    );
  };
  
  const renderMainContent = () => {
    if (loading) {
      return <div className="text-center p-5">Lade Gateway-Daten...</div>;
    }
    
    if (error) {
      return (
        <>
          <Alert variant="danger" className="mb-4">{error}</Alert>
          <Button variant="secondary" onClick={() => navigate('/gateways')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    if (!gateway) {
      return (
        <>
          <Alert variant="warning" className="mb-4">Gateway nicht gefunden</Alert>
          <Button variant="secondary" onClick={() => navigate('/gateways')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }

    if (editMode) {
      return renderEditForm();
    }
    
    return (
      <>
        {/* Gateway-Info-Karte */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={8}>
                <div className="small text-muted mb-1">UUID</div>
                <div className="mb-3 small font-monospace">{gateway.uuid}</div>
                
                {customer && (
                  <>
                    <div className="small text-muted mb-1">Kunde</div>
                    <div className="mb-3">{customer.name}</div>
                  </>
                )}
              </Col>
              <Col md={4} className="text-end">
                <div className="mb-2">
                  <div className="small text-muted mb-1">Status</div>
                  {renderStatusBadge(gateway.status)}
                </div>
                <div className="mb-2">
                  <div className="small text-muted mb-1">Letzter Kontakt</div>
                  <div>{formatTime(gateway.last_contact)}</div>
                </div>
              </Col>
            </Row>
            <hr />
            {latestData && latestData.data && (
              <div className="gateway-status-display">
                {GatewayStatusIcons({ gatewayData: latestData.data }).all}
              </div>
            )}
          </Card.Body>
        </Card>
        
        {/* Tab-Inhalt */}
        <Tabs defaultActiveKey="info" id="gateway-detail-tabs" className="mb-3">
          <Tab eventKey="info" title={<span><Settings size={16} className="me-1" />Info</span>}>
            <div className="mb-3">
              <div className="small text-muted mb-1">Name</div>
              <div>{gateway.name || '-'}</div>
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Beschreibung</div>
              <div>{gateway.description || '-'}</div>
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Nachrichtenweiterleitung</div>
              <div className="d-flex align-items-center">
                {gateway.forwarding_enabled === false ? (
                  <Badge bg="danger">Blockiert</Badge>
                ) : (
                  <>
                    <Badge bg="success" className="me-2">Aktiviert</Badge>
                    {gateway.forwarding_mode === 'test' && (
                      <Badge bg="warning">Test-Modus</Badge>
                    )}
                    {gateway.forwarding_mode === 'learning' && (
                      <Badge bg="info">Lernmodus</Badge>
                    )}
                    {gateway.forwarding_mode === 'production' && (
                      <Badge bg="primary">Produktion</Badge>
                    )}
                  </>
                )}
              </div>
              {gateway.forwarding_mode === 'test' || gateway.forwarding_mode === 'learning' ? (
                <small className="text-muted d-block mt-1">
                  Im {gateway.forwarding_mode === 'test' ? 'Test' : 'Lern'}-Modus werden Nachrichten nicht an evAlarm weitergeleitet.
                </small>
              ) : null}
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Erstellt am</div>
              <div>{formatTime(gateway.created_at)}</div>
            </div>
            
            {customer && (
              <>
                <hr />
                <h6 className="mb-3">Kundendaten</h6>
                
                <div className="mb-3">
                  <div className="small text-muted mb-1">Ansprechpartner</div>
                  <div>{customer.contact_person || '-'}</div>
                </div>
                
                <div className="mb-3">
                  <div className="small text-muted mb-1">E-Mail</div>
                  <div>{customer.email || '-'}</div>
                </div>
                
                <div className="mb-3">
                  <div className="small text-muted mb-1">evAlarm-Namespace</div>
                  <div>{customer.evalarm_namespace || '-'}</div>
                </div>
              </>
            )}
          </Tab>
          
          <Tab eventKey="technical" title={<span><BarChart size={16} className="me-1" />Technisch</span>}>
            {latestData ? (
              <>
                <p className="text-muted small mb-3">
                  Letztes Update: {formatTime(latestData.received_at || latestData.timestamp)}
                </p>
                {renderTechnicalData()}
              </>
            ) : (
              <Alert variant="info">
                Keine technischen Daten verfügbar
              </Alert>
            )}
          </Tab>
          
          <Tab eventKey="devices" title={<span><Server size={16} className="me-1" />Geräte ({devices.length})</span>}>
            {renderDevices()}
          </Tab>
        </Tabs>
        
        {/* Aktionsbuttons */}
        <div className="drawer-footer mt-5 d-flex justify-content-between">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/gateways')}>
            <ArrowLeft size={16} className="me-1" />
            Zurück
          </Button>
          
          <div>
            <Button variant="outline-danger" size="sm" className="me-2" onClick={() => setShowDeleteConfirm(true)}>
              <Trash size={16} className="me-1" />
              Löschen
            </Button>
            
            <Button variant="primary" size="sm" onClick={() => setEditMode(true)}>
              <Settings size={16} className="me-1" />
              Bearbeiten
            </Button>
          </div>
        </div>
      </>
    );
  };
  
  const drawerContent = () => {
    if (saveSuccess) {
      return (
        <>
          <Alert variant="success" className="mb-4">
            Gateway wurde erfolgreich aktualisiert.
          </Alert>
          {renderMainContent()}
        </>
      );
    }

    if (saveError) {
      return (
        <>
          <Alert variant="danger" className="mb-4" dismissible onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
          {renderMainContent()}
        </>
      );
    }
    
    return renderMainContent();
  };
  
  return (
    <>
      <Drawer 
        show={true} 
        onClose={() => navigate('/gateways')}
        title={editMode ? "Gateway bearbeiten" : (gateway ? (gateway.name || 'Gateway Details') : 'Gateway Details')}
      >
        {drawerContent()}
      </Drawer>
      
      {/* Lösch-Bestätigungsmodal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Gateway löschen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError ? (
            <Alert variant="danger">{deleteError}</Alert>
          ) : (
            <>
              <p>Sind Sie sicher, dass Sie das Gateway <strong>{gateway?.name || gateway?.uuid}</strong> löschen möchten?</p>
              <Alert variant="warning">
                <strong>Achtung:</strong> Alle zugehörigen Geräte werden ebenfalls gelöscht und diese Aktion kann nicht rückgängig gemacht werden!
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
            Abbrechen
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteGateway}
            disabled={deleting}
          >
            {deleting ? 'Wird gelöscht...' : 'Gateway löschen'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GatewayDetailDrawer; 