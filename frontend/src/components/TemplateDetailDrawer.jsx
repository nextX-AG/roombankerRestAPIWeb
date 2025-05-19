import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import { Table, Badge, Button, Alert, Form, Modal } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Copy, Edit, ArrowLeft, Check, Trash2 } from 'lucide-react';
import { templateApi } from '../api';
import CodeEditor from './CodeEditor';

/**
 * TemplateDetailDrawer - Zeigt Details eines ausgewählten Templates in einem Drawer an
 * Diese Komponente wird durch eine verschachtelte Route in der Templates.jsx aktiviert
 */
const TemplateDetailDrawer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templateCode, setTemplateCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Lade Template-Daten
  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const response = await templateApi.detail(id);
        if (response.status === 'success') {
          setTemplate(response.data);
          setTemplateCode(response.data.template_code);
        } else {
          setError(response.error?.message || 'Fehler beim Laden des Templates');
        }
      } catch (err) {
        setError('Fehler beim Laden des Templates: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTemplate();
    }
  }, [id]);

  // Schließen des Drawers
  const handleClose = () => {
    navigate('/templates');
  };

  // Bearbeiten aktivieren/deaktivieren
  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Template-Code speichern
  const handleSave = async () => {
    // TODO: Implementierung der Speicherfunktion
    setIsEditing(false);
  };

  // Template löschen nach Bestätigung
  const handleDelete = async () => {
    try {
      const response = await templateApi.delete(id);
      if (response.status === 'success') {
        // Schließe Drawer und navigiere zurück
        handleClose();
      } else {
        setError(response.error?.message || 'Fehler beim Löschen des Templates');
      }
    } catch (err) {
      setError('Fehler beim Löschen des Templates: ' + err.message);
    } finally {
      setShowDeleteModal(false);
    }
  };

  // Zeige Bestätigungsdialog für Löschung
  const confirmDelete = () => {
    setShowDeleteModal(true);
  };

  // JSON-Darstellung verbessern
  const jsonViewOptions = {
    style: {
      container: {
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        padding: '10px'
      }
    },
    shouldExpandNode: () => true, // Alle Ebenen standardmäßig aufklappen
    displayDataTypes: false,
    displayObjectSize: false,
    rootName: 'template',
    enableClipboard: true
  };

  // Konvertieren des Template-Codes von String nach JSON für den JsonView
  const getTemplateJson = () => {
    try {
      return JSON.parse(template.template_code);
    } catch (e) {
      return { error: "Ungültiges JSON-Format", raw: template.template_code };
    }
  };

  return (
    <>
      <Drawer 
        show={true} 
        onClose={handleClose} 
        title={
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center">
              <span>{template?.name || 'Template Details'}</span>
              {template && <Badge bg="info" className="ms-2">{template.provider_type}</Badge>}
            </div>
            <div>
              {!isEditing ? (
                <>
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="me-2"
                    onClick={confirmDelete}
                  >
                    <Trash2 size={16} />
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={toggleEdit}
                  >
                    <Edit size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    className="me-2"
                    onClick={toggleEdit}
                  >
                    <ArrowLeft size={16} />
                  </Button>
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    onClick={handleSave}
                  >
                    <Check size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Lade...</span>
            </div>
            <p className="mt-2">Template wird geladen...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : template ? (
          <div className="template-detail p-3">
            <div className="mb-4">
              <h5>Template Informationen</h5>
              <Table striped bordered hover size="sm">
                <tbody>
                  <tr>
                    <td width="30%"><strong>ID</strong></td>
                    <td>{template.id}</td>
                  </tr>
                  <tr>
                    <td><strong>Name</strong></td>
                    <td>{template.name}</td>
                  </tr>
                  <tr>
                    <td><strong>Anbieter-Typ</strong></td>
                    <td>{template.provider_type}</td>
                  </tr>
                  <tr>
                    <td><strong>Erstellt am</strong></td>
                    <td>{new Date(template.created_at).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><strong>Datei-Pfad</strong></td>
                    <td>{template.path}</td>
                  </tr>
                </tbody>
              </Table>
            </div>

            <div className="mb-4">
              <h5>Template-Code</h5>
              {isEditing ? (
                <CodeEditor 
                  value={templateCode} 
                  onChange={setTemplateCode} 
                  language="json" 
                  height="400px"
                />
              ) : (
                <div className="json-view-container border rounded p-3 bg-light">
                  <JsonView data={getTemplateJson()} {...jsonViewOptions} />
                </div>
              )}
            </div>

            <div className="template-actions mt-4">
              <h5>Template-Aktionen</h5>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm">
                  Template testen
                </Button>
                <Button variant="outline-primary" size="sm">
                  <Copy size={16} className="me-1" /> Duplizieren
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Alert variant="warning">Kein Template gefunden</Alert>
        )}
      </Drawer>

      {/* Bestätigungsdialog für Löschung */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Template löschen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sind Sie sicher, dass Sie das Template <strong>{template?.name}</strong> löschen möchten?
          <div className="alert alert-warning mt-3">
            <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Löschen
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TemplateDetailDrawer; 