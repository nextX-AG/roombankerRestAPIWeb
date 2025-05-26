import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Tabs, Tab, Spinner, Modal } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Zap, Wrench, Save, Play, RefreshCw, Info, EyeOff, Eye, ExternalLink, Layers } from 'lucide-react';
import CodeEditor from './CodeEditor';
import TemplateBuilder from './TemplateBuilder';
import TransformationResultDrawer from './TransformationResultDrawer';
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
  const [filterRules, setFilterRules] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(templateId || '');
  const [templateGroups, setTemplateGroups] = useState([]);
  const [selectedTemplateGroup, setSelectedTemplateGroup] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  
  // UI-Zustände
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('data');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResultDrawer, setShowResultDrawer] = useState(false);
  
  // Lade Templates und Filterregeln beim ersten Rendern
  useEffect(() => {
    fetchTemplates();
    fetchFilterRules();
    fetchTemplateGroups();
  }, []);
  
  // Lade spezifisches Template, wenn templateId gesetzt ist
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);
  
  // Automatisch den Ergebnis-Drawer öffnen, wenn ein Transformationsergebnis vorliegt
  useEffect(() => {
    if (Object.keys(transformedMessage).length > 0) {
      setShowResultDrawer(true);
    }
  }, [transformedMessage]);
  
  // Verarbeite initialMessage automatisch, wenn sie vorhanden ist
  useEffect(() => {
    if (initialMessage && Object.keys(initialMessage).length > 0) {
      console.log("Verarbeite übergebene Nachricht:", initialMessage);
      setRawMessage(initialMessage);
      // processMessage direkt aufzurufen wäre gefährlich wegen Infinite Loop
      // Stattdessen einmalig nach einem Render verarbeiten
      const timer = setTimeout(() => {
        processMessage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialMessage]);
  
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
  
  // Lade Filterregeln aus der API
  const fetchFilterRules = async () => {
    try {
      setLoading(true);
      const response = await templateApi.getFilterRules();
      if (response.status === 'success') {
        setFilterRules(response.data || []);
      } else {
        console.warn('Filterregeln konnten nicht geladen werden:', response.error);
        // Setze Standard-Filterregeln aus TemplateBuilder, wenn API-Aufruf fehlschlägt
      }
    } catch (error) {
      console.error('API-Fehler beim Laden der Filterregeln:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Lade Template-Gruppen aus der API
  const fetchTemplateGroups = async () => {
    try {
      const response = await templateApi.listGroups();
      if (response.status === 'success') {
        setTemplateGroups(response.data || []);
      } else {
        console.warn('Template-Gruppen konnten nicht geladen werden:', response.error);
      }
    } catch (error) {
      console.error('API-Fehler beim Laden der Template-Gruppen:', error);
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
        // Drawer automatisch öffnen mit dem Ergebnis
        setShowResultDrawer(true);
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
  const saveTemplate = () => {
    // Öffne das Speichern-Modal
    setShowSaveModal(true);
  };
  
  // Führe das tatsächliche Speichern durch
  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      
      // Erstellung eines neuen Templates
      const response = await templateApi.create({
        name: templateName || 'Neues Template',
        description: templateDescription || 'Erstelltes Template',
        template_code: templateCode,
        provider_type: 'evalarm' // Standard-Provider
      });
      
      if (response.status === 'success') {
        const newTemplateId = response.data.id;
        
        // Wenn eine Template-Gruppe ausgewählt wurde, füge das Template zur Gruppe hinzu
        if (selectedTemplateGroup && newTemplateId) {
          try {
            // Finde die ausgewählte Gruppe
            const group = templateGroups.find(g => g.id === selectedTemplateGroup);
            if (group) {
              // Füge das neue Template zur Gruppe hinzu
              const updatedTemplates = [...group.templates, {
                template_id: newTemplateId,
                template_name: templateName,
                priority: 50 // Standard-Priorität
              }];
              
              await templateApi.updateGroup(selectedTemplateGroup, {
                ...group,
                templates: updatedTemplates
              });
            }
          } catch (groupError) {
            console.error('Fehler beim Hinzufügen zur Template-Gruppe:', groupError);
            // Zeige trotzdem Erfolg an, da das Template gespeichert wurde
          }
        }
        
        setSuccess('Template erfolgreich gespeichert');
        // Templates neu laden und das neue Template auswählen
        await fetchTemplates();
        setSelectedTemplate(newTemplateId);
        
        // Modal schließen und Felder zurücksetzen
        setShowSaveModal(false);
        setTemplateName('');
        setTemplateDescription('');
        setSelectedTemplateGroup('');
      } else {
        setError(`Fehler beim Speichern: ${response.error?.message}`);
      }
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
      
      // Teste den aktuellen Template-Code
      const response = await templateApi.testCode(templateCode, normalizedMessage);
      
      if (response.status === 'success') {
        setTransformedMessage(response.data.transformed_message || {});
        setSuccess('Transformation aktualisiert');
        // Drawer automatisch öffnen mit dem Ergebnis
        setShowResultDrawer(true);
      } else {
        setError(`Fehler bei der Transformation: ${response.error?.message}`);
      }
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

  // Handle Änderung im Template-Code (vom Builder oder Editor)
  const handleTemplateCodeChange = (code) => {
    setTemplateCode(code);
  };
  
  // Transformationsergebnis zurücksetzen
  const resetTransformationResult = () => {
    setTransformedMessage({});
    setShowResultDrawer(false);
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
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => window.open('/template-groups', '_blank')}
                >
                  <Layers size={16} className="me-1" />
                  Gruppen verwalten
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => setShowResultDrawer(true)}
                  disabled={Object.keys(transformedMessage).length === 0}
                >
                  <ExternalLink size={16} className="me-1" />
                  Ergebnis anzeigen
                </Button>
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
                  onChange={handleTemplateCodeChange}
                  language="json"
                  height="600px"
                />
              ) : (
                <TemplateBuilder 
                  normalizedMessage={normalizedMessage}
                  templateCode={templateCode}
                  onChange={handleTemplateCodeChange}
                  filterRules={filterRules}
                />
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Drawer für Transformationsergebnis */}
      <TransformationResultDrawer
        show={showResultDrawer}
        onClose={() => setShowResultDrawer(false)}
        transformedMessage={transformedMessage}
        onReset={resetTransformationResult}
        loading={loading}
      />
      
      {/* Modal für Template speichern */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Save size={20} className="me-2" />
            Template speichern
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Template-Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="z.B. evAlarm Panic Button"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Beschreibung</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Beschreiben Sie, wofür dieses Template verwendet wird..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>
                <Layers size={16} className="me-1" />
                Template-Gruppe (optional)
              </Form.Label>
              <Form.Select
                value={selectedTemplateGroup}
                onChange={(e) => setSelectedTemplateGroup(e.target.value)}
              >
                <option value="">Keine Gruppe zuweisen</option>
                {templateGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.templates?.length || 0} Templates)
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Wählen Sie eine Template-Gruppe aus, um dieses Template automatisch für bestimmte Gerätetypen verfügbar zu machen.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveModal(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveTemplate}
            disabled={loading || !templateName.trim()}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Speichern...
              </>
            ) : (
              <>
                <Save size={16} className="me-2" />
                Speichern
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default VisualTemplateGenerator; 