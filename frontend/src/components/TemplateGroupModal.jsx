import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, ListGroup, Badge, Row, Col } from 'react-bootstrap';
import { Plus, X, GripVertical } from 'lucide-react';
import { templateApi } from '../api';

const TemplateGroupModal = ({ show, onHide, group = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    templates: []
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [priority, setPriority] = useState(50);

  // Lade verfügbare Templates beim Öffnen
  useEffect(() => {
    if (show) {
      loadTemplates();
      
      // Wenn eine Gruppe bearbeitet wird, lade ihre Daten
      if (group) {
        setFormData({
          name: group.name || '',
          description: group.description || '',
          templates: group.templates || []
        });
      } else {
        // Reset für neue Gruppe
        setFormData({
          name: '',
          description: '',
          templates: []
        });
      }
    }
  }, [show, group]);

  const loadTemplates = async () => {
    try {
      const response = await templateApi.list();
      if (response.status === 'success') {
        setTemplates(response.data || []);
      }
    } catch (err) {
      setError('Fehler beim Laden der Templates');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addTemplate = () => {
    if (!selectedTemplate) return;

    // Prüfe, ob Template bereits in der Gruppe ist
    const exists = formData.templates.some(t => t.template_id === selectedTemplate);
    if (exists) {
      setError('Dieses Template ist bereits in der Gruppe');
      return;
    }

    // Finde das Template-Objekt
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    // Füge Template zur Gruppe hinzu
    setFormData(prev => ({
      ...prev,
      templates: [
        ...prev.templates,
        {
          template_id: selectedTemplate,
          template_name: template.name,
          priority: parseInt(priority)
        }
      ].sort((a, b) => b.priority - a.priority) // Sortiere nach Priorität
    }));

    // Reset
    setSelectedTemplate('');
    setPriority(50);
    setError(null);
  };

  const removeTemplate = (templateId) => {
    setFormData(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.template_id !== templateId)
    }));
  };

  const updatePriority = (templateId, newPriority) => {
    setFormData(prev => ({
      ...prev,
      templates: prev.templates
        .map(t => t.template_id === templateId ? { ...t, priority: parseInt(newPriority) } : t)
        .sort((a, b) => b.priority - a.priority)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      setError('Name ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (group) {
        // Gruppe aktualisieren
        await templateApi.updateGroup(group.id, formData);
      } else {
        // Neue Gruppe erstellen
        await templateApi.createGroup(formData);
      }
      
      onHide(); // Modal schließen und Parent-Komponente wird refreshen
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern der Template-Gruppe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {group ? 'Template-Gruppe bearbeiten' : 'Neue Template-Gruppe'}
        </Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label>Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="z.B. Roombanker Panic System"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Beschreibung</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Beschreiben Sie den Zweck dieser Template-Gruppe"
            />
          </Form.Group>

          <hr />

          <h6>Templates in dieser Gruppe</h6>
          <p className="text-muted small">
            Templates werden nach Priorität sortiert. Das Template mit der höchsten Priorität, 
            dessen Filterregeln zutreffen, wird verwendet.
          </p>

          {formData.templates.length > 0 ? (
            <ListGroup className="mb-3">
              {formData.templates.map((template) => (
                <ListGroup.Item key={template.template_id} className="d-flex align-items-center">
                  <GripVertical size={16} className="text-muted me-2" />
                  <div className="flex-grow-1">
                    <strong>{template.template_name || template.template_id}</strong>
                    <div className="d-flex align-items-center mt-1">
                      <span className="text-muted small me-2">Priorität:</span>
                      <Form.Control
                        type="number"
                        size="sm"
                        style={{ width: '80px' }}
                        value={template.priority}
                        onChange={(e) => updatePriority(template.template_id, e.target.value)}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeTemplate(template.template_id)}
                  >
                    <X size={14} />
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <Alert variant="info">
              Noch keine Templates in dieser Gruppe. Fügen Sie Templates hinzu.
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Template hinzufügen</Form.Label>
                <Form.Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Template auswählen...</option>
                  {templates
                    .filter(t => !formData.templates.some(gt => gt.template_id === t.id))
                    .map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Priorität</Form.Label>
                <Form.Control
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min="0"
                  max="100"
                />
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button 
                variant="success" 
                onClick={addTemplate}
                disabled={!selectedTemplate}
                className="w-100"
              >
                <Plus size={16} className="me-1" />
                Hinzufügen
              </Button>
            </Col>
          </Row>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Abbrechen
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default TemplateGroupModal; 