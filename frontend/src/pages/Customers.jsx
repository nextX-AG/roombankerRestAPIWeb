import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { Building, Plus, RefreshCw } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { customerApi, gatewayApi } from '../api';
import BasicTable from '../components/BasicTable';

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

  // Öffne Kundendetails im Drawer statt im Modal
  const openCustomerDetail = (customer) => {
    navigate(`/customers/${customer.id}`);
  };

  // Status-Badge
  const renderStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge bg="success">Aktiv</Badge>;
    } else {
      return <Badge bg="secondary">Inaktiv</Badge>;
    }
  };
  
  // TanStack Table Spalten-Definition
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 200,
      },
      {
        accessorKey: 'contact_person',
        header: 'Kontakt',
        size: 150,
        cell: ({ row }) => row.original.contact_person || '-',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        cell: ({ row }) => renderStatusBadge(row.original.status),
      },
      {
        accessorKey: 'gateway_count',
        header: 'Gateways',
        size: 100,
        cell: ({ row }) => row.original.gateway_count || 0,
      },
      {
        accessorKey: 'immediate_forwarding',
        header: 'Weiterleitung',
        size: 120,
        cell: ({ row }) => row.original.immediate_forwarding !== false ? 'Sofort' : 'Intervall',
      }
    ],
    []
  );

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
          <BasicTable 
            data={customers}
            columns={columns}
            isLoading={loading}
            emptyMessage="Keine Kunden vorhanden. Fügen Sie einen neuen Kunden hinzu."
            onRowClick={openCustomerDetail}
          />
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
      
      {/* Outlet für verschachtelte Routen (CustomerDetailDrawer) */}
      <Outlet />
    </>
  );
};

export default Customers; 