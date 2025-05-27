import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Tab, Tabs, Alert, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCpu, faPlus, faSearch, faCode, faList, faCheckCircle, faExclamationTriangle, faBolt, faThermometerHalf, faDoorOpen, faWalking, faFire, faShieldAlt, faQuestion } from '@fortawesome/free-solid-svg-icons';
import api from '../api';
import BasicTable from '../components/BasicTable';

// Icon-Mapping für Gerätetypen
const deviceIcons = {
  'panic_button': faBolt,
  'temperature_humidity_sensor': faThermometerHalf,
  'door_window_sensor': faDoorOpen,
  'motion_sensor': faWalking,
  'smoke_detector': faFire,
  'security_sensor': faShieldAlt,
  'unknown': faQuestion
};

const DeviceRegistry = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [messageCodes, setMessageCodes] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDeviceRegistry();
  }, []);

  const loadDeviceRegistry = async () => {
    setLoading(true);
    try {
      // API-Endpunkt für Device Registry (muss noch implementiert werden)
      const response = await api.devices.getRegistry();
      if (response.status === 'success') {
        setDeviceTypes(Object.entries(response.data.device_types || {}).map(([key, value]) => ({
          id: key,
          ...value
        })));
        setMessageCodes(Object.entries(response.data.message_codes || {}).map(([code, value]) => ({
          code: parseInt(code),
          ...value
        })));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Device Registry:', error);
      setError('Device Registry konnte nicht geladen werden');
      // Fallback auf lokale Daten für Entwicklung
      setDeviceTypes([
        {
          id: 'panic_button',
          name: 'Panic Button',
          description: 'Notfall-Taster für Alarmsituationen',
          codes: [2030],
          identifying_fields: ['alarmtype', 'alarmstatus'],
          required_fields: ['alarmtype', 'alarmstatus'],
          optional_fields: ['batterystatus', 'onlinestatus'],
          default_template: 'evalarm_panic'
        },
        {
          id: 'temperature_humidity_sensor',
          name: 'Temperatur- & Feuchtigkeitssensor',
          description: 'Umgebungssensor für Temperatur und Luftfeuchtigkeit',
          codes: [2001, 2002],
          identifying_fields: ['temperature', 'humidity'],
          required_fields: ['temperature', 'humidity'],
          optional_fields: ['batterylevel', 'batterystatus', 'onlinestatus'],
          default_template: 'evalarm_status'
        },
        {
          id: 'door_window_sensor',
          name: 'Tür-/Fenstersensor',
          description: 'Kontaktsensor für Türen und Fenster',
          codes: [2010, 2011],
          identifying_fields: ['contactstate', 'open', 'closed'],
          required_fields: ['contactstate'],
          optional_fields: ['batterystatus', 'tamper', 'onlinestatus'],
          default_template: 'evalarm_status'
        },
        {
          id: 'motion_sensor',
          name: 'Bewegungsmelder',
          description: 'PIR-Bewegungserkennungssensor',
          codes: [2020, 2021],
          identifying_fields: ['motion', 'motiondetected'],
          required_fields: ['motion'],
          optional_fields: ['batterystatus', 'sensitivity', 'onlinestatus'],
          default_template: 'evalarm_status'
        },
        {
          id: 'smoke_detector',
          name: 'Rauchmelder',
          description: 'Rauch- und Feuererkennungssensor',
          codes: [2040, 2041],
          identifying_fields: ['smoke', 'smokedetected'],
          required_fields: ['smoke'],
          optional_fields: ['batterystatus', 'temperature', 'test_mode'],
          default_template: 'evalarm_alarm'
        },
        {
          id: 'security_sensor',
          name: 'Generischer Sicherheitssensor',
          description: 'Allgemeiner Sicherheitssensor mit Alarmstatus',
          codes: [2000],
          identifying_fields: ['alarmstatus'],
          required_fields: ['alarmstatus'],
          optional_fields: ['alarmtype', 'batterystatus', 'onlinestatus'],
          default_template: 'evalarm_status'
        },
        {
          id: 'unknown',
          name: 'Unbekanntes Gerät',
          description: 'Nicht erkannter Gerätetyp',
          codes: [],
          identifying_fields: [],
          required_fields: [],
          optional_fields: [],
          default_template: 'evalarm_status'
        }
      ]);
      setMessageCodes([
        { code: 2000, name: 'Generic Status', description: 'Allgemeine Statusnachricht', typical_devices: ['security_sensor'] },
        { code: 2001, name: 'Environmental Status', description: 'Reguläre Statusnachricht von Umgebungssensoren', typical_devices: ['temperature_humidity_sensor'] },
        { code: 2002, name: 'Environmental Alert', description: 'Alarm von Umgebungssensoren', typical_devices: ['temperature_humidity_sensor'] },
        { code: 2010, name: 'Contact Status', description: 'Statusupdate von Kontaktsensoren', typical_devices: ['door_window_sensor'] },
        { code: 2011, name: 'Contact Alert', description: 'Alarm von Kontaktsensoren', typical_devices: ['door_window_sensor'] },
        { code: 2020, name: 'Motion Status', description: 'Statusupdate von Bewegungsmeldern', typical_devices: ['motion_sensor'] },
        { code: 2021, name: 'Motion Alert', description: 'Bewegung erkannt', typical_devices: ['motion_sensor'] },
        { code: 2030, name: 'Panic Alarm', description: 'Notfallalarm von Panic Button', typical_devices: ['panic_button'], priority: 'critical' },
        { code: 2040, name: 'Smoke Status', description: 'Statusupdate von Rauchmelder', typical_devices: ['smoke_detector'] },
        { code: 2041, name: 'Smoke Alarm', description: 'Rauch/Feuer erkannt', typical_devices: ['smoke_detector'], priority: 'critical' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeviceTypes = deviceTypes.filter(device => 
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deviceColumns = [
    {
      accessorKey: 'name',
      header: 'Gerätetyp',
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <FontAwesomeIcon icon={deviceIcons[row.original.id] || faQuestion} className="me-2" />
          <div>
            <div className="fw-bold">{row.original.name}</div>
            <small className="text-muted">{row.original.id}</small>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Beschreibung',
    },
    {
      accessorKey: 'codes',
      header: 'Message Codes',
      cell: ({ row }) => (
        <div>
          {row.original.codes.map(code => (
            <Badge key={code} bg="secondary" className="me-1">{code}</Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'default_template',
      header: 'Standard-Template',
      cell: ({ row }) => (
        <Badge bg="info">{row.original.default_template}</Badge>
      ),
    },
  ];

  const messageCodeColumns = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <Badge bg="primary" className="fs-6">{row.original.code}</Badge>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="fw-bold">{row.original.name}</div>
          <small className="text-muted">{row.original.description}</small>
        </div>
      ),
    },
    {
      accessorKey: 'typical_devices',
      header: 'Typische Geräte',
      cell: ({ row }) => (
        <div>
          {(row.original.typical_devices || []).map(device => (
            <Badge key={device} bg="secondary" className="me-1">{device}</Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priorität',
      cell: ({ row }) => (
        row.original.priority ? (
          <Badge bg={row.original.priority === 'critical' ? 'danger' : 'warning'}>
            {row.original.priority}
          </Badge>
        ) : '-'
      ),
    },
  ];

  const renderDeviceDetail = () => {
    if (!selectedDevice) return null;

    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FontAwesomeIcon icon={deviceIcons[selectedDevice.id] || faQuestion} className="me-2" />
            {selectedDevice.name}
          </h5>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setSelectedDevice(null)}
          >
            Schließen
          </Button>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Identifikation</h6>
              <p><strong>ID:</strong> {selectedDevice.id}</p>
              <p><strong>Beschreibung:</strong> {selectedDevice.description}</p>
              <p><strong>Message Codes:</strong> {selectedDevice.codes.join(', ') || 'Keine'}</p>
              <p><strong>Standard-Template:</strong> <Badge bg="info">{selectedDevice.default_template}</Badge></p>
            </Col>
            <Col md={6}>
              <h6>Felder</h6>
              <div className="mb-2">
                <strong>Identifizierende Felder:</strong>
                <div>
                  {selectedDevice.identifying_fields.map(field => (
                    <Badge key={field} bg="primary" className="me-1">{field}</Badge>
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <strong>Pflichtfelder:</strong>
                <div>
                  {selectedDevice.required_fields.map(field => (
                    <Badge key={field} bg="danger" className="me-1">{field}</Badge>
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <strong>Optionale Felder:</strong>
                <div>
                  {selectedDevice.optional_fields.map(field => (
                    <Badge key={field} bg="secondary" className="me-1">{field}</Badge>
                  ))}
                </div>
              </div>
            </Col>
          </Row>
          
          {selectedDevice.value_mappings && Object.keys(selectedDevice.value_mappings).length > 0 && (
            <div className="mt-3">
              <h6>Erlaubte Werte</h6>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Feld</th>
                    <th>Erlaubte Werte</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedDevice.value_mappings || {}).map(([field, values]) => (
                    <tr key={field}>
                      <td><code>{field}</code></td>
                      <td>{values.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedDevice.value_ranges && Object.keys(selectedDevice.value_ranges).length > 0 && (
            <div className="mt-3">
              <h6>Wertebereiche</h6>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Feld</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Einheit</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedDevice.value_ranges || {}).map(([field, range]) => (
                    <tr key={field}>
                      <td><code>{field}</code></td>
                      <td>{range.min}</td>
                      <td>{range.max}</td>
                      <td>{range.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedDevice.mqtt_topics && selectedDevice.mqtt_topics.length > 0 && (
            <div className="mt-3">
              <h6>MQTT Topics</h6>
              <ul>
                {selectedDevice.mqtt_topics.map(topic => (
                  <li key={topic}><code>{topic}</code></li>
                ))}
              </ul>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Lade Device Registry...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>
            <FontAwesomeIcon icon={faCpu} className="me-2" />
            Device Registry
          </h2>
          <p className="text-muted">
            Zentrale Verwaltung aller Gerätetypen und Message Codes
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="warning" dismissible onClose={() => setError(null)}>
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}

      <Tabs defaultActiveKey="devices" className="mb-4">
        <Tab eventKey="devices" title={`Gerätetypen (${deviceTypes.length})`}>
          <Card>
            <Card.Header>
              <Row>
                <Col md={8}>
                  <h5 className="mb-0">Registrierte Gerätetypen</h5>
                </Col>
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Suche nach Gerätetyp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {selectedDevice && renderDeviceDetail()}
              
              <BasicTable
                data={filteredDeviceTypes}
                columns={deviceColumns}
                onRowClick={(row) => setSelectedDevice(row.original)}
                emptyMessage="Keine Gerätetypen gefunden."
              />

              <div className="mt-3">
                <small className="text-muted">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  {deviceTypes.length} Gerätetypen in der Registry
                </small>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="codes" title={`Message Codes (${messageCodes.length})`}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Message Code Definitionen</h5>
            </Card.Header>
            <Card.Body>
              <BasicTable
                data={messageCodes}
                columns={messageCodeColumns}
                emptyMessage="Keine Message Codes gefunden."
              />

              <div className="mt-3">
                <small className="text-muted">
                  <FontAwesomeIcon icon={faCode} className="me-2" />
                  Alle Message Codes sind zentral dokumentiert und validiert
                </small>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="learning" title="Learning Mode" disabled>
          <Card>
            <Card.Body className="text-center p-5">
              <FontAwesomeIcon icon={faCpu} size="3x" className="text-muted mb-3" />
              <h5>Learning Mode Integration</h5>
              <p className="text-muted">
                Die Integration mit dem Learning System wird in der nächsten Phase implementiert.
              </p>
              <Button 
                variant="primary" 
                onClick={() => navigate('/template-learning')}
              >
                Zum Template Learning System
              </Button>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default DeviceRegistry; 