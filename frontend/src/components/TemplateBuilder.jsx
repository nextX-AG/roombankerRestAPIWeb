import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, ListGroup, Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Plus, Trash2, ArrowRight, ChevronDown, ChevronUp, Copy, 
  Check, X, Info, AlertTriangle, Settings, Zap
} from 'lucide-react';
import '../styles/template-builder.css';

// Konstanten für Drag-and-Drop-Typen
const ItemTypes = {
  FIELD: 'field',
  SECTION: 'section',
  STRUCTURE: 'structure'
};

/**
 * Visueller Template-Builder mit Drag-and-Drop-Funktionalität
 */
const TemplateBuilder = ({ 
  normalizedMessage = {},
  templateCode = '',
  onChange = () => {}
}) => {
  // Template-Struktur im Editor
  const [template, setTemplate] = useState({
    name: 'Neues Template',
    description: 'Automatisch generiertes Template',
    version: '1.0.0',
    filter_rules: [],
    transform: {
      events: []
    }
  });

  // Beim ersten Rendern den bestehenden Code einlesen, falls vorhanden
  useEffect(() => {
    if (templateCode) {
      try {
        const parsedTemplate = JSON.parse(templateCode);
        setTemplate(parsedTemplate);
      } catch (e) {
        console.error('Fehler beim Parsen des Template-Codes:', e);
      }
    }
  }, [templateCode]);

  // Bei Änderungen das Template zurückgeben
  useEffect(() => {
    // Konvertiere das interne Template-Objekt in JSON und sende es zurück
    try {
      const jsonTemplate = JSON.stringify(template, null, 2);
      onChange(jsonTemplate);
    } catch (e) {
      console.error('Fehler beim Umwandeln in JSON:', e);
    }
  }, [template, onChange]);

  // Baum der verfügbaren Felder aus der normalisierten Nachricht extrahieren
  const extractFields = (obj, prefix = '') => {
    if (!obj || typeof obj !== 'object') return [];
    
    return Object.entries(obj).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (Array.isArray(value)) {
        // Bei Arrays auch die einzelnen Elemente als Pfade anbieten
        const arrayFields = value.flatMap((_, index) => 
          extractFields(value[index], `${path}[${index}]`)
        );
        
        // Außerdem das erste Element als generischen Array-Zugriff anbieten
        if (value.length > 0) {
          arrayFields.push({
            name: `${path}[0]`,
            displayName: `${key}[0]`,
            path: `${path}[0]`,
            type: typeof value[0],
            isArrayItem: true
          });
        }
        
        return [
          {
            name: key,
            displayName: key,
            path,
            type: 'array',
            isArray: true
          },
          ...arrayFields
        ];
      } else if (value && typeof value === 'object') {
        return [
          {
            name: key,
            displayName: key,
            path,
            type: 'object',
            isObject: true
          },
          ...extractFields(value, path)
        ];
      } else {
        return [{
          name: key,
          displayName: key,
          path,
          type: typeof value,
          value
        }];
      }
    });
  };
  
  // Alle Felder aus der normalisierten Nachricht
  const availableFields = extractFields(normalizedMessage);

  // Template-Name ändern
  const handleNameChange = (e) => {
    setTemplate(prev => ({ ...prev, name: e.target.value }));
  };

  // Template-Beschreibung ändern
  const handleDescriptionChange = (e) => {
    setTemplate(prev => ({ ...prev, description: e.target.value }));
  };

  // Ein Feld zum template hinzufügen
  const addFieldToTemplate = (field) => {
    // Einfaches Beispiel: Füge ein neues Event mit dem Feld als message hinzu
    setTemplate(prev => ({
      ...prev,
      transform: {
        ...prev.transform,
        events: [
          ...prev.transform.events,
          {
            message: `{{ ${field.path} }}`,
            namespace: "{{ customer.namespace }}",
            device_id: "{{ devices[0].id }}",
            id: "{{ 'id_' + now() | string }}",
          }
        ]
      }
    }));
  };

  // Ein Event löschen
  const removeEvent = (index) => {
    setTemplate(prev => {
      const newEvents = [...prev.transform.events];
      newEvents.splice(index, 1);
      return {
        ...prev,
        transform: {
          ...prev.transform,
          events: newEvents
        }
      };
    });
  };

  // Ein Feld in einem Event aktualisieren
  const updateEventField = (eventIndex, field, value) => {
    setTemplate(prev => {
      const newEvents = [...prev.transform.events];
      newEvents[eventIndex] = {
        ...newEvents[eventIndex],
        [field]: value
      };
      return {
        ...prev,
        transform: {
          ...prev.transform,
          events: newEvents
        }
      };
    });
  };

  // Drag-and-Drop-Komponente für ein Feld
  const DraggableField = ({ field }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.FIELD,
      item: { field },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging()
      })
    }));

    return (
      <div
        ref={drag}
        className={`draggable-field ${isDragging ? 'is-dragging' : ''}`}
        style={{ 
          opacity: isDragging ? 0.5 : 1,
          cursor: 'grab',
          padding: '6px 12px',
          marginBottom: '4px',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: '#f8f9fa'
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <strong>{field.displayName}</strong>
            <Badge 
              bg={
                field.type === 'string' ? 'success' :
                field.type === 'number' ? 'primary' :
                field.type === 'boolean' ? 'warning' :
                field.type === 'object' ? 'secondary' :
                field.type === 'array' ? 'info' : 'dark'
              }
              className="ms-2"
            >
              {field.type}
            </Badge>
          </div>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => addFieldToTemplate(field)}
          >
            <Plus size={14} />
          </Button>
        </div>
        <div className="text-muted small">{field.path}</div>
      </div>
    );
  };

  // Der Drop-Bereich für ein Event
  const EventDroppable = ({ eventIndex, event }) => {
    const [{ isOver }, drop] = useDrop(() => ({
      accept: ItemTypes.FIELD,
      drop: (item) => {
        updateEventField(eventIndex, 'message', `{{ ${item.field.path} }}`);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver()
      })
    }));

    return (
      <Card 
        ref={drop} 
        className="mb-3" 
        style={{ 
          border: isOver ? '2px dashed #007bff' : '1px solid #dee2e6'
        }}
      >
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Event #{eventIndex + 1}</span>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={() => removeEvent(eventIndex)}
          >
            <Trash2 size={14} />
          </Button>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nachricht</Form.Label>
            <Form.Control 
              type="text" 
              value={event.message} 
              onChange={(e) => updateEventField(eventIndex, 'message', e.target.value)}
              placeholder="Ziehen Sie ein Feld hierher oder geben Sie eine Nachricht ein"
            />
            <Form.Text className="text-muted">
              Verwenden Sie {'{{ gateway.id }}'} Syntax, um auf Felder zuzugreifen
            </Form.Text>
          </Form.Group>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Namespace</Form.Label>
                <Form.Control 
                  type="text" 
                  value={event.namespace} 
                  onChange={(e) => updateEventField(eventIndex, 'namespace', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Device ID</Form.Label>
                <Form.Control 
                  type="text" 
                  value={event.device_id} 
                  onChange={(e) => updateEventField(eventIndex, 'device_id', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>ID</Form.Label>
            <Form.Control 
              type="text" 
              value={event.id} 
              onChange={(e) => updateEventField(eventIndex, 'id', e.target.value)}
            />
          </Form.Group>
        </Card.Body>
      </Card>
    );
  };

  // Hinzufügen eines leeren Events
  const addEmptyEvent = () => {
    setTemplate(prev => ({
      ...prev,
      transform: {
        ...prev.transform,
        events: [
          ...prev.transform.events,
          {
            message: "{{ devices[0].values.alarmstatus || 'Meldung' }}",
            namespace: "{{ customer.namespace }}",
            device_id: "{{ devices[0].id }}",
            id: "{{ 'id_' + now() | string }}",
          }
        ]
      }
    }));
  };

  // Finde einen bestimmten Feldpfad in den verfügbaren Feldern
  const findFieldByPath = (path) => {
    return availableFields.find(field => field.path === path);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="template-builder">
        <Row className="mb-4">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control 
                type="text" 
                value={template.name} 
                onChange={handleNameChange}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Beschreibung</Form.Label>
              <Form.Control 
                type="text" 
                value={template.description} 
                onChange={handleDescriptionChange}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          {/* Linke Seite: Verfügbare Felder */}
          <Col md={4}>
            <Card>
              <Card.Header>Verfügbare Felder</Card.Header>
              <Card.Body style={{ maxHeight: '500px', overflow: 'auto' }}>
                <Form.Control 
                  type="text" 
                  placeholder="Suchen..." 
                  className="mb-3"
                />
                {availableFields.length > 0 ? (
                  <div className="available-fields">
                    {availableFields.map((field, index) => (
                      <DraggableField key={index} field={field} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">
                    <AlertTriangle size={24} className="mb-2" />
                    <p>Keine normalisierten Daten verfügbar.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
            
            <Card className="mt-3">
              <Card.Header>Vorlagen-Blöcke</Card.Header>
              <Card.Body>
                <ListGroup>
                  <ListGroup.Item 
                    action 
                    className="d-flex justify-content-between align-items-center"
                    onClick={addEmptyEvent}
                  >
                    <span>Event (Nachricht)</span>
                    <Plus size={16} />
                  </ListGroup.Item>
                  <ListGroup.Item 
                    action
                    className="d-flex justify-content-between align-items-center"
                    disabled
                  >
                    <span>Filter-Regel</span>
                    <Plus size={16} />
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Rechte Seite: Template-Editor */}
          <Col md={8}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Events</span>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={addEmptyEvent}
                >
                  <Plus size={14} className="me-1" />
                  Event hinzufügen
                </Button>
              </Card.Header>
              <Card.Body>
                {template.transform.events.length > 0 ? (
                  <div className="events-container">
                    {template.transform.events.map((event, index) => (
                      <EventDroppable 
                        key={index} 
                        eventIndex={index} 
                        event={event} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    <Info size={32} className="mb-2" />
                    <p>Keine Events im Template. Erstellen Sie ein neues Event oder ziehen Sie ein Feld hierher.</p>
                    <Button 
                      variant="primary"
                      onClick={addEmptyEvent}
                    >
                      <Plus size={14} className="me-1" />
                      Event hinzufügen
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
            
            <Card className="mt-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Filter-Regeln</span>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  disabled
                >
                  <Plus size={14} className="me-1" />
                  Filter hinzufügen
                </Button>
              </Card.Header>
              <Card.Body>
                <div className="text-center text-muted py-3">
                  <Settings size={24} className="mb-2" />
                  <p>Filter-Regeln werden in einer zukünftigen Version verfügbar sein.</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </DndProvider>
  );
};

export default TemplateBuilder; 