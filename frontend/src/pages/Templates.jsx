import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, ListGroup, Tab, Tabs, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlus, faTrash, faInfoCircle, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import SimpleCodeEditor from '../components/CodeEditor';
import config, { API_VERSION } from '../config';

// Verwende die konfigurierte API-URL mit Version
const API_URL = `${config.apiBaseUrl}/${API_VERSION}`;

/**
 * Template-Verwaltungskomponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tempName, setTempName] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [testMessage, setTestMessage] = useState({
    gateway_id: "gw-123456789",
    subdevicelist: [
      {
        id: "65553114291823",
        values: {
          alarmstatus: "alarm",
          alarmtype: "panic"
        },
        ts: 1744737709
      }
    ]
  });
  const [transformedMessage, setTransformedMessage] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newTemplate, setNewTemplate] = useState(false);
  const [providerType, setProviderType] = useState('generic');
  const [isEditing, setIsEditing] = useState(false);

  // Hersteller-Typen für Template-Regeln
  const providers = [
    { id: 'generic', name: 'Generisch - Standard' },
    { id: 'evalarm', name: 'evAlarm - Notfallalarmierung' },
    { id: 'roombanker', name: 'Roombanker - Smart Home' },
    { id: 'becker-antriebe', name: 'Becker-Antriebe - Gebäudeautomation' }
  ];

  // Template-Beispiele/Hilfen für verschiedene Provider
  const templateHelpers = {
    generic: {
      template: `{
  "message": "{{gateway_id}} hat eine Nachricht gesendet",
  "timestamp": "{{timestamp}}",
  "content": {{_full_message_}}
}`,
      description: 'Generisches Template mit minimaler Transformation'
    },
    evalarm: {
      template: `{
  "provider": "evalarm",
  "event_type": "{{subdevicelist[0].values.alarmtype}}",
  "status": "{{subdevicelist[0].values.alarmstatus}}",
  "device_id": "{{subdevicelist[0].id}}",
  "gateway_id": "{{gateway_id}}",
  "timestamp": "{{subdevicelist[0].ts}}",
  "priority": "high"
}`,
      description: 'Template für evAlarm-Notfallsysteme mit Standardfeldern für die Alarmierung'
    },
    'roombanker': {
      template: `{
  "provider": "roombanker",
  "device_type": "{{#subdevicelist[0].values.alarmtype == 'panic' ? 'panic_button' : 'sensor'}}",
  "sensor_id": "{{subdevicelist[0].id}}",
  "gateway": "{{gateway_id}}",
  "status": "{{subdevicelist[0].values.alarmstatus}}",
  "timestamp": "{{subdevicelist[0].ts}}",
  "raw_data": {{_full_message_}}
}`,
      description: 'Template für Roombanker Smart Home Geräte mit Gerätetyperkennung'
    },
    'becker-antriebe': {
      template: `{
  "provider": "becker",
  "controller_id": "{{gateway_id}}",
  "device_data": {
    "id": "{{subdevicelist[0].id}}",
    "status": "{{subdevicelist[0].values.status}}",
    "position": {{subdevicelist[0].values.position || 0}},
    "signal": {{subdevicelist[0].values.signal || 0}}
  },
  "timestamp": "{{subdevicelist[0].ts}}"
}`,
      description: 'Template für Becker-Antriebe Steuerungen mit Positionsangaben'
    }
  };

  // Templates laden
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setError(null);
        const response = await axios.get(`${API_URL}/templates`);
        const templatesList = response.data?.data || [];
        setTemplates(Array.isArray(templatesList) ? templatesList : []);
        if (templatesList.length > 0) {
          setSelectedTemplate(templatesList[0]);
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Templates:', error);
        setError('Fehler beim Laden der Templates: ' + (error.response?.data?.message || error.message));
        setTemplates([]);
      }
    };

    fetchTemplates();
  }, []);

  // Template-Inhalt laden, wenn ein Template ausgewählt wird
  useEffect(() => {
    const fetchTemplateContent = async () => {
      if (!selectedTemplate) return;
      
      try {
        // In einer echten Anwendung würde hier der Template-Inhalt vom Server abgerufen werden
        // Für die Demo verwenden wir Beispiel-Templates
        if (selectedTemplate === 'evalarm') {
          setTemplateCode(JSON.stringify({
            "events": [
              {
                "message": "Alarm Knopf",
                "address": "0",
                "namespace": "eva.herford",
                "id": "{{ uuid }}",
                "device_id": "{{ device_id }}"
              }
            ]
          }, null, 2));
        } else if (selectedTemplate === 'standard') {
          setTemplateCode(JSON.stringify({
            "alert": true,
            "type": "{{ alarm_type }}",
            "source": "{{ gateway_id }}",
            "device": "{{ device_id }}",
            "timestamp": "{{ ts }}"
          }, null, 2));
        }
      } catch (err) {
        console.error('Fehler beim Abrufen des Template-Inhalts:', err);
      }
    };

    fetchTemplateContent();
  }, [selectedTemplate]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateCode(template.template_code);
    setTempName(template.name);
    setProviderType(template.provider_type || 'generic');
    setNewTemplate(false);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    const defaultProvider = 'generic';
    setTemplateCode(templateHelpers[defaultProvider].template);
    setTempName('');
    setProviderType(defaultProvider);
    setNewTemplate(true);
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!tempName.trim()) {
        setError('Template-Name darf nicht leer sein');
        return;
      }

      const templateData = {
        name: tempName,
        template_code: templateCode,
        provider_type: providerType
      };

      let response;
      if (newTemplate) {
        // Neues Template erstellen
        response = await axios.post(`${API_URL}/templates`, templateData);
        if (response.data?.status === 'success') {
          const newTemplateData = response.data?.data;
          setTemplates([...templates, newTemplateData]);
          setSelectedTemplate(newTemplateData);
          setSuccess('Template erfolgreich erstellt');
        } else {
          throw new Error('Template konnte nicht erstellt werden');
        }
      } else {
        // Bestehendes Template aktualisieren
        response = await axios.put(`${API_URL}/templates/${selectedTemplate.id}`, templateData);
        if (response.data?.status === 'success') {
          const updatedTemplateData = response.data?.data;
          setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplateData : t));
          setSelectedTemplate(updatedTemplateData);
          setSuccess('Template erfolgreich aktualisiert');
        } else {
          throw new Error('Template konnte nicht aktualisiert werden');
        }
      }
      setIsEditing(false);
      setNewTemplate(false);
    } catch (error) {
      console.error('Fehler beim Speichern des Templates:', error);
      setError('Fehler beim Speichern: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await axios.delete(`${API_URL}/templates/${selectedTemplate.id}`);
      if (response.data?.status === 'success') {
        setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
        setSelectedTemplate(templates[0] || null);
        setSuccess('Template erfolgreich gelöscht');
      } else {
        throw new Error('Template konnte nicht gelöscht werden');
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Templates:', error);
      setError('Fehler beim Löschen: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    if (newTemplate) {
      setSelectedTemplate(null);
      setTemplateCode('');
      setTempName('');
    } else {
      setTemplateCode(selectedTemplate.template_code);
      setTempName(selectedTemplate.name);
      setProviderType(selectedTemplate.provider_type || 'generic');
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    setProviderType(newProvider);
    
    // Wenn im Bearbeitungsmodus und der Nutzer bestätigt, Template-Code aktualisieren
    if (isEditing && templateHelpers[newProvider]) {
      if (window.confirm('Möchten Sie das Template mit dem Beispiel für diesen Anbieter ersetzen?')) {
        setTemplateCode(templateHelpers[newProvider].template);
      }
    }
  };

  const handleTestMessageChange = (e) => {
    try {
      setTestMessage(JSON.parse(e.target.value));
      setError(null);
    } catch (err) {
      setError('Ungültiges JSON in der Testnachricht');
    }
  };

  const handleTestTransform = async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await axios.post(`${API_URL}/templates/${selectedTemplate.id}/test`, {
        message: testMessage
      });
      
      if (response.data?.status === 'success') {
        setTransformedMessage(response.data?.data);
        setError(null);
      } else {
        throw new Error('Transformation fehlgeschlagen');
      }
    } catch (error) {
      console.error('Fehler bei der Transformation:', error);
      setError('Fehler bei der Transformation: ' + (error.response?.data?.message || error.message));
      setTransformedMessage(null);
    }
  };

  const useTemplateHelper = (providerId) => {
    if (templateHelpers[providerId] && window.confirm(`Möchten Sie das Beispiel-Template für ${providerId} verwenden?`)) {
      setTemplateCode(templateHelpers[providerId].template);
    }
  };

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <FontAwesomeIcon icon={faFileAlt} className="icon" />
        Templates
      </h1>
      
      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}
      
      {/* 3. Inhalt in Karten */}
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Template-Liste</span>
              <Button variant="primary" size="sm" onClick={handleCreateTemplate}>
                <FontAwesomeIcon icon={faPlus} className="me-1" /> Neu
              </Button>
            </Card.Header>
            <Card.Body>
              <Tabs defaultActiveKey="all" className="mb-3">
                <Tab eventKey="all" title="Alle">
                  <ListGroup>
                    {templates.map(template => (
                      <ListGroup.Item 
                        key={template.id}
                        active={selectedTemplate?.id === template.id}
                        action
                        onClick={() => handleSelectTemplate(template)}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>{template.name}</strong>
                          {template.provider_type && (
                            <span className="ms-2 badge bg-info">
                              {providers.find(p => p.id === template.provider_type)?.name || template.provider_type}
                            </span>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Tab>
                {providers.map(provider => (
                  <Tab key={provider.id} eventKey={provider.id} title={provider.name.split(' - ')[0]}>
                    <ListGroup>
                      {templates
                        .filter(t => t.provider_type === provider.id)
                        .map(template => (
                          <ListGroup.Item 
                            key={template.id}
                            active={selectedTemplate?.id === template.id}
                            action
                            onClick={() => handleSelectTemplate(template)}
                          >
                            {template.name}
                          </ListGroup.Item>
                    ))}
                    </ListGroup>
                    {templates.filter(t => t.provider_type === provider.id).length === 0 && (
                      <Alert variant="info" className="mt-3">
                        Keine Templates für diesen Anbieter vorhanden.
                      </Alert>
              )}
                  </Tab>
                ))}
              </Tabs>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>
              Template {isEditing ? 'bearbeiten' : 'Details'}
            </Card.Header>
            <Card.Body>
              {(selectedTemplate || newTemplate) ? (
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Template-Name</Form.Label>
                  <Form.Control
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Anbieter-Typ</Form.Label>
                    <Form.Select
                      value={providerType}
                      onChange={handleProviderChange}
                      disabled={!isEditing}
                    >
                      {providers.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </Form.Select>
                    {isEditing && templateHelpers[providerType] && (
                      <div className="mt-2">
                        <Alert variant="info">
                          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                          {templateHelpers[providerType].description}
                          <div className="mt-2">
                            <Button 
                              size="sm" 
                              variant="outline-primary" 
                              onClick={() => useTemplateHelper(providerType)}
                            >
                              Beispiel-Template verwenden
                            </Button>
                          </div>
                        </Alert>
                      </div>
                    )}
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Template-Code</Form.Label>
                    <SimpleCodeEditor
                      value={templateCode}
                      onChange={setTemplateCode}
                      readOnly={!isEditing}
                      language="json"
                      height="300px"
                  />
                  <Form.Text className="text-muted">
                    Dieses Template wird verwendet, um Nachrichten zu transformieren.
                      Platzhalter wie {'{{'} variable {'}}'}  werden durch Werte aus der Nachricht ersetzt.
                  </Form.Text>
                </Form.Group>
                  
                  <div className="d-flex justify-content-between">
                    {isEditing ? (
                      <>
                        <Button variant="secondary" onClick={handleCancel}>
                          Abbrechen
                        </Button>
                        <Button variant="primary" onClick={handleSaveTemplate}>
                          <FontAwesomeIcon icon={faSave} className="me-2" />
                          Speichern
                        </Button>
                      </>
                    ) : selectedTemplate ? (
                      <>
                        <Button variant="danger" onClick={handleDeleteTemplate}>
                          <FontAwesomeIcon icon={faTrash} className="me-2" />
                          Löschen
                        </Button>
                        <Button variant="primary" onClick={handleEditClick}>
                          Bearbeiten
                        </Button>
                      </>
                    ) : null}
                  </div>
                </Form>
              ) : (
                <p>Kein Template ausgewählt.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              Test-Transformation
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Hier können Sie testen, wie eine Nachricht mit dem ausgewählten Template transformiert wird.
                Die Gateway-ID, Geräte-IDs und Nachrichteninhalte können angepasst werden, 
                aber die Grundstruktur sollte dem Anbieterformat entsprechen.
              </Alert>
              
              <Tabs defaultActiveKey="editor" className="mb-3">
                <Tab eventKey="editor" title="JSON-Editor">
                  <Form.Group className="mb-3">
                    <Form.Label>Test-Nachricht (JSON)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={10}
                      value={JSON.stringify(testMessage, null, 2)}
                      onChange={handleTestMessageChange}
                      className="font-monospace"
                    />
                  </Form.Group>
                </Tab>
                <Tab eventKey="preview" title="Vorschau">
                  <div className="border p-3 rounded bg-light mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <JsonView data={testMessage} />
                  </div>
                </Tab>
              </Tabs>
              
              <div className="d-grid">
                <Button 
                  variant="primary" 
                  onClick={handleTestTransform}
                  disabled={!selectedTemplate}
                >
                  Transformation testen
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>
              Transformationsergebnis
            </Card.Header>
            <Card.Body>
              {transformedMessage ? (
                <div className="border p-3 rounded bg-light" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <JsonView data={transformedMessage} />
                </div>
              ) : (
                <p>Führen Sie eine Test-Transformation durch, um das Ergebnis zu sehen.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              Template-Richtlinien
            </Card.Header>
            <Card.Body>
              <h5>Verwendung von Templates</h5>
              <p>
                Templates werden verwendet, um Nachrichten von IoT-Geräten in ein standardisiertes Format umzuwandeln.
                Jedes Template ist einem bestimmten Anbieter (z.B. evAlarm, Roombanker) zugeordnet und verarbeitet dessen spezifisches Nachrichtenformat.
              </p>
              
              <h5>Template-Struktur</h5>
              <ul>
                <li><strong>Anbieter-Typ:</strong> Definiert das Grundformat und die Verarbeitungsregeln für einen bestimmten Geräteanbieter</li>
                <li><strong>Variablen:</strong> Dynamische Werte wie Gateway-ID, Geräte-ID oder Sensordaten</li>
                <li><strong>Platzhalter-Syntax:</strong> Verwenden Sie {'{{'} variable {'}}'}  um Werte aus der Nachricht einzufügen</li>
              </ul>
              
              <h5>Best Practices</h5>
              <ul>
                <li>Behalten Sie die Grundstruktur des Anbieters bei, passen Sie nur die variablen Teile an</li>
                <li>Fügen Sie immer die Gateway-ID und einen Zeitstempel hinzu</li>
                <li>Verwenden Sie den <code>provider</code>-Schlüssel, um den Anbieter zu identifizieren</li>
                <li>Für komplexere Transformationen können bedingte Ausdrücke verwendet werden: <code>{'{{'} #bedingung ? wahr : falsch {'}}'}</code></li>
              </ul>
              
              <h5>Variablenpfade in der Nachricht</h5>
              <table className="table table-bordered table-sm">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Beschreibung</th>
                    <th>Beispiel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>gateway_id</code></td>
                    <td>ID des Gateways</td>
                    <td><code>{'{{'} gateway_id {'}}'}</code></td>
                  </tr>
                  <tr>
                    <td><code>subdevicelist[0].id</code></td>
                    <td>ID des ersten Geräts in der Liste</td>
                    <td><code>{'{{'} subdevicelist[0].id {'}}'}</code></td>
                  </tr>
                  <tr>
                    <td><code>subdevicelist[0].values.alarmtype</code></td>
                    <td>Alarmtyp des ersten Geräts</td>
                    <td><code>{'{{'} subdevicelist[0].values.alarmtype {'}}'}</code></td>
                  </tr>
                  <tr>
                    <td><code>subdevicelist[0].ts</code></td>
                    <td>Zeitstempel des ersten Geräts</td>
                    <td><code>{'{{'} subdevicelist[0].ts {'}}'}</code></td>
                  </tr>
                  <tr>
                    <td><code>_full_message_</code></td>
                    <td>Gesamte Nachricht als JSON</td>
                    <td><code>{'{{'} _full_message_ {'}}'}</code></td>
                  </tr>
                </tbody>
              </table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Templates;
