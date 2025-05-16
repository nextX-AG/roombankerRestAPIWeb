import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSync, faBuilding } from '@fortawesome/free-solid-svg-icons';
import { Building, Plus, Trash, RefreshCw, Edit } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { customerApi, gatewayApi } from '../api';

/**
 * Kundenverwaltungs-Komponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    evalarm_username: '',
    evalarm_password: '',
    evalarm_namespace: '',
    evalarm_url: '',
    status: 'active',
    immediate_forwarding: true
  });

  // Lade Kundendaten beim Seitenaufruf
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Hole alle Kunden
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerApi.list();
      if (response.status === 'success') {
        // Bereichere Kundendaten mit Gateway-Anzahl
        const customersWithGatewayCounts = await Promise.all(
          response.data.map(async customer => {
            try {
              // Gateways für diesen Kunden laden
              const gatewayResponse = await gatewayApi.list({ customer_id: customer.id });
              if (gatewayResponse.status === 'success') {
                return {
                  ...customer,
                  gateway_count: gatewayResponse.data?.length || 0
                };
              }
              return customer;
            } catch (err) {
              console.error(`Fehler beim Laden der Gateways für Kunde ${customer.id}:`, err);
              return customer;
            }
          })
        );
        setCustomers(customersWithGatewayCounts);
        setError(null);
      } else {
        throw new Error(response.error?.message || 'Kunden konnten nicht geladen werden');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err);
      setError('Kunden konnten nicht geladen werden: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler für Formularänderungen
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Kunde hinzufügen
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const response = await customerApi.create(formData);
      if (response.status === 'success') {
        setShowAddModal(false);
        setFormData({
          name: '',
          contact_person: '',
          email: '',
          phone: '',
          evalarm_username: '',
          evalarm_password: '',
          evalarm_namespace: '',
          status: 'active',
          immediate_forwarding: true
        });
        fetchCustomers();
      } else {
        throw new Error(response.error?.message || 'Kunde konnte nicht erstellt werden');
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des Kunden:', err);
      setError('Kunde konnte nicht erstellt werden: ' + err.message);
    }
  };

  // Kunde löschen
  const handleDeleteCustomer = async () => {
    if (!currentCustomer) return;
    
    try {
      const response = await customerApi.delete(currentCustomer.id);
      if (response.status === 'success') {
        setShowDeleteConfirm(false);
        fetchCustomers();
      } else {
        throw new Error(response.error?.message || 'Kunde konnte nicht gelöscht werden');
      }
    } catch (err) {
      console.error('Fehler beim Löschen des Kunden:', err);
      setError('Kunde konnte nicht gelöscht werden: ' + err.message);
      setShowDeleteConfirm(false);
    }
  };

  // Öffne Kundendetails im Drawer statt im Modal
  const openCustomerDetail = (customer) => {
    navigate(`/customers/${customer.id}`);
  };

  // Löschbestätigung öffnen
  const openDeleteConfirm = (customer) => {
    setCurrentCustomer(customer);
    setShowDeleteConfirm(true);
  };

  // Status-Badge
  const renderStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge bg="success">Aktiv</Badge>;
    } else {
      return <Badge bg="secondary">Inaktiv</Badge>;
    }
  };

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <Building size={24} className="me-2" />
        Kundenverwaltung
      </h1>

      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>{error}</Alert>}

      {/* 3. Aktions-Buttons */}
      <Row className="mb-4">
        <Col xs={12} className="d-flex justify-content-end">
          <Button 
            variant="primary" 
            className="me-2" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} className="me-1" /> Kunde hinzufügen
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchCustomers}
          >
            <RefreshCw size={16} className="me-1" /> Aktualisieren
          </Button>
        </Col>
      </Row>

      {/* 4. Inhalt in Karten */}
      <Card>
        <Card.Header>Kundenliste</Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center p-5">Lade Kundendaten...</div>
          ) : customers.length === 0 ? (
            <div className="text-center p-5">Keine Kunden vorhanden. Fügen Sie einen neuen Kunden hinzu.</div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kontakt</th>
                  <th>Status</th>
                  <th>Gateways</th>
                  <th>Weiterleitung</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.contact_person || '-'}</td>
                    <td>{renderStatusBadge(customer.status)}</td>
                    <td>{customer.gateway_count || 0}</td>
                    <td>
                      {customer.immediate_forwarding !== false ? 'Sofort' : 'Intervall'}
                    </td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-1"
                        onClick={() => openCustomerDetail(customer)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => openDeleteConfirm(customer)}
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

      {/* Modal: Kunde hinzufügen */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Neuen Kunden hinzufügen</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddCustomer}>
          <Modal.Body>
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
                  <Form.Label>Kontaktperson</Form.Label>
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
            
            <hr />
            <h6>evAlarm API-Konfiguration</h6>
            
            <Row>
              <Col md={6}>
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Passwort</Form.Label>
                  <Form.Control
                    type="password"
                    name="evalarm_password"
                    value={formData.evalarm_password}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
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
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>evAlarm API URL</Form.Label>
                  <Form.Control
                    type="text"
                    name="evalarm_url"
                    value={formData.evalarm_url}
                    onChange={handleChange}
                    placeholder="https://tas.dev.evalarm.de/api/v1/espa"
                  />
                  <Form.Text className="text-muted">
                    Standard: https://tas.dev.evalarm.de/api/v1/espa
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="immediate_forwarding"
                    label="Sofortige Weiterleitung (andernfalls intervallbasiert)"
                    checked={formData.immediate_forwarding}
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

      {/* Modal: Kunde löschen */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Kunden löschen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sind Sie sicher, dass Sie den Kunden <strong>{currentCustomer?.name}</strong> löschen möchten?
          <br />
          <strong className="text-danger">Hinweis: Alle zugehörigen Gateways und Geräte werden ebenfalls gelöscht!</strong>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleDeleteCustomer}>
            Löschen
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Outlet für verschachtelte Routen (CustomerDetailDrawer) */}
      <Outlet />
    </>
  );
};

export default Customers; 