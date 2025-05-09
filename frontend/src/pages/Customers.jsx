import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSync, faUsers, faEye, faBuilding } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Kundenverwaltungs-Komponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
      const response = await axios.get(`${API_URL}/customers`);
      setCustomers(response.data);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err);
      setError('Kundendaten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Handler für Formularänderungen
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Kunde hinzufügen
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/customers`, formData);
      setShowAddModal(false);
      resetForm();
      fetchCustomers();
    } catch (err) {
      console.error('Fehler beim Hinzufügen des Kunden:', err);
      setError('Kunde konnte nicht hinzugefügt werden.');
    }
  };

  // Kunde bearbeiten
  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/customers/${currentCustomer.id}`, formData);
      setShowEditModal(false);
      resetForm();
      fetchCustomers();
    } catch (err) {
      console.error('Fehler beim Bearbeiten des Kunden:', err);
      setError('Kunde konnte nicht bearbeitet werden.');
    }
  };

  // Kunde löschen
  const handleDeleteCustomer = async () => {
    try {
      await axios.delete(`${API_URL}/customers/${currentCustomer.id}`);
      setShowDeleteConfirm(false);
      fetchCustomers();
    } catch (err) {
      console.error('Fehler beim Löschen des Kunden:', err);
      setError('Kunde konnte nicht gelöscht werden.');
    }
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setFormData({
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
  };

  // Modal zum Bearbeiten öffnen
  const openEditModal = (customer) => {
    setCurrentCustomer(customer);
    setFormData({
      name: customer.name || '',
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      evalarm_username: customer.evalarm_username || '',
      evalarm_password: customer.evalarm_password || '',
      evalarm_namespace: customer.evalarm_namespace || '',
      evalarm_url: customer.evalarm_url || '',
      status: customer.status || 'active',
      immediate_forwarding: customer.immediate_forwarding !== false
    });
    setShowEditModal(true);
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
        <FontAwesomeIcon icon={faBuilding} className="icon" />
        Kundenverwaltung
      </h1>

      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {/* 3. Aktions-Buttons */}
      <Row className="mb-4">
        <Col xs={12} className="d-flex justify-content-end">
          <Button 
            variant="primary" 
            className="me-2" 
            onClick={() => setShowAddModal(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" /> Kunde hinzufügen
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchCustomers}
          >
            <FontAwesomeIcon icon={faSync} className="me-1" /> Aktualisieren
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
                  <th>Kontaktperson</th>
                  <th>E-Mail</th>
                  <th>evAlarm-Namespace</th>
                  <th>Status</th>
                  <th>Weiterleitung</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.contact_person || '-'}</td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.evalarm_namespace || '-'}</td>
                    <td>{renderStatusBadge(customer.status)}</td>
                    <td>
                      {customer.immediate_forwarding !== false ? 'Sofort' : 'Intervall'}
                    </td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-1"
                        onClick={() => openEditModal(customer)}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => openDeleteConfirm(customer)}
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

      {/* Modal: Kunde bearbeiten */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Kunde bearbeiten</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditCustomer}>
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
                    placeholder="••••••••"
                  />
                  <Form.Text className="text-muted">
                    Leer lassen, um das aktuelle Passwort beizubehalten
                  </Form.Text>
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
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
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
    </>
  );
};

export default Customers; 