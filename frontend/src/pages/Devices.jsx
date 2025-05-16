import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Form, Modal, Alert, InputGroup } from 'react-bootstrap';
import { Outlet, useNavigate } from 'react-router-dom';
import { Cpu, RefreshCw, Search, Edit } from 'lucide-react';
import axios from 'axios';
import config, { API_VERSION } from '../config';
import BasicTable from '../components/BasicTable';

// Verwende die konfigurierte API-URL mit Version
const API_URL = `${config.apiBaseUrl}/${API_VERSION}`;

/**
 * Geräteverwaltungs-Komponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Devices = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
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
      
      // Extrahiere die Daten aus dem data-Feld der Antworten
      const devicesList = devicesResponse.data?.data || [];
      const gatewaysList = gatewaysResponse.data?.data || [];
      
      setDevices(Array.isArray(devicesList) ? devicesList : []);
      setGateways(Array.isArray(gatewaysList) ? gatewaysList : []);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
      setError('Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      setDevices([]);
      setGateways([]);
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
      const response = await axios.put(`${API_URL}/devices/${currentDevice.gateway_uuid}/${currentDevice.device_id}`, formData);
      if (response.data?.status === 'success') {
        setShowEditModal(false);
        fetchData();
      } else {
        throw new Error('Fehler beim Speichern der Änderungen');
      }
    } catch (err) {
      console.error('Fehler beim Bearbeiten des Geräts:', err);
      setError('Gerät konnte nicht bearbeitet werden: ' + (err.response?.data?.message || err.message));
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

  // Öffne Gerätedetails im Drawer statt im Modal
  const openDeviceDetail = (device) => {
    navigate(`/devices/${device.gateway_uuid}/${device.device_id}`);
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

  // TanStack Table Spalten-Definition
  const columns = useMemo(
    () => [
      {
        accessorKey: 'device_id',
        header: 'Geräte-ID',
        size: 180,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 150,
      },
      {
        accessorKey: 'device_type',
        header: 'Typ',
        size: 150,
        cell: ({ row }) => formatDeviceType(row.original.device_type),
      },
      {
        accessorKey: 'gateway_uuid',
        header: 'Gateway',
        size: 180,
        cell: ({ row }) => getGatewayName(row.original.gateway_uuid),
      },
      {
        accessorKey: 'last_update',
        header: 'Letztes Update',
        size: 150,
        cell: ({ row }) => formatDateTime(row.original.last_update),
      },
      {
        id: 'actions',
        header: 'Aktionen',
        size: 100,
        cell: ({ row }) => {
          const device = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(device);
                }}
              >
                <Edit size={16} />
              </Button>
            </div>
          );
        },
      },
    ],
    [gateways]
  );

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <Cpu size={24} className="me-2" />
        Geräteverwaltung
      </h1>

      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {/* 3. Aktions-Buttons */}
      <Row className="mb-4">
        <Col xs={12} className="d-flex justify-content-end">
          <Button 
            variant="secondary" 
            onClick={fetchData}
          >
            <RefreshCw size={16} className="me-1" /> Aktualisieren
          </Button>
        </Col>
      </Row>

      {/* 4. Tabelle mit Geräten */}
      <Card>
        <Card.Header>Geräteliste</Card.Header>
        <Card.Body>
          <BasicTable 
            data={devices}
            columns={columns}
            isLoading={loading}
            emptyMessage="Keine Geräte vorhanden."
            onRowClick={openDeviceDetail}
          />
        </Card.Body>
      </Card>

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

      {/* Outlet für verschachtelte Routen (DeviceDetailDrawer) */}
      <Outlet />
    </>
  );
};

export default Devices; 