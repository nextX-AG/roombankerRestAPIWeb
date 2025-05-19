import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import { Table, Badge, Button, Alert, Form } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Copy, Edit, ArrowLeft, Check } from 'lucide-react';
import { templateApi } from '../api';
import CodeEditor from './CodeEditor';

/**
 * TemplateDetailDrawer - Zeigt Details eines ausgewählten Templates in einem Drawer an
 * Diese Komponente wird durch die Route /templates/:id geladen
 */
const TemplateDetailDrawer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // In einer echten Implementierung würden wir eine API-Methode zum Abrufen eines einzelnen Templates verwenden
        // Da diese Methode möglicherweise noch nicht existiert, rufen wir alle Templates ab und filtern
        const response = await templateApi.list();
        if (response.status === 'success' && response.data) {
          const templates = response.data || [];
          // Wir suchen nach einem Template mit der entsprechenden ID oder Namen
          const foundTemplate = templates.find(t => 
            t.id === id || 
            t.name === id ||
            (typeof t === 'string' && t === id) // Für den Fall, dass wir nur Strings zurückbekommen
          );
          
          if (foundTemplate) {
            // Wenn ein Template gefunden wurde, aber nur ein String ist, erstellen wir ein Objekt daraus
            if (typeof foundTemplate === 'string') {
              const providerType = foundTemplate.includes('evalarm') ? 'evalarm' : 'generic';
              setTemplate({
                id: foundTemplate,
                name: foundTemplate,
                provider_type: providerType,
                created_at: new Date().toISOString()
              });
              setEditedTemplate({
                id: foundTemplate,
                name: foundTemplate,
                provider_type: providerType,
                created_at: new Date().toISOString()
              });
            } else {
              setTemplate(foundTemplate);
              setEditedTemplate(JSON.parse(JSON.stringify(foundTemplate)));
            }
          } else {
            setError('Template nicht gefunden');
          }
        } else {
          throw new Error(response.error?.message || 'Fehler beim Laden des Templates');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Templatedetails:', error);
        setError('Template konnte nicht geladen werden: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplate();
  }, [id]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unbekannt';
    
    try {
      // ISO-String oder andere Formate
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('de-DE');
      }
      
      // Fallback
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };
  
  const copyToClipboard = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('JSON in Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
      alert('Fehler beim Kopieren: ' + error.message);
    }
  };
  
  const handleEditToggle = () => {
    if (editMode) {
      // Bearbeitung beenden, Änderungen verwerfen
      setEditedTemplate(JSON.parse(JSON.stringify(template)));
    }
    setEditMode(!editMode);
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // API-Aufruf zum Speichern des Templates
      const response = await templateApi.update(editedTemplate);
      
      if (response.status === 'success') {
        setTemplate(editedTemplate);
        setEditMode(false);
        alert('Template erfolgreich gespeichert!');
      } else {
        throw new Error(response.error?.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Templates:', error);
      alert(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleTemplateChange = (newValue) => {
    try {
      const parsed = JSON.parse(newValue);
      setEditedTemplate(parsed);
    } catch (error) {
      console.error('Ungültiges JSON:', error);
      // Wir zeigen keinen Fehler an, da der Benutzer möglicherweise noch beim Tippen ist
    }
  };

  const drawerContent = () => {
    if (loading) {
      return <div className="text-center p-5">Lade Template-Daten...</div>;
    }
    
    if (error) {
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
    
    if (!template) {
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
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Template-Informationen</h5>
          <div>
            {editMode ? (
              <>
                <Button 
                  variant="outline-secondary" 
                  className="me-2"
                  onClick={handleEditToggle}
                  disabled={saving}
                >
                  Abbrechen
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Check size={16} className="me-1" />
                  {saving ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
              </>
            ) : (
              <Button 
                variant="outline-primary" 
                onClick={handleEditToggle}
              >
                <Edit size={16} className="me-1" />
                Bearbeiten
              </Button>
            )}
          </div>
        </div>
        
        <Table bordered size="sm" className="mb-3">
          <tbody>
            <tr>
              <th>ID</th>
              <td>{template.id}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{template.name}</td>
            </tr>
            <tr>
              <th>Version</th>
              <td>{template.version || 'Nicht spezifiziert'}</td>
            </tr>
            <tr>
              <th>Erstellt</th>
              <td>{formatTimestamp(template.created_at || template.timestamp)}</td>
            </tr>
            <tr>
              <th>Zuletzt aktualisiert</th>
              <td>{formatTimestamp(template.updated_at || template.timestamp)}</td>
            </tr>
          </tbody>
        </Table>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Template-Definition</h5>
          {!editMode && (
            <Button 
              size="sm" 
              variant="outline-secondary"
              onClick={() => copyToClipboard(template)}
            >
              <Copy size={16} className="me-1" />
              Kopieren
            </Button>
          )}
        </div>
        
        {editMode ? (
          <div className="border rounded">
            <CodeEditor
              value={JSON.stringify(editedTemplate, null, 2)}
              onChange={handleTemplateChange}
              language="json"
              height="400px"
            />
          </div>
        ) : (
          <div className="border p-3 rounded bg-light" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <JsonView data={template} />
          </div>
        )}
      </>
    );
  };

  return (
    <Drawer
      show={true}
      onClose={() => navigate('/templates')}
      title="Template-Details"
    >
      {drawerContent()}
    </Drawer>
  );
};

export default TemplateDetailDrawer; 