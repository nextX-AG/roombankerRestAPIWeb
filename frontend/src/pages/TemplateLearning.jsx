import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from './PageTemplate';
import { Row, Col, Card, Button, Badge, ProgressBar, Alert, Form, Table, Tabs, Tab, Modal, Spinner } from 'react-bootstrap';
import { Brain, Play, Pause, CheckCircle, AlertCircle, Clock, MessageSquare, Layers, Save, Eye, Download, Upload } from 'lucide-react';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { gatewayApi, templateApi, learningApi } from '../api';
import { formatDate } from '../utils/formatters';

const TemplateLearning = () => {
  const navigate = useNavigate();
  
  // States
  const [learningGateways, setLearningGateways] = useState([]);
  const [availableGateways, setAvailableGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [selectedGatewayForStart, setSelectedGatewayForStart] = useState('');
  const [learningDuration, setLearningDuration] = useState(48);
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
    fetchAvailableGateways();
  }, []);
  
  // Lade verfügbare Gateways für das Dropdown
  const fetchAvailableGateways = async () => {
    try {
      const response = await gatewayApi.list();
      if (response.status === 'success') {
        setAvailableGateways(response.data || []);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Gateways:', err);
    }
  };
  
  // Lade Learning-Gateways
  const fetchLearningGateways = async () => {
    try {
      setLoading(true);
      const response = await learningApi.list();
      if (response.status === 'success') {
        const sessions = response.data || [];
        
        // Formatiere Sessions als Learning-Gateways für die UI
        const formattedGateways = [];
        for (const session of sessions) {
          try {
            // Hole Gateway-Daten
            const gatewayResponse = await gatewayApi.detail(session.gateway_id);
            const gateway = gatewayResponse.status === 'success' ? gatewayResponse.data : null;
            
            formattedGateways.push({
              id: session.id,
              gateway_id: session.gateway_id,
              name: gateway?.name || `Gateway ${session.gateway_id}`,
              uuid: session.gateway_id,
              status: session.status,
              startTime: new Date(session.start_time),
              endTime: session.end_time ? new Date(session.end_time) : null,
              progress: session.progress,
              messageCount: session.message_count,
              patternCount: session.pattern_count,
              templatesGenerated: session.pattern_count > 0
            });
          } catch (err) {
            console.error(`Fehler beim Laden der Gateway-Daten für ${session.gateway_id}:`, err);
            // Füge Session auch ohne Gateway-Daten hinzu
            formattedGateways.push({
              id: session.id,
              gateway_id: session.gateway_id,
              name: `Gateway ${session.gateway_id}`,
              uuid: session.gateway_id,
              status: session.status,
              startTime: new Date(session.start_time),
              endTime: session.end_time ? new Date(session.end_time) : null,
              progress: session.progress,
              messageCount: session.message_count,
              patternCount: session.pattern_count,
              templatesGenerated: session.pattern_count > 0
            });
          }
        }
        
        setLearningGateways(formattedGateways);
      } else {
        setError('Fehler beim Laden der Learning-Gateways');
      }
    } catch (err) {
      setError('Fehler beim Laden der Learning-Gateways: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Starte Lernmodus für Gateway
  const startLearning = async () => {
    if (!selectedGatewayForStart) {
      setError('Bitte wählen Sie ein Gateway aus');
      return;
    }
    
    try {
      setLoading(true);
      const response = await learningApi.start(selectedGatewayForStart, learningDuration);
      if (response.status === 'success') {
        setSuccess(`Lernmodus erfolgreich gestartet für ${learningDuration} Stunden`);
        setShowStartLearningModal(false);
        setSelectedGatewayForStart('');
        setLearningDuration(48);
        fetchLearningGateways();
      } else {
        setError(response.error?.message || 'Fehler beim Starten des Lernmodus');
      }
    } catch (err) {
      setError('Fehler beim Starten des Lernmodus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Stoppe Lernmodus
  const stopLearning = async (gatewayId) => {
    try {
      const response = await learningApi.stop(gatewayId);
      if (response.status === 'success') {
        setSuccess('Lernmodus erfolgreich gestoppt');
        fetchLearningGateways();
      } else {
        setError(response.error?.message || 'Fehler beim Stoppen des Lernmodus');
      }
    } catch (err) {
      setError('Fehler beim Stoppen des Lernmodus: ' + err.message);
    }
  };
  
  // Lade Nachrichtenmuster für Gateway
  const loadMessagePatterns = async (gateway) => {
    try {
      setLoading(true);
      const response = await learningApi.getPatterns(gateway.gateway_id);
      if (response.status === 'success') {
        setMessagePatterns(response.data || []);
      } else {
        setError('Fehler beim Laden der Nachrichtenmuster');
      }
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
      const response = await learningApi.generateTemplates(selectedGateway.gateway_id);
      if (response.status === 'success') {
        setSuggestedTemplates(response.data || []);
        setActiveTab('templates');
      } else {
        setError(response.error?.message || 'Fehler beim Generieren der Templates');
      }
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
      
      const response = await templateApi.createGroup(groupData);
      if (response.status === 'success') {
        setSuccess('Template-Gruppe erfolgreich erstellt!');
        
        // Navigiere zu Template-Gruppen
        setTimeout(() => {
          navigate('/template-groups');
        }, 2000);
      } else {
        setError(response.error?.message || 'Fehler beim Erstellen der Template-Gruppe');
      }
    } catch (err) {
      setError('Fehler beim Erstellen der Template-Gruppe: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Status-Badge rendern
  const renderStatusBadge = (status) => {
    const variants = {
      learning: 'primary',
      completed: 'success',
      stopped: 'warning',
      error: 'danger'
    };
    
    const labels = {
      learning: 'Lernend',
      completed: 'Abgeschlossen',
      stopped: 'Gestoppt',
      error: 'Fehler'
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
                              <div className="text-muted small mt-1">
                                {gateway.messageCount} Nachrichten gesammelt | {gateway.patternCount} Geräte erkannt
                              </div>
                              {gateway.status === 'learning' && (
                                <Alert variant="info" className="mt-2 mb-0">
                                  <AlertCircle size={14} className="me-1" />
                                  <small>Nachrichten werden nicht an evAlarm weitergeleitet</small>
                                </Alert>
                              )}
                            </td>
                            <td>
                              <Badge bg="info">{gateway.messageCount}</Badge>
                            </td>
                            <td>
                              <Badge bg="secondary">{gateway.patternCount}</Badge>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                {gateway.status === 'learning' && (
                                  <Button
                                    variant="outline-warning"
                                    size="sm"
                                    onClick={() => stopLearning(gateway.gateway_id)}
                                  >
                                    <Pause size={16} className="me-1" />
                                    Stoppen
                                  </Button>
                                )}
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
                              </div>
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
                  {messagePatterns.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <Layers size={48} className="mb-3" />
                      <p>Noch keine Muster erkannt</p>
                      {selectedGateway.status === 'learning' && (
                        <small>Der Lernmodus läuft noch. Bitte warten Sie auf weitere Nachrichten.</small>
                      )}
                    </div>
                  ) : (
                    <>
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
                                  {Object.entries(pattern.common_fields || {}).slice(0, 5).map(([field, info]) => (
                                    <li key={field}>
                                      <code>{field}</code>: 
                                      {info.constant && <Badge bg="success" className="ms-2">Konstant</Badge>}
                                      {info.type === 'number' && <span className="text-muted"> ({info.min} - {info.max})</span>}
                                      {info.values && <span className="text-muted"> [{info.values.slice(0, 3).join(', ')}{info.values.length > 3 && '...'}]</span>}
                                    </li>
                                  ))}
                                  {Object.keys(pattern.common_fields || {}).length > 5 && (
                                    <li className="text-muted">... und {Object.keys(pattern.common_fields).length - 5} weitere Felder</li>
                                  )}
                                </ul>
                                <details>
                                  <summary className="cursor-pointer text-primary">Beispielnachricht anzeigen</summary>
                                  <div className="mt-2">
                                    <JsonView 
                                      data={pattern.sample_message || {}} 
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
                    </>
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
                          {template.filter_rules.map((rule, idx) => (
                            <li key={idx}>
                              <Badge bg="info" className="me-2">{rule.type}</Badge>
                              <code>{rule.field}</code>
                              {rule.value && <span> = "{rule.value}"</span>}
                            </li>
                          ))}
                        </ul>
                        
                        <h6>Template-Code:</h6>
                        <pre className="bg-light p-2 rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
                          <code>{template.template_code}</code>
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
            Der Lernmodus sammelt Nachrichten eines Gateways über einen festgelegten Zeitraum, 
            um Muster zu erkennen und automatisch Templates vorzuschlagen.
          </Alert>
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Gateway auswählen</Form.Label>
              <Form.Select
                value={selectedGatewayForStart}
                onChange={(e) => setSelectedGatewayForStart(e.target.value)}
              >
                <option value="">Wählen Sie ein Gateway...</option>
                {availableGateways.map(gateway => (
                  <option key={gateway.uuid} value={gateway.uuid}>
                    {gateway.name || gateway.uuid}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group>
              <Form.Label>Lernzeit (Stunden)</Form.Label>
              <div className="d-flex align-items-center">
                <Form.Range
                  min="1"
                  max="168"
                  step="1"
                  value={learningDuration}
                  onChange={(e) => setLearningDuration(parseInt(e.target.value))}
                  className="me-3"
                />
                <div style={{ minWidth: '120px' }}>
                  <strong>{learningDuration} Stunden</strong>
                  <br />
                  <small className="text-muted">
                    ({Math.floor(learningDuration / 24)} Tage {learningDuration % 24} Std.)
                  </small>
                </div>
              </div>
              <Form.Text className="text-muted">
                Empfohlen: 24-48 Stunden für aussagekräftige Muster
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStartLearningModal(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="primary" 
            onClick={startLearning}
            disabled={!selectedGatewayForStart || loading}
          >
            {loading ? (
              <><Spinner size="sm" className="me-2" />Starte...</>
            ) : (
              <><Play size={16} className="me-2" />Lernmodus starten</>
            )}
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
                    data={messagePatterns.find(p => p.id === selectedTemplate.based_on_pattern)?.sample_message || {}}
                    shouldExpandNode={() => true}
                    style={{ container: { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}}
                  />
                </Col>
                <Col md={6}>
                  <p className="text-muted mb-1">Ausgabe:</p>
                  <pre className="bg-light p-2 rounded">
                    <code>{selectedTemplate.template_code}</code>
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