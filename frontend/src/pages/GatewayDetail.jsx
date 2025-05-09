import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faNetworkWired, faHistory, faServer, faWrench, faChartLine } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import GatewayStatusIcons from '../components/GatewayStatusIcons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const GatewayDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  
  // Lade Gateway und zugehörige Daten
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
        
        // Status-Verlauf laden (falls API vorhanden)
        try {
          const historyResponse = await axios.get(`${API_URL}/gateways/${uuid}/history`);
          setStatusHistory(historyResponse.data);
        } catch (err) {
          console.warn('Status-Verlauf konnte nicht geladen werden:', err);
        }
        
      } catch (err) {
        console.error('Fehler beim Laden der Gateway-Daten:', err);
        setError('Gateway-Daten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGatewayData();
    
    // Echtzeit-Updates über Websocket oder Polling (optional)
    const interval = setInterval(async () => {
      try {
        const telemetryResponse = await axios.get(`${API_URL}/gateways/${uuid}/latest`);
        setLatestData(telemetryResponse.data);
      } catch (err) {
        console.warn('Fehler bei Echtzeit-Update:', err);
      }
    }, 30000); // Alle 30 Sekunden aktualisieren
    
    return () => clearInterval(interval);
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
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE');
  };
  
  // Detaillierte technische Daten anzeigen
  const renderTechnicalData = () => {
    if (!latestData || !latestData.data || !latestData.data.gateway) return <p>Keine technischen Daten verfügbar</p>;
    
    const { gateway } = latestData.data;
    return (
      <Table responsive striped>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Wert</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Alarm-Status</td>
            <td>{gateway.alarmstatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('alarmstatus')}</td>
          </tr>
          <tr>
            <td>Batterie-Status</td>
            <td>{gateway.batterystatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('batterystatus')}</td>
          </tr>
          <tr>
            <td>Stromversorgung</td>
            <td>{gateway.powerstatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('powerstatus')}</td>
          </tr>
          <tr>
            <td>Gehäusestatus</td>
            <td>{gateway.lidstatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('lidstatus')}</td>
          </tr>
          <tr>
            <td>WAN-Status</td>
            <td>{gateway.wanstatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('wanstatus')}</td>
          </tr>
          <tr>
            <td>WLAN-Status</td>
            <td>{gateway.wifistatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('wifistatus')}</td>
          </tr>
          <tr>
            <td>Mobilfunk-Status</td>
            <td>{gateway.cellularstatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('cellularstatus')}</td>
          </tr>
          <tr>
            <td>Signalstärke</td>
            <td>{gateway.dbm} dBm</td>
            <td></td>
          </tr>
          <tr>
            <td>Fehler-Status</td>
            <td>{gateway.faultstatus}</td>
            <td>{GatewayStatusIcons({ gatewayData: latestData.data }).getIcon('faultstatus')}</td>
          </tr>
          <tr>
            <td>SIM-Status</td>
            <td>{gateway.simstatus}</td>
            <td></td>
          </tr>
          <tr>
            <td>PIN-Status</td>
            <td>{gateway.pinstatus}</td>
            <td></td>
          </tr>
          <tr>
            <td>Stromstärke</td>
            <td>{gateway.electricity}%</td>
            <td></td>
          </tr>
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
      <Table responsive hover>
        <thead>
          <tr>
            <th>Geräte-ID</th>
            <th>Name</th>
            <th>Typ</th>
            <th>Status</th>
            <th>Letztes Update</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.device_id}>
              <td>{device.device_id}</td>
              <td>{device.name}</td>
              <td>{device.device_type}</td>
              <td>{device.status || 'Unbekannt'}</td>
              <td>{formatDateTime(device.last_update)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };
  
  // Status-Verlauf anzeigen (falls vorhanden)
  const renderStatusHistory = () => {
    if (statusHistory.length === 0) {
      return <p>Kein Status-Verlauf verfügbar</p>;
    }
    
    return (
      <Table responsive hover>
        <thead>
          <tr>
            <th>Zeitpunkt</th>
            <th>Status</th>
            <th>Ereignis</th>
          </tr>
        </thead>
        <tbody>
          {statusHistory.map((entry, index) => (
            <tr key={index}>
              <td>{formatDateTime(entry.timestamp)}</td>
              <td>{renderStatusBadge(entry.status)}</td>
              <td>{entry.event}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };
  
  if (loading) {
    return (
      <Container fluid>
        <div className="text-center p-5">Lade Gateway-Daten...</div>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container fluid>
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" onClick={() => navigate('/gateways')}>
          <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }
  
  if (!gateway) {
    return (
      <Container fluid>
        <Alert variant="warning">Gateway nicht gefunden</Alert>
        <Button variant="secondary" onClick={() => navigate('/gateways')}>
          <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
          Zurück zur Übersicht
        </Button>
      </Container>
    );
  }
  
  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/gateways')} className="mb-3">
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Zurück zur Übersicht
          </Button>
          
          <Card className="gateway-detail-header">
            <Card.Body>
              <Row>
                <Col md={8}>
                  <h1 className="h3">
                    <FontAwesomeIcon icon={faNetworkWired} className="me-2" />
                    {gateway.name || 'Unbenanntes Gateway'}
                  </h1>
                  <p className="text-muted">UUID: {gateway.uuid}</p>
                  {customer && <p><strong>Kunde:</strong> {customer.name}</p>}
                </Col>
                <Col md={4} className="text-end d-flex flex-column justify-content-between">
                  <div>
                    <div className="mb-2">
                      Status: {renderStatusBadge(gateway.status)}
                    </div>
                    <div className="mb-2">
                      Letzter Kontakt: {formatDateTime(gateway.last_contact)}
                    </div>
                  </div>
                  {latestData && latestData.data && (
                    <div className="gateway-status-display">
                      {GatewayStatusIcons({ gatewayData: latestData.data }).all}
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Tabs defaultActiveKey="info" id="gateway-detail-tabs" className="mb-3">
            <Tab eventKey="info" title={<span><FontAwesomeIcon icon={faNetworkWired} className="me-2" />Übersicht</span>}>
              <Card>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h4>Gateway-Informationen</h4>
                      <Table borderless>
                        <tbody>
                          <tr>
                            <td>Name:</td>
                            <td>{gateway.name || '-'}</td>
                          </tr>
                          <tr>
                            <td>Beschreibung:</td>
                            <td>{gateway.description || '-'}</td>
                          </tr>
                          <tr>
                            <td>UUID:</td>
                            <td>{gateway.uuid}</td>
                          </tr>
                          <tr>
                            <td>Status:</td>
                            <td>{renderStatusBadge(gateway.status)}</td>
                          </tr>
                          <tr>
                            <td>Letzter Kontakt:</td>
                            <td>{formatDateTime(gateway.last_contact)}</td>
                          </tr>
                          <tr>
                            <td>Erstellt am:</td>
                            <td>{formatDateTime(gateway.created_at)}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h4>Kundenzuordnung</h4>
                      {customer ? (
                        <Table borderless>
                          <tbody>
                            <tr>
                              <td>Kundenname:</td>
                              <td>{customer.name}</td>
                            </tr>
                            <tr>
                              <td>Ansprechpartner:</td>
                              <td>{customer.contact_name || '-'}</td>
                            </tr>
                            <tr>
                              <td>E-Mail:</td>
                              <td>{customer.contact_email || '-'}</td>
                            </tr>
                            <tr>
                              <td>Telefon:</td>
                              <td>{customer.contact_phone || '-'}</td>
                            </tr>
                            <tr>
                              <td>evAlarm-Namespace:</td>
                              <td>{customer.evalarm_namespace || '-'}</td>
                            </tr>
                          </tbody>
                        </Table>
                      ) : (
                        <Alert variant="warning">
                          Keine Kundenzuordnung
                        </Alert>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="technical" title={<span><FontAwesomeIcon icon={faWrench} className="me-2" />Technische Daten</span>}>
              <Card>
                <Card.Body>
                  <h4>Technische Statusdaten</h4>
                  {latestData ? (
                    <>
                      <p className="text-muted">
                        Letztes Update: {formatDateTime(latestData.received_at || latestData.timestamp)}
                      </p>
                      {renderTechnicalData()}
                    </>
                  ) : (
                    <Alert variant="info">
                      Keine technischen Daten verfügbar
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="devices" title={<span><FontAwesomeIcon icon={faServer} className="me-2" />Verbundene Geräte ({devices.length})</span>}>
              <Card>
                <Card.Body>
                  <h4>Verbundene Geräte</h4>
                  {renderDevices()}
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="history" title={<span><FontAwesomeIcon icon={faHistory} className="me-2" />Status-Verlauf</span>}>
              <Card>
                <Card.Body>
                  <h4>Status-Verlauf</h4>
                  {renderStatusHistory()}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
};

export default GatewayDetail; 