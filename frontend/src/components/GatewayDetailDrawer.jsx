import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Badge, Alert, Tabs, Tab, Row, Col } from 'react-bootstrap';
import Drawer from './Drawer';
import axios from 'axios';
import { formatDateTime } from '../utils/formatters';
import GatewayStatusIcons from './GatewayStatusIcons';
import { ArrowLeft, Settings, Server, History, BarChart } from 'lucide-react';

// Konfiguration für API-Aufrufe
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const GatewayDetailDrawer = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  
  useEffect(() => {
    const fetchGatewayData = async () => {
      setLoading(true);
      try {
        // Gateway-Daten laden
        const gatewayResponse = await axios.get(`${API_URL}/gateways/${uuid}`);
        setGateway(gatewayResponse.data);
        
        // Zugehörige Geräte laden
        const devicesResponse = await axios.get(`${API_URL}/devices?gateway_uuid=${uuid}`);
        setDevices(devicesResponse.data);
        
        // Neueste Telemetriedaten laden
        try {
          const telemetryResponse = await axios.get(`${API_URL}/gateways/${uuid}/latest`);
          setLatestData(telemetryResponse.data);
        } catch (err) {
          console.warn('Keine aktuellen Telemetriedaten gefunden:', err);
        }
        
        // Wenn Gateway einen Kunden hat, lade Kundendaten
        if (gatewayResponse.data.customer_id) {
          try {
            const customerResponse = await axios.get(`${API_URL}/customers/${gatewayResponse.data.customer_id}`);
            setCustomer(customerResponse.data);
          } catch (err) {
            console.error('Fehler beim Laden der Kundendaten:', err);
          }
        }
      } catch (err) {
        console.error('Fehler beim Laden der Gateway-Daten:', err);
        setError('Gateway-Daten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGatewayData();
  }, [uuid]);
  
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
  
  const drawerContent = () => {
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
          
          <Button variant="primary" size="sm" onClick={() => navigate(`/gateways/${uuid}/edit`)}>
            <Settings size={16} className="me-1" />
            Bearbeiten
          </Button>
        </div>
      </>
    );
  };
  
  return (
    <Drawer 
      show={true} 
      title={gateway ? (gateway.name || 'Gateway Details') : 'Gateway Details'}
    >
      {drawerContent()}
    </Drawer>
  );
};

export default GatewayDetailDrawer; 