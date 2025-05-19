import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Badge, Alert, Tabs, Tab, Row, Col, Modal } from 'react-bootstrap';
import Drawer from './Drawer';
import { formatDateTime } from '../utils/formatters';
import { ArrowLeft, Building, Settings, Router, Save, X, Trash } from 'lucide-react';
import { customerApi, gatewayApi } from '../api';

const CustomerDetailDrawer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Zustände
  const [customer, setCustomer] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  // Löschen-Zustand
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  
  // Kundendaten laden
  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      try {
        // Kundendaten laden
        const customerResponse = await customerApi.detail(id);
        if (customerResponse.status === 'success') {
          setCustomer(customerResponse.data);
          
          // Formular mit aktuellen Daten initialisieren
          setFormData({
            name: customerResponse.data.name || '',
            contact_person: customerResponse.data.contact_person || '',
            email: customerResponse.data.email || '',
            phone: customerResponse.data.phone || '',
            evalarm_username: customerResponse.data.evalarm_username || '',
            evalarm_password: customerResponse.data.evalarm_password || '',
            evalarm_namespace: customerResponse.data.evalarm_namespace || '',
            status: customerResponse.data.status || 'active',
            immediate_forwarding: customerResponse.data.immediate_forwarding !== false
          });
          
          // Zugehörige Gateways laden
          const gatewaysResponse = await gatewayApi.list({ customer_id: id });
          if (gatewaysResponse.status === 'success') {
            setGateways(gatewaysResponse.data || []);
          }
        } else {
          throw new Error(customerResponse.error?.message || 'Fehler beim Laden der Kundendaten');
        }
      } catch (err) {
        console.error('Fehler beim Laden der Kundendaten:', err);
        setError(err.message || 'Kundendaten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerData();
  }, [id]);
  
  // Form-Änderungen verarbeiten
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Formular absenden
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    
    try {
      const response = await customerApi.update(id, formData);
      if (response.status === 'success') {
        // Kundendaten aktualisieren
        setCustomer(response.data);
        setEditMode(false);
      } else {
        throw new Error(response.error?.message || 'Fehler beim Speichern der Kundendaten');
      }
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setSaveError(err.message || 'Kundendaten konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };
  
  // Kunde löschen
  const handleDeleteCustomer = async () => {
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await customerApi.delete(id);
      
      if (response.status === 'success') {
        // Zurück zur Kunden-Übersicht navigieren
        navigate('/customers');
      } else {
        throw new Error(response.error?.message || 'Fehler beim Löschen des Kunden');
      }
    } catch (err) {
      console.error('Fehler beim Löschen des Kunden:', err);
      setDeleteError('Kunde konnte nicht gelöscht werden: ' + err.message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };
  
  // Status-Badge basierend auf Kundenstatus
  const renderStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unbekannt</Badge>;
    
    switch (status) {
      case 'active':
        return <Badge bg="success">Aktiv</Badge>;
      case 'inactive':
        return <Badge bg="secondary">Inaktiv</Badge>;
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
  
  // Gateway zu diesem Kunden anzeigen
  const renderGateways = () => {
    if (gateways.length === 0) {
      return <p>Keine Gateways mit diesem Kunden verbunden</p>;
    }
    
    return (
      <>
        <p className="text-muted small mb-3">
          {gateways.length} Gateway{gateways.length !== 1 ? 's' : ''} zugeordnet
        </p>
        <div className="d-flex flex-wrap gap-2">
          {gateways.map((gateway) => (
            <Button 
              key={gateway.uuid} 
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center mb-2"
              onClick={() => navigate(`/gateways/${gateway.uuid}`)}
            >
              <Router size={16} className="me-2" />
              {gateway.name || gateway.uuid}
            </Button>
          ))}
        </div>
      </>
    );
  };
  
  // Anzeige-Modus (Details des Kunden anzeigen)
  const renderViewMode = () => {
    return (
      <>
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={8}>
                <div className="small text-muted mb-1">Kundenname</div>
                <h5 className="mb-3">{customer.name}</h5>
                
                <div className="small text-muted mb-1">Erstellungsdatum</div>
                <div className="mb-3">{formatTime(customer.created_at)}</div>
              </Col>
              <Col md={4} className="text-end">
                <div className="mb-2">
                  <div className="small text-muted mb-1">Status</div>
                  {renderStatusBadge(customer.status)}
                </div>
                <div className="mb-2">
                  <div className="small text-muted mb-1">Weiterleitungs-Modus</div>
                  <Badge bg="info">
                    {customer.immediate_forwarding !== false ? 'Sofort' : 'Intervall'}
                  </Badge>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Tabs defaultActiveKey="info" id="customer-detail-tabs" className="mb-3">
          <Tab eventKey="info" title={<span><Settings size={16} className="me-1" />Allgemein</span>}>
            <div className="mb-3">
              <div className="small text-muted mb-1">Ansprechpartner</div>
              <div>{customer.contact_person || '-'}</div>
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">E-Mail</div>
              <div>{customer.email || '-'}</div>
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Telefon</div>
              <div>{customer.phone || '-'}</div>
            </div>
            
            <hr />
            <h6 className="mb-3">evAlarm API-Konfiguration</h6>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Namespace</div>
              <div>{customer.evalarm_namespace || '-'}</div>
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Benutzername</div>
              <div>{customer.evalarm_username || '-'}</div>
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Passwort</div>
              <div>{'•'.repeat(8)}</div>
            </div>
          </Tab>
          
          <Tab eventKey="gateways" title={<span><Router size={16} className="me-1" />Gateways ({gateways.length})</span>}>
            {renderGateways()}
          </Tab>
        </Tabs>
        
        {/* Aktionsbuttons */}
        <div className="drawer-footer mt-5 d-flex justify-content-between">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/customers')}>
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
  
  // Bearbeitungs-Modus
  const renderEditMode = () => {
    return (
      <Form onSubmit={handleSubmit}>
        {saveError && <Alert variant="danger" className="mb-4">{saveError}</Alert>}
        
        <Card className="mb-4">
          <Card.Body>
            <h6 className="mb-3">Kundendaten</h6>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ansprechpartner</Form.Label>
                  <Form.Control
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>E-Mail</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefon</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Aktiv</option>
                    <option value="inactive">Inaktiv</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Sofortige Weiterleitung"
                    name="immediate_forwarding"
                    checked={formData.immediate_forwarding}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Card className="mb-4">
          <Card.Body>
            <h6 className="mb-3">evAlarm API-Konfiguration</h6>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Namespace</Form.Label>
                  <Form.Control
                    type="text"
                    name="evalarm_namespace"
                    value={formData.evalarm_namespace}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Benutzername</Form.Label>
                  <Form.Control
                    type="text"
                    name="evalarm_username"
                    value={formData.evalarm_username}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Passwort</Form.Label>
                  <Form.Control
                    type="password"
                    name="evalarm_password"
                    value={formData.evalarm_password}
                    onChange={handleChange}
                    placeholder="Unverändert lassen für altes Passwort"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Aktionsbuttons */}
        <div className="drawer-footer mt-5 d-flex justify-content-between">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setEditMode(false)}
            disabled={saving}
          >
            <ArrowLeft size={16} className="me-1" />
            Abbrechen
          </Button>
          
          <Button 
            variant="primary" 
            size="sm" 
            type="submit"
            disabled={saving}
          >
            <Save size={16} className="me-1" />
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </Form>
    );
  };
  
  const drawerContent = () => {
    if (loading) {
      return <div className="text-center p-5">Lade Kundendaten...</div>;
    }
    
    if (error) {
      return (
        <>
          <Alert variant="danger" className="mb-4">{error}</Alert>
          <Button variant="secondary" onClick={() => navigate('/customers')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    if (!customer) {
      return (
        <>
          <Alert variant="warning" className="mb-4">Kunde nicht gefunden</Alert>
          <Button variant="secondary" onClick={() => navigate('/customers')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    return editMode ? renderEditMode() : renderViewMode();
  };
  
  return (
    <>
      <Drawer 
        show={true} 
        title={
          <div className="d-flex align-items-center">
            <Building size={18} className="me-2" />
            {customer ? (customer.name || 'Kundendetails') : 'Kundendetails'}
          </div>
        }
      >
        {drawerContent()}
      </Drawer>
      
      {/* Lösch-Bestätigungsmodal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Kunde löschen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError ? (
            <Alert variant="danger">{deleteError}</Alert>
          ) : (
            <>
              <p>Sind Sie sicher, dass Sie den Kunden <strong>{customer?.name}</strong> löschen möchten?</p>
              <Alert variant="warning">
                <strong>Achtung:</strong> Alle zugehörigen Gateways und Geräte werden möglicherweise ebenfalls gelöscht und diese Aktion kann nicht rückgängig gemacht werden!
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
            onClick={handleDeleteCustomer}
            disabled={deleting}
          >
            {deleting ? 'Wird gelöscht...' : 'Kunde löschen'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CustomerDetailDrawer; 