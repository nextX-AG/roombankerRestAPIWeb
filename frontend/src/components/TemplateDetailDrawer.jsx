import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import { Form, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { FileCode, Save, Copy, ArrowLeft, PlayCircle, Trash, Edit } from 'lucide-react';
import SimpleCodeEditor from './CodeEditor';
import axios from 'axios';
import config, { API_VERSION } from '../config';

// API-URL-Konfiguration
const API_URL = `${config.apiBaseUrl}/${API_VERSION}`;

/**
 * TemplateDetailDrawer - Zeigt Details eines ausgewählten Templates in einem Drawer an
 * Diese Komponente wird durch die Route /templates/:id geladen
 */
const TemplateDetailDrawer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Zustandsvariablen
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [providerType, setProviderType] = useState('generic');
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
  const [testLoading, setTestLoading] = useState(false);

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

  // Lade das Template beim ersten Rendern
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) return;
      
      // Wenn die ID "new" ist, handelt es sich um ein neues Template
      if (id === 'new') {
        setTemplate(null);
        setTemplateName('');
        setTemplateCode(templateHelpers.generic.template);
        setProviderType('generic');
        setIsEditing(true);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/templates/${id}`);
        
        if (response.data?.status === 'success' && response.data?.data) {
          const templateData = response.data.data;
          setTemplate(templateData);
          setTemplateName(templateData.name);
          setTemplateCode(templateData.template_code);
          setProviderType(templateData.provider_type || 'generic');
        } else {
          throw new Error(response.data?.error?.message || 'Fehler beim Laden des Templates');
        }
      } catch (error) {
        console.error('Fehler beim Laden des Template-Details:', error);
        setError('Template konnte nicht geladen werden: ' + (error.response?.data?.error?.message || error.message));
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplate();
  }, [id]);

  // Bearbeitungsmodus aktivieren
  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };
  
  // Bearbeitungsmodus abbrechen
  const handleCancel = () => {
    // Wenn es ein neues Template ist, zurück zur Übersicht
    if (id === 'new') {
      navigate('/templates');
      return;
    }
    
    setTemplateName(template.name);
    setTemplateCode(template.template_code);
    setProviderType(template.provider_type || 'generic');
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };
  
  // Template speichern
  const handleSaveTemplate = async () => {
    try {
      if (!templateName.trim()) {
        setError('Template-Name darf nicht leer sein');
        return;
      }

      const templateData = {
        name: templateName,
        template_code: templateCode,
        provider_type: providerType
      };

      let response;
      
      // Wenn die ID "new" ist, erstellen wir ein neues Template
      if (id === 'new') {
        response = await axios.post(`${API_URL}/templates`, templateData);
        
        if (response.data?.status === 'success') {
          const newTemplateData = response.data?.data;
          setSuccess('Template erfolgreich erstellt');
          // Navigiere zum neuen Template mit der korrekten ID
          navigate(`/templates/${newTemplateData.id}`, { replace: true });
        } else {
          throw new Error(response.data?.error?.message || 'Template konnte nicht erstellt werden');
        }
      } else {
        // Bestehendes Template aktualisieren
        response = await axios.put(`${API_URL}/templates/${id}`, templateData);
        
        if (response.data?.status === 'success') {
          const updatedTemplateData = response.data?.data;
          setTemplate(updatedTemplateData);
          setTemplateName(updatedTemplateData.name);
          setTemplateCode(updatedTemplateData.template_code);
          setProviderType(updatedTemplateData.provider_type || 'generic');
          setSuccess('Template erfolgreich aktualisiert');
          setIsEditing(false);
        } else {
          throw new Error(response.data?.error?.message || 'Template konnte nicht aktualisiert werden');
        }
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Templates:', error);
      setError('Fehler beim Speichern: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  // Template löschen
  const handleDeleteTemplate = async () => {
    if (window.confirm('Möchten Sie dieses Template wirklich löschen?')) {
      try {
        const response = await axios.delete(`${API_URL}/templates/${id}`);
        
        if (response.data?.status === 'success') {
          navigate('/templates');
        } else {
          throw new Error(response.data?.error?.message || 'Template konnte nicht gelöscht werden');
        }
      } catch (error) {
        console.error('Fehler beim Löschen des Templates:', error);
        setError('Fehler beim Löschen: ' + (error.response?.data?.error?.message || error.message));
      }
    }
  };

  // Provider-Typ ändern
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

  // Testnachricht ändern
  const handleTestMessageChange = (value) => {
    try {
      if (typeof value === 'string') {
        setTestMessage(JSON.parse(value));
      } else {
        setTestMessage(value);
      }
      setError(null);
    } catch (err) {
      setError('Ungültiges JSON in der Testnachricht');
    }
  };

  // Template testen
  const handleTestTransform = async () => {
    setTestLoading(true);
    try {
      // Bei einem neuen Template können wir nicht testen
      if (id === 'new') {
        setError('Bitte speichern Sie das Template zuerst, bevor Sie es testen.');
        setTestLoading(false);
        return;
      }
      
      const response = await axios.post(`${API_URL}/templates/${id}/test`, {
        message: testMessage
      });
      
      if (response.data?.status === 'success') {
        setTransformedMessage(response.data?.data);
        setError(null);
      } else {
        throw new Error(response.data?.error?.message || 'Transformation fehlgeschlagen');
      }
    } catch (error) {
      console.error('Fehler bei der Transformation:', error);
      setError('Fehler bei der Transformation: ' + (error.response?.data?.error?.message || error.message));
      setTransformedMessage(null);
    } finally {
      setTestLoading(false);
    }
  };

  // Funktion zum Kopieren von JSON in die Zwischenablage
  const copyToClipboard = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('JSON in Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
      alert('Fehler beim Kopieren: ' + error.message);
    }
  };

  // Beispiel-Template verwenden
  const useTemplateHelper = (providerId) => {
    if (templateHelpers[providerId] && window.confirm(`Möchten Sie das Beispiel-Template für ${providerId} verwenden?`)) {
      setTemplateCode(templateHelpers[providerId].template);
    }
  };

  // Drawer-Inhalt
  const drawerContent = () => {
    if (loading) {
      return <div className="text-center p-5">Lade Template-Daten...</div>;
    }
    
    if (error && !template && id !== 'new') {
      return (
        <>
          <Alert variant="danger" className="mb-4">{error}</Alert>
          <Button variant="secondary" onClick={() => navigate('/templates')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    if (!template && id !== 'new') {
      return (
        <>
          <Alert variant="warning" className="mb-4">Template nicht gefunden</Alert>
          <Button variant="secondary" onClick={() => navigate('/templates')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    return (
      <>
        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
        {success && <Alert variant="success" className="mb-3">{success}</Alert>}
        
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Template-Name</Form.Label>
            <Form.Control
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
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
              <Alert variant="info" className="mt-2">
                <div className="mb-2">{templateHelpers[providerType].description}</div>
                <Button 
                  size="sm" 
                  variant="outline-primary" 
                  onClick={() => useTemplateHelper(providerType)}
                >
                  Beispiel-Template verwenden
                </Button>
              </Alert>
            )}
          </Form.Group>
        </Form>
        
        <Tabs defaultActiveKey="editor" className="mb-3">
          <Tab eventKey="editor" title="Template-Code">
            <Form.Group className="mb-3">
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
            
            <div className="d-flex justify-content-between mt-3">
              {isEditing ? (
                <>
                  <Button variant="secondary" onClick={handleCancel}>
                    Abbrechen
                  </Button>
                  <Button variant="primary" onClick={handleSaveTemplate}>
                    <Save size={16} className="me-1" />
                    Speichern
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="danger" onClick={handleDeleteTemplate}>
                    <Trash size={16} className="me-1" />
                    Löschen
                  </Button>
                  <Button variant="primary" onClick={handleEditClick}>
                    <Edit size={16} className="me-1" />
                    Bearbeiten
                  </Button>
                </>
              )}
            </div>
          </Tab>
          
          <Tab eventKey="test" title="Test-Transformation" disabled={id === 'new'}>
            <Alert variant="info" className="mb-3">
              Hier können Sie testen, wie eine Nachricht mit diesem Template transformiert wird.
              Die Gateway-ID, Geräte-IDs und Nachrichteninhalte können angepasst werden, 
              aber die Grundstruktur sollte dem Anbieterformat entsprechen.
            </Alert>
            
            <div className="mb-3">
              <h6>Testnachricht</h6>
              <SimpleCodeEditor
                value={JSON.stringify(testMessage, null, 2)}
                onChange={(value) => handleTestMessageChange(value)}
                language="json"
                height="200px"
              />
            </div>
            
            <div className="mb-3">
              <Button 
                variant="primary"
                onClick={handleTestTransform}
                disabled={testLoading || id === 'new'}
              >
                <PlayCircle size={16} className="me-1" />
                {testLoading ? 'Wird transformiert...' : 'Transformation testen'}
              </Button>
            </div>
            
            {transformedMessage && (
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Transformierte Nachricht</h6>
                  <Button 
                    size="sm" 
                    variant="outline-secondary"
                    onClick={() => copyToClipboard(transformedMessage)}
                  >
                    <Copy size={16} className="me-1" />
                    Kopieren
                  </Button>
                </div>
                
                <div className="border p-3 rounded bg-light" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <JsonView data={transformedMessage} />
                </div>
              </div>
            )}
          </Tab>
        </Tabs>
      </>
    );
  };

  return (
    <Drawer
      show={true}
      onClose={() => navigate('/templates')}
      title={
        <>
          <FileCode size={18} className="me-2" />
          {id === 'new' ? 'Neues Template' : 'Template-Details'}
        </>
      }
    >
      {drawerContent()}
    </Drawer>
  );
};

export default TemplateDetailDrawer; 