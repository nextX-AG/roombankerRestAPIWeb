import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from './PageTemplate';
import { Row, Col, Card, Button, Badge, ProgressBar, Alert, Form, Table, Tabs, Tab, Modal, Spinner } from 'react-bootstrap';
import { Brain, Play, Pause, CheckCircle, AlertCircle, Clock, MessageSquare, Layers, Save, Eye, Download, Upload } from 'lucide-react';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { gatewayApi, templateApi } from '../api';
import { formatDate } from '../utils/formatters';

const TemplateLearning = () => {
  const navigate = useNavigate();
  
  // States
  const [learningGateways, setLearningGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [messagePatterns, setMessagePatterns] = useState([]);
  const [suggestedTemplates, setSuggestedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showStartLearningModal, setShowStartLearningModal] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Lade Daten beim Mount
  useEffect(() => {
    fetchLearningGateways();
  }, []);
  
  // Lade Learning-Gateways
  const fetchLearningGateways = async () => {
    try {
      setLoading(true);
      // TODO: API-Endpunkt implementieren
      // const response = await gatewayApi.getLearningStatus();
      // Simulierte Daten für Demo
      setLearningGateways([
        {
          id: 'gw-001',
          name: 'Roombanker Gateway #1',
          uuid: 'rb-gw-001',
          status: 'learning',
          startTime: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 Stunden
          progress: 50,
          messageCount: 1248,
          patternCount: 5
        },
        {
          id: 'gw-002',
          name: 'Test Gateway',
          uuid: 'test-gw-002',
          status: 'completed',
          startTime: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 Stunden
          endTime: new Date(),
          progress: 100,
          messageCount: 4896,
          patternCount: 8,
          templatesGenerated: true
        }
      ]);
    } catch (err) {
      setError('Fehler beim Laden der Learning-Gateways: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Starte Lernmodus für Gateway
  const startLearning = async (gatewayId) => {
    try {
      setLoading(true);
      // TODO: API-Endpunkt implementieren
      // await gatewayApi.startLearning(gatewayId);
      setSuccess('Lernmodus gestartet für Gateway');
      setShowStartLearningModal(false);
      fetchLearningGateways();
    } catch (err) {
      setError('Fehler beim Starten des Lernmodus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Lade Nachrichtenmuster für Gateway
  const loadMessagePatterns = async (gateway) => {
    try {
      setLoading(true);
      // TODO: API-Endpunkt implementieren
      // const patterns = await gatewayApi.getMessagePatterns(gateway.id);
      // Simulierte Daten
      setMessagePatterns([
        {
          id: 'pattern-1',
          hash: 'abc123',
          type: 'Panic Alarm',
          count: 12,
          frequency: '~1x pro Stunde',
          commonFields: {
            alarmtype: { values: ['panic'], constant: true },
            batterystatus: { values: ['connected', 'low'], constant: false },
            temperature: { min: 18.5, max: 23.2, type: 'number' }
          },
          sampleMessage: {
            gateway_uuid: gateway.uuid,
            devices: [{
              device_id: 'panic-001',
              values: {
                alarmtype: 'panic',
                batterystatus: 'connected',
                temperature: 21.5
              }
            }]
          }
        },
        {
          id: 'pattern-2',
          hash: 'def456',
          type: 'Status Update',
          count: 576,
          frequency: '~24x pro Stunde',
          commonFields: {
            temperature: { min: 18.0, max: 24.5, type: 'number' },
            humidity: { min: 45, max: 62, type: 'number' }
          },
          sampleMessage: {
            gateway_uuid: gateway.uuid,
            devices: [{
              device_id: 'sensor-001',
              values: {
                temperature: 22.1,
                humidity: 55
              }
            }]
          }
        }
      ]);
    } catch (err) {
      setError('Fehler beim Laden der Nachrichtenmuster: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Generiere Template-Vorschläge
  const generateTemplates = async () => {
    try {
      setLoading(true);
      // TODO: API-Endpunkt implementieren
      // const templates = await gatewayApi.generateTemplates(selectedGateway.id);
      // Simulierte Vorschläge
      setSuggestedTemplates([
        {
          id: 'suggest-1',
          name: 'Panic Button Alarm',
          description: 'Template für Panic-Button-Alarme',
          basedOnPattern: 'pattern-1',
          filterRules: [
            { type: 'ValueComparisonRule', field: 'devices[0].values.alarmtype', value: 'panic' },
            { type: 'FieldExistsRule', field: 'devices[0].values.batterystatus' }
          ],
          priority: 100,
          templateCode: JSON.stringify({
            events: [{
              message: "Panic Button Alarm",
              address: "0",
              namespace: "evalarm.panic",
              device_id: "{{ devices[0].device_id }}",
              battery: "{{ devices[0].values.batterystatus }}"
            }]
          }, null, 2)
        },
        {
          id: 'suggest-2',
          name: 'Sensor Status',
          description: 'Template für Sensor-Statusmeldungen',
          basedOnPattern: 'pattern-2',
          filterRules: [
            { type: 'FieldExistsRule', field: 'devices[0].values.temperature' },
            { type: 'FieldExistsRule', field: 'devices[0].values.humidity' }
          ],
          priority: 50,
          templateCode: JSON.stringify({
            sensorData: {
              device: "{{ devices[0].device_id }}",
              temperature: "{{ devices[0].values.temperature }}",
              humidity: "{{ devices[0].values.humidity }}",
              timestamp: "{{ timestamp }}"
            }
          }, null, 2)
        }
      ]);
      setActiveTab('templates');
    } catch (err) {
      setError('Fehler beim Generieren der Templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Erstelle Template-Gruppe aus Vorschlägen
  const createTemplateGroup = async () => {
    try {
      setLoading(true);
      const groupData = {
        name: `${selectedGateway.name} Template-Gruppe`,
        description: `Automatisch generierte Templates für ${selectedGateway.name}`,
        templates: suggestedTemplates.map((t, index) => ({
          template_id: t.id,
          template_name: t.name,
          priority: t.priority
        }))
      };
      
      // TODO: API-Endpunkt implementieren
      // await templateApi.createGroup(groupData);
      setSuccess('Template-Gruppe erfolgreich erstellt!');
      
      // Navigiere zu Template-Gruppen
      setTimeout(() => {
        navigate('/template-groups');
      }, 2000);
    } catch (err) {
      setError('Fehler beim Erstellen der Template-Gruppe: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Berechne Lernfortschritt
  const calculateProgress = (gateway) => {
    const targetHours = 48;
    const elapsedHours = (Date.now() - gateway.startTime) / (1000 * 60 * 60);
    return Math.min(100, Math.round((elapsedHours / targetHours) * 100));
  };
  
  // Status-Badge rendern
  const renderStatusBadge = (status) => {
    const variants = {
      learning: 'primary',
      completed: 'success',
      error: 'danger',
      paused: 'warning'
    };
    
    const labels = {
      learning: 'Lernend',
      completed: 'Abgeschlossen',
      error: 'Fehler',
      paused: 'Pausiert'
    };
    
    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };
  
  return (
    <PageTemplate
      title="Template-Lernsystem"
      icon={<Brain size={24} />}
      description="Automatisches Lernen und Generieren von Templates basierend auf Gateway-Nachrichten"
    >
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}
      
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="overview" title="Übersicht">
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Gateways im Lernmodus</h5>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => setShowStartLearningModal(true)}
                  >
                    <Play size={16} className="me-1" />
                    Neues Gateway einlernen
                  </Button>
                </Card.Header>
                <Card.Body>
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" />
                    </div>
                  ) : learningGateways.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <Brain size={48} className="mb-3" />
                      <p>Keine Gateways im Lernmodus</p>
                      <Button variant="primary" onClick={() => setShowStartLearningModal(true)}>
                        Lernmodus starten
                      </Button>
                    </div>
                  ) : (
                    <Table hover responsive>
                      <thead>
                        <tr>
                          <th>Gateway</th>
                          <th>Status</th>
                          <th>Fortschritt</th>
                          <th>Nachrichten</th>
                          <th>Muster</th>
                          <th>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {learningGateways.map(gateway => (
                          <tr key={gateway.id} className="cursor-pointer">
                            <td>
                              <div>
                                <strong>{gateway.name}</strong>
                                <br />
                                <small className="text-muted">{gateway.uuid}</small>
                              </div>
                            </td>
                            <td>{renderStatusBadge(gateway.status)}</td>
                            <td>
                              <ProgressBar 
                                now={gateway.progress} 
                                label={`${gateway.progress}%`}
                                variant={gateway.progress === 100 ? 'success' : 'primary'}
                              />
                              <small className="text-muted">
                                Gestartet: {formatDate(gateway.startTime)}
                              </small>
                            </td>
                            <td>
                              <Badge bg="info">{gateway.messageCount}</Badge>
                            </td>
                            <td>
                              <Badge bg="secondary">{gateway.patternCount}</Badge>
                            </td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedGateway(gateway);
                                  loadMessagePatterns(gateway);
                                  setActiveTab('patterns');
                                }}
                              >
                                <Eye size={16} className="me-1" />
                                Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <Clock size={32} className="text-primary mb-2" />
                  <h3>{learningGateways.filter(g => g.status === 'learning').length}</h3>
                  <p className="text-muted mb-0">Aktiv lernend</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <MessageSquare size={32} className="text-info mb-2" />
                  <h3>{learningGateways.reduce((sum, g) => sum + g.messageCount, 0)}</h3>
                  <p className="text-muted mb-0">Gesammelte Nachrichten</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <CheckCircle size={32} className="text-success mb-2" />
                  <h3>{learningGateways.filter(g => g.status === 'completed').length}</h3>
                  <p className="text-muted mb-0">Abgeschlossen</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="patterns" title="Nachrichtenmuster" disabled={!selectedGateway}>
          {selectedGateway && (
            <>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Erkannte Muster für {selectedGateway.name}</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    {messagePatterns.map(pattern => (
                      <Col md={6} key={pattern.id} className="mb-3">
                        <Card>
                          <Card.Header className="d-flex justify-content-between">
                            <span>{pattern.type}</span>
                            <Badge bg="primary">{pattern.count} Nachrichten</Badge>
                          </Card.Header>
                          <Card.Body>
                            <p className="mb-2">
                              <strong>Häufigkeit:</strong> {pattern.frequency}
                            </p>
                            <p className="mb-2">
                              <strong>Erkannte Felder:</strong>
                            </p>
                            <ul className="small">
                              {Object.entries(pattern.commonFields).map(([field, info]) => (
                                <li key={field}>
                                  <code>{field}</code>: 
                                  {info.constant && <Badge bg="success" className="ms-2">Konstant</Badge>}
                                  {info.type === 'number' && <span className="text-muted"> ({info.min} - {info.max})</span>}
                                  {info.values && <span className="text-muted"> [{info.values.join(', ')}]</span>}
                                </li>
                              ))}
                            </ul>
                            <details>
                              <summary className="cursor-pointer text-primary">Beispielnachricht</summary>
                              <div className="mt-2">
                                <JsonView 
                                  data={pattern.sampleMessage} 
                                  shouldExpandNode={() => true}
                                  style={{ container: { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}}
                                />
                              </div>
                            </details>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  
                  {selectedGateway.status === 'completed' && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="success" 
                        onClick={generateTemplates}
                        disabled={loading}
                      >
                        {loading ? (
                          <><Spinner size="sm" className="me-2" />Generiere...</>
                        ) : (
                          <><Layers size={16} className="me-2" />Templates generieren</>
                        )}
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </>
          )}
        </Tab>
        
        <Tab eventKey="templates" title="Template-Vorschläge" disabled={suggestedTemplates.length === 0}>
          {suggestedTemplates.length > 0 && (
            <>
              <Alert variant="info">
                <AlertCircle size={16} className="me-2" />
                Basierend auf den analysierten Nachrichten wurden {suggestedTemplates.length} Templates vorgeschlagen.
                Überprüfen Sie diese und erstellen Sie eine Template-Gruppe.
              </Alert>
              
              <Row>
                {suggestedTemplates.map(template => (
                  <Col md={6} key={template.id} className="mb-4">
                    <Card>
                      <Card.Header className="d-flex justify-content-between">
                        <div>
                          <h6 className="mb-0">{template.name}</h6>
                          <small className="text-muted">{template.description}</small>
                        </div>
                        <Badge bg="secondary">Priorität: {template.priority}</Badge>
                      </Card.Header>
                      <Card.Body>
                        <h6>Filterregeln:</h6>
                        <ul className="small">
                          {template.filterRules.map((rule, idx) => (
                            <li key={idx}>
                              <Badge bg="info" className="me-2">{rule.type}</Badge>
                              <code>{rule.field}</code>
                              {rule.value && <span> = "{rule.value}"</span>}
                            </li>
                          ))}
                        </ul>
                        
                        <h6>Template-Code:</h6>
                        <pre className="bg-light p-2 rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
                          <code>{template.templateCode}</code>
                        </pre>
                        
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowTemplatePreview(true);
                          }}
                        >
                          <Eye size={16} className="me-1" />
                          Vorschau
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              <div className="text-center mt-4">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={createTemplateGroup}
                  disabled={loading}
                >
                  {loading ? (
                    <><Spinner size="sm" className="me-2" />Erstelle...</>
                  ) : (
                    <><Save size={20} className="me-2" />Template-Gruppe erstellen</>
                  )}
                </Button>
              </div>
            </>
          )}
        </Tab>
      </Tabs>
      
      {/* Modal: Lernmodus starten */}
      <Modal show={showStartLearningModal} onHide={() => setShowStartLearningModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Brain size={20} className="me-2" />
            Gateway-Lernmodus starten
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <AlertCircle size={16} className="me-2" />
            Der Lernmodus sammelt 24-48 Stunden lang alle Nachrichten eines Gateways, 
            um Muster zu erkennen und automatisch Templates vorzuschlagen.
          </Alert>
          
          <Form>
            <Form.Group>
              <Form.Label>Gateway auswählen</Form.Label>
              <Form.Select>
                <option>Wählen Sie ein Gateway...</option>
                <option value="gw-003">Neues Test Gateway</option>
                <option value="gw-004">Roombanker Gateway #2</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStartLearningModal(false)}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={() => startLearning('gw-003')}>
            <Play size={16} className="me-2" />
            Lernmodus starten
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal: Template-Vorschau */}
      <Modal 
        show={showTemplatePreview} 
        onHide={() => setShowTemplatePreview(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Template-Vorschau: {selectedTemplate?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTemplate && (
            <>
              <h6>Transformation:</h6>
              <Row>
                <Col md={6}>
                  <p className="text-muted mb-1">Eingabe (Beispiel):</p>
                  <JsonView 
                    data={messagePatterns.find(p => p.id === selectedTemplate.basedOnPattern)?.sampleMessage || {}}
                    shouldExpandNode={() => true}
                    style={{ container: { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}}
                  />
                </Col>
                <Col md={6}>
                  <p className="text-muted mb-1">Ausgabe:</p>
                  <pre className="bg-light p-2 rounded">
                    <code>{selectedTemplate.templateCode}</code>
                  </pre>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTemplatePreview(false)}>
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>
    </PageTemplate>
  );
};

export default TemplateLearning; 