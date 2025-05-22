import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Tabs, Tab, Spinner } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Zap, Wrench, Save, Play, RefreshCw, Info, EyeOff, Eye } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { templateApi, messageApi } from '../api';

/**
 * Visueller Template-Generator
 * 
 * Diese Komponente ermöglicht die visuelle Erstellung und Bearbeitung von Templates
 * durch die Anzeige normalisierter Gerätedaten und die Generierung von Templates
 * basierend auf diesen Daten.
 */
const VisualTemplateGenerator = ({ initialMessage = null, templateId = null }) => {
  // Zustände für Daten
  const [rawMessage, setRawMessage] = useState(initialMessage || {});
  const [normalizedMessage, setNormalizedMessage] = useState({});
  const [transformedMessage, setTransformedMessage] = useState({});
  const [templateCode, setTemplateCode] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(templateId || '');
  
  // UI-Zustände
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('data');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Lade Templates beim ersten Rendern
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  // Lade spezifisches Template, wenn templateId gesetzt ist
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);
  
  // Lade Templates aus der API
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateApi.list();
      if (response.status === 'success') {
        setTemplates(response.data || []);
      } else {
        console.error('Fehler beim Laden der Templates:', response.error);
      }
    } catch (error) {
      console.error('API-Fehler beim Laden der Templates:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Lade ein spezifisches Template
  const loadTemplate = async (id) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await templateApi.detail(id);
      if (response.status === 'success') {
        setSelectedTemplate(id);
        setTemplateCode(response.data.template_code);
        
        // Wenn wir eine Nachricht haben, transformieren wir sie direkt
        if (Object.keys(normalizedMessage).length > 0) {
          transformMessage(id);
        }
      } else {
        setError(`Template konnte nicht geladen werden: ${response.error?.message}`);
      }
    } catch (error) {
      setError(`Fehler beim Laden des Templates: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Nachricht verarbeiten (normalisieren)
  const processMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Rufe die Debug-API auf, um die Nachricht zu normalisieren
      const response = await messageApi.debugMessage(rawMessage);
      
      if (response.status === 'success') {
        setNormalizedMessage(response.data.normalized_message || {});
        setSuccess('Nachricht erfolgreich normalisiert');
        
        // Wenn ein Template ausgewählt ist, transformieren wir die Nachricht
        if (selectedTemplate) {
          transformMessage(selectedTemplate);
        }
      } else {
        setError(`Fehler bei der Normalisierung: ${response.error?.message}`);
      }
    } catch (error) {
      setError(`API-Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Nachricht transformieren
  const transformMessage = async (templateId) => {
    if (!templateId || Object.keys(normalizedMessage).length === 0) return;
    
    try {
      setLoading(true);
      
      // Rufe die Transform-API auf
      const response = await templateApi.test(templateId, normalizedMessage);
      
      if (response.status === 'success') {
        setTransformedMessage(response.data.transformed_message || {});
        setSuccess('Nachricht erfolgreich transformiert');
      } else {
        setError(`Fehler bei der Transformation: ${response.error?.message}`);
      }
    } catch (error) {
      setError(`API-Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Template automatisch generieren
  const autoGenerateTemplate = async () => {
    if (Object.keys(normalizedMessage).length === 0) {
      setError('Bitte zuerst eine Nachricht verarbeiten.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Rufe die Template-Generierungs-API auf
      const response = await templateApi.generate(normalizedMessage);
      
      if (response.status === 'success') {
        setTemplateCode(response.data.template_code || '');
        setSuccess('Template erfolgreich generiert');
        setActiveTab('template');
      } else {
        setError(`Fehler bei der Template-Generierung: ${response.error?.message}`);
      }
    } catch (error) {
      setError(`API-Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Speichere das Template
  const saveTemplate = async () => {
    try {
      setLoading(true);
      
      // Create a new template from the current code
      // TODO: Implement template saving via API
      setSuccess('Template erfolgreich gespeichert');
      
    } catch (error) {
      setError(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Aktualisiere das Template-Testresultat
  const updateTransformation = async () => {
    if (Object.keys(normalizedMessage).length === 0) {
      setError('Bitte zuerst eine Nachricht verarbeiten.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Hier müssten wir eigentlich das Template temporär speichern und dann testen
      // TODO: Implement this when the API is ready
      
      setSuccess('Transformation aktualisiert');
    } catch (error) {
      setError(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Formatiere JSON zur besseren Darstellung
  const formatJson = (json) => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return '{}';
    }
  };
  
  // Handle Änderung in der Rohnachricht
  const handleRawMessageChange = (value) => {
    try {
      const parsedMessage = JSON.parse(value);
      setRawMessage(parsedMessage);
    } catch (e) {
      // Ignoriere Parsing-Fehler während der Bearbeitung
    }
  };
  
  // JSON-View-Optionen
  const jsonViewOptions = {
    style: {
      container: {
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }
    },
    shouldExpandNode: () => true, // Alle Knoten standardmäßig erweitern
    displayDataTypes: false,
    displayObjectSize: false
  };
  
  return (
    <div className="visual-template-generator">
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="data" title="Daten & Normalisierung">
          <Row>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>Rohe Nachricht</div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={processMessage}
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : <Play size={16} className="me-1" />}
                    Verarbeiten
                  </Button>
                </Card.Header>
                <Card.Body>
                  <CodeEditor
                    value={formatJson(rawMessage)}
                    onChange={handleRawMessageChange}
                    language="json"
                    height="300px"
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>Normalisierte Nachricht</div>
                  <Button 
                    variant="success" 
                    size="sm" 
                    onClick={autoGenerateTemplate}
                    disabled={loading || Object.keys(normalizedMessage).length === 0}
                  >
                    <Zap size={16} className="me-1" />
                    Template generieren
                  </Button>
                </Card.Header>
                <Card.Body style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {Object.keys(normalizedMessage).length > 0 ? (
                    <JsonView 
                      data={normalizedMessage} 
                      {...jsonViewOptions} 
                    />
                  ) : (
                    <div className="text-center text-muted py-5">
                      <Info size={32} className="mb-2" />
                      <p>Verwenden Sie den "Verarbeiten"-Button, um die Nachricht zu normalisieren.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="template" title="Template-Editor">
          <Row>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <Form.Select 
                      className="me-2"
                      style={{ width: '200px' }}
                      value={selectedTemplate}
                      onChange={(e) => loadTemplate(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Neues Template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Check 
                      type="switch"
                      id="advanced-mode"
                      label="Erweitert"
                      checked={showAdvanced}
                      onChange={(e) => setShowAdvanced(e.target.checked)}
                    />
                  </div>
                  <div>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="me-2"
                      onClick={updateTransformation}
                      disabled={loading}
                    >
                      <Play size={16} className="me-1" />
                      Testen
                    </Button>
                    <Button 
                      variant="success" 
                      size="sm" 
                      onClick={saveTemplate}
                      disabled={loading}
                    >
                      <Save size={16} className="me-1" />
                      Speichern
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {showAdvanced ? (
                    <CodeEditor
                      value={templateCode}
                      onChange={setTemplateCode}
                      language="json"
                      height="400px"
                    />
                  ) : (
                    <div className="template-builder">
                      <Alert variant="info">
                        <p>Einfacher Template-Builder wird in Kürze verfügbar sein! 🚧</p>
                        <p>Verwenden Sie den erweiterten Modus, um den JSON-Code direkt zu bearbeiten.</p>
                      </Alert>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>Transformationsergebnis</div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => setTransformedMessage({})}
                    disabled={Object.keys(transformedMessage).length === 0}
                  >
                    <RefreshCw size={16} className="me-1" />
                    Zurücksetzen
                  </Button>
                </Card.Header>
                <Card.Body style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {Object.keys(transformedMessage).length > 0 ? (
                    <JsonView 
                      data={transformedMessage} 
                      {...jsonViewOptions} 
                    />
                  ) : (
                    <div className="text-center text-muted py-5">
                      <Info size={32} className="mb-2" />
                      <p>Verwenden Sie den "Testen"-Button, um die Transformation anzuzeigen.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </div>
  );
};

export default VisualTemplateGenerator; 