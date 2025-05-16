import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Badge, Alert, Tabs, Tab, Row, Col } from 'react-bootstrap';
import Drawer from './Drawer';
import { formatDateTime } from '../utils/formatters';
import { ArrowLeft, Cpu, Edit, Save } from 'lucide-react';
import axios from 'axios';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';
import config, { API_VERSION } from '../config';

// Verwende die konfigurierte API-URL mit Version
const API_URL = `${config.apiBaseUrl}/${API_VERSION}`;

const DeviceDetailDrawer = () => {
  const { gatewayUuid, deviceId } = useParams();
  const navigate = useNavigate();
  
  // Zustände
  const [device, setDevice] = useState(null);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    device_type: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  // Gerätedaten laden
  useEffect(() => {
    const fetchDeviceData = async () => {
      setLoading(true);
      try {
        // Gerät laden
        const deviceResponse = await axios.get(`${API_URL}/devices/${gatewayUuid}/${deviceId}`);
        if (deviceResponse.data?.status === 'success') {
          const deviceData = deviceResponse.data.data;
          setDevice(deviceData);
          
          // Formular mit aktuellen Daten initialisieren
          setFormData({
            name: deviceData.name || '',
            description: deviceData.description || '',
            device_type: deviceData.device_type || ''
          });
          
          // Gateway-Informationen laden
          try {
            const gatewayResponse = await axios.get(`${API_URL}/gateways/${gatewayUuid}`);
            if (gatewayResponse.data?.status === 'success') {
              setGateway(gatewayResponse.data.data);
            }
          } catch (err) {
            console.warn('Gateway-Informationen konnten nicht geladen werden:', err);
          }
        } else {
          throw new Error(deviceResponse.data?.error?.message || 'Fehler beim Laden der Gerätedaten');
        }
      } catch (err) {
        console.error('Fehler beim Laden der Gerätedaten:', err);
        setError(err.message || 'Gerätedaten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeviceData();
  }, [gatewayUuid, deviceId]);
  
  // Form-Änderungen verarbeiten
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Formular absenden
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    
    try {
      const response = await axios.put(`${API_URL}/devices/${gatewayUuid}/${deviceId}`, formData);
      if (response.data?.status === 'success') {
        // Gerätedaten aktualisieren
        setDevice({
          ...device,
          ...formData
        });
        setEditMode(false);
      } else {
        throw new Error(response.data?.error?.message || 'Fehler beim Speichern der Gerätedaten');
      }
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setSaveError(err.message || 'Gerätedaten konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
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
  
  // Formatiere Zeitstempel
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return formatDateTime(timestamp);
    } catch (e) {
      return '-';
    }
  };
  
  // Anzeige-Modus (Details des Geräts anzeigen)
  const renderViewMode = () => {
    return (
      <>
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={8}>
                <div className="small text-muted mb-1">Geräte-ID</div>
                <div className="mb-3 small font-monospace">{device.device_id}</div>
                
                <div className="small text-muted mb-1">Gateway</div>
                <div className="mb-3">
                  {gateway ? gateway.name : device.gateway_uuid}
                </div>
              </Col>
              <Col md={4} className="text-end">
                <div className="mb-2">
                  <div className="small text-muted mb-1">Typ</div>
                  <Badge bg="info">{formatDeviceType(device.device_type)}</Badge>
                </div>
                <div className="mb-2">
                  <div className="small text-muted mb-1">Letztes Update</div>
                  <div>{formatTime(device.last_update)}</div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Tabs defaultActiveKey="info" id="device-detail-tabs" className="mb-3">
          <Tab eventKey="info" title={<span><Edit size={16} className="me-1" />Details</span>}>
            <div className="mb-3">
              <div className="small text-muted mb-1">Name</div>
              <div>{device.name || '-'}</div>
            </div>
            
            <div className="mb-3">
              <div className="small text-muted mb-1">Beschreibung</div>
              <div>{device.description || '-'}</div>
            </div>
          </Tab>
          
          <Tab eventKey="status" title={<span><Cpu size={16} className="me-1" />Status-Daten</span>}>
            {device.status ? (
              <div className="border rounded p-3 bg-light">
                <JSONPretty id="json-pretty" data={device.status} />
              </div>
            ) : (
              <Alert variant="info">
                Keine Status-Daten vorhanden
              </Alert>
            )}
          </Tab>
        </Tabs>
        
        {/* Aktionsbuttons */}
        <div className="drawer-footer mt-5 d-flex justify-content-between">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/devices')}>
            <ArrowLeft size={16} className="me-1" />
            Zurück
          </Button>
          
          <Button variant="primary" size="sm" onClick={() => setEditMode(true)}>
            <Edit size={16} className="me-1" />
            Bearbeiten
          </Button>
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
            <h6 className="mb-3">Gerätedaten</h6>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Geräte-ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={device.device_id}
                    disabled
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Gateway</Form.Label>
                  <Form.Control
                    type="text"
                    value={gateway ? gateway.name : device.gateway_uuid}
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
      return <div className="text-center p-5">Lade Gerätedaten...</div>;
    }
    
    if (error) {
      return (
        <>
          <Alert variant="danger" className="mb-4">{error}</Alert>
          <Button variant="secondary" onClick={() => navigate('/devices')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    if (!device) {
      return (
        <>
          <Alert variant="warning" className="mb-4">Gerät nicht gefunden</Alert>
          <Button variant="secondary" onClick={() => navigate('/devices')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    return editMode ? renderEditMode() : renderViewMode();
  };
  
  return (
    <Drawer 
      show={true} 
      title={
        <div className="d-flex align-items-center">
          <Cpu size={18} className="me-2" />
          {device ? (device.name || `Gerät: ${device.device_id}`) : 'Gerätedetails'}
        </div>
      }
    >
      {drawerContent()}
    </Drawer>
  );
};

export default DeviceDetailDrawer; 