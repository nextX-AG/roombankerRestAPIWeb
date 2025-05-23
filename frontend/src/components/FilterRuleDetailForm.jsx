import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, InputGroup } from 'react-bootstrap';
import { RangeSlider } from 'react-bootstrap-range-slider';
import { Save, X, Settings, AlertTriangle } from 'lucide-react';

/**
 * Komponente zur detaillierten Bearbeitung und Anzeige von Filterregeln
 * mit entsprechenden Eingabefeldern je nach Regeltyp
 */
const FilterRuleDetailForm = ({ 
  rule, 
  normalizedMessage = {}, 
  onSave, 
  onCancel 
}) => {
  // State für bearbeitete Regel
  const [editedRule, setEditedRule] = useState(rule || {});
  // Verfügbare Werte aus der normalisierten Nachricht
  const [availableValues, setAvailableValues] = useState([]);
  
  // Extrahiere mögliche Werte für das Feld aus der normalisierten Nachricht
  useEffect(() => {
    if (rule && rule.field_path && normalizedMessage) {
      try {
        // Versuche, die Werte aus dem Pfad zu extrahieren
        const path = rule.field_path.split('.');
        let currentObj = normalizedMessage;
        
        // Sonderbehandlung für Array-Indizes wie 'devices[0].values'
        for (let i = 0; i < path.length; i++) {
          let key = path[i];
          
          // Prüfe auf Array-Zugriff: devices[0]
          const arrayMatch = key.match(/(.+)\[(\d+)\]/);
          if (arrayMatch) {
            const arrayName = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            
            if (currentObj[arrayName] && Array.isArray(currentObj[arrayName]) && currentObj[arrayName][index]) {
              currentObj = currentObj[arrayName][index];
            } else {
              currentObj = undefined;
              break;
            }
          } else if (currentObj[key] !== undefined) {
            currentObj = currentObj[key];
          } else {
            currentObj = undefined;
            break;
          }
        }
        
        // Wenn wir einen Wert gefunden haben, speichern wir ihn
        if (currentObj !== undefined) {
          if (Array.isArray(currentObj)) {
            // Bei Arrays nehmen wir die eindeutigen Werte
            setAvailableValues([...new Set(currentObj)]);
          } else if (typeof currentObj === 'object') {
            // Bei Objekten nehmen wir die Schlüssel
            setAvailableValues(Object.keys(currentObj));
          } else {
            // Bei einfachen Werten nehmen wir den Wert selbst
            setAvailableValues([currentObj]);
          }
        }
      } catch (error) {
        console.error('Fehler beim Extrahieren der Werte:', error);
        setAvailableValues([]);
      }
    }
  }, [rule, normalizedMessage]);
  
  // Wenn sich die Regel ändert, aktualisieren wir den State
  useEffect(() => {
    setEditedRule(rule || {});
  }, [rule]);
  
  // Feldänderung übernehmen
  const handleChange = (field, value) => {
    setEditedRule(prev => ({ ...prev, [field]: value }));
  };
  
  // Formular abschicken
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedRule);
  };
  
  // Renderinglogik basierend auf Regeltyp
  const renderFormFields = () => {
    if (!editedRule || !editedRule.type) {
      return (
        <div className="text-center text-muted py-3">
          <AlertTriangle size={24} className="mb-2" />
          <p>Keine gültige Filterregel ausgewählt.</p>
        </div>
      );
    }
    
    switch (editedRule.type) {
      case 'ValueComparisonRule':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Feldpfad</Form.Label>
              <Form.Control 
                type="text" 
                value={editedRule.field_path || ''} 
                onChange={(e) => handleChange('field_path', e.target.value)}
                placeholder="z.B. devices[0].values.alarmtype"
              />
              <Form.Text className="text-muted">
                Der Pfad zum Feld in der normalisierten Nachricht.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Erwarteter Wert</Form.Label>
              {availableValues.length > 0 ? (
                <Form.Select
                  value={editedRule.expected_value || ''}
                  onChange={(e) => handleChange('expected_value', e.target.value)}
                >
                  <option value="">Bitte wählen...</option>
                  {availableValues.map((value, index) => (
                    <option key={index} value={value}>{value}</option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control 
                  type="text" 
                  value={editedRule.expected_value || ''} 
                  onChange={(e) => handleChange('expected_value', e.target.value)}
                  placeholder="z.B. alarm"
                />
              )}
              <Form.Text className="text-muted">
                Der Wert, mit dem das Feld verglichen werden soll.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox"
                id="negate-checkbox"
                label="Bedingung negieren (NOT)"
                checked={editedRule.negate || false}
                onChange={(e) => handleChange('negate', e.target.checked)}
              />
              <Form.Text className="text-muted">
                Wenn aktiviert, trifft die Regel zu, wenn der Wert NICHT gleich dem erwarteten Wert ist.
              </Form.Text>
            </Form.Group>
          </>
        );
        
      case 'RangeRule':
        const min = editedRule.min_value !== undefined ? editedRule.min_value : 0;
        const max = editedRule.max_value !== undefined ? editedRule.max_value : 100;
        
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Feldpfad</Form.Label>
              <Form.Control 
                type="text" 
                value={editedRule.field_path || ''} 
                onChange={(e) => handleChange('field_path', e.target.value)}
                placeholder="z.B. devices[0].values.temperature"
              />
              <Form.Text className="text-muted">
                Der Pfad zum numerischen Feld in der normalisierten Nachricht.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Bereich: {min} - {max}</Form.Label>
              <Row>
                <Col>
                  <Form.Label className="small">Mindestwert: {min}</Form.Label>
                  <RangeSlider
                    min={min - 10}
                    max={max}
                    value={min}
                    onChange={e => handleChange('min_value', parseInt(e.target.value))}
                  />
                </Col>
              </Row>
              <Row className="mt-2">
                <Col>
                  <Form.Label className="small">Maximalwert: {max}</Form.Label>
                  <RangeSlider
                    min={min}
                    max={max + 10}
                    value={max}
                    onChange={e => handleChange('max_value', parseInt(e.target.value))}
                  />
                </Col>
              </Row>
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Mindestwert</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={min} 
                    onChange={(e) => handleChange('min_value', parseFloat(e.target.value))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Maximalwert</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={max} 
                    onChange={(e) => handleChange('max_value', parseFloat(e.target.value))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox"
                id="inclusive-checkbox"
                label="Grenzen einschließen"
                checked={editedRule.inclusive !== false} // Standard ist true
                onChange={(e) => handleChange('inclusive', e.target.checked)}
              />
              <Form.Text className="text-muted">
                Wenn aktiviert, werden die Grenzwerte selbst mit eingeschlossen (≥ min und ≤ max).
              </Form.Text>
            </Form.Group>
          </>
        );
        
      case 'RegexRule':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Feldpfad</Form.Label>
              <Form.Control 
                type="text" 
                value={editedRule.field_path || ''} 
                onChange={(e) => handleChange('field_path', e.target.value)}
                placeholder="z.B. gateway.id"
              />
              <Form.Text className="text-muted">
                Der Pfad zum Text-Feld in der normalisierten Nachricht.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Regex-Muster</Form.Label>
              <Form.Control 
                type="text" 
                value={editedRule.pattern || ''} 
                onChange={(e) => handleChange('pattern', e.target.value)}
                placeholder="z.B. ^gw-.*"
              />
              <Form.Text className="text-muted">
                Regulärer Ausdruck zum Vergleichen mit dem Feldwert.
              </Form.Text>
            </Form.Group>
          </>
        );
        
      case 'ListContainsRule':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Feldpfad</Form.Label>
              <Form.Control 
                type="text" 
                value={editedRule.field_path || ''} 
                onChange={(e) => handleChange('field_path', e.target.value)}
                placeholder="z.B. devices[0].values.status"
              />
              <Form.Text className="text-muted">
                Der Pfad zum Feld in der normalisierten Nachricht.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Erlaubte Werte</Form.Label>
              <div>
                {availableValues.length > 0 ? (
                  availableValues.map((value, index) => (
                    <Form.Check 
                      key={index}
                      type="checkbox"
                      id={`value-checkbox-${index}`}
                      label={value}
                      checked={(editedRule.allowed_values || []).includes(value)}
                      onChange={(e) => {
                        const newValues = [...(editedRule.allowed_values || [])];
                        if (e.target.checked) {
                          if (!newValues.includes(value)) {
                            newValues.push(value);
                          }
                        } else {
                          const idx = newValues.indexOf(value);
                          if (idx >= 0) {
                            newValues.splice(idx, 1);
                          }
                        }
                        handleChange('allowed_values', newValues);
                      }}
                    />
                  ))
                ) : (
                  <InputGroup>
                    <Form.Control 
                      type="text" 
                      placeholder="Wert hinzufügen"
                      value={editedRule.newValue || ''}
                      onChange={(e) => setEditedRule(prev => ({ ...prev, newValue: e.target.value }))}
                    />
                    <Button 
                      variant="outline-secondary"
                      onClick={() => {
                        if (editedRule.newValue) {
                          const newValues = [...(editedRule.allowed_values || [])];
                          if (!newValues.includes(editedRule.newValue)) {
                            newValues.push(editedRule.newValue);
                            handleChange('allowed_values', newValues);
                            setEditedRule(prev => ({ ...prev, newValue: '' }));
                          }
                        }
                      }}
                    >
                      +
                    </Button>
                  </InputGroup>
                )}
              </div>
              <Form.Text className="text-muted">
                Liste der Werte, die das Feld haben darf.
              </Form.Text>
            </Form.Group>
            
            {(editedRule.allowed_values || []).length > 0 && (
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-2">
                  {(editedRule.allowed_values || []).map((value, index) => (
                    <div key={index} className="badge bg-info d-flex align-items-center">
                      {value}
                      <button 
                        className="btn btn-sm p-0 ms-1" 
                        onClick={() => {
                          const newValues = [...(editedRule.allowed_values || [])];
                          newValues.splice(index, 1);
                          handleChange('allowed_values', newValues);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
        
      // Für AndRule und OrRule bräuchten wir eine rekursive Komponente,
      // was den Rahmen dieser Implementation sprengen würde
      default:
        return (
          <div className="text-center text-muted py-3">
            <Settings size={24} className="mb-2" />
            <p>Der Regeltyp {editedRule.type} kann derzeit nicht bearbeitet werden.</p>
          </div>
        );
    }
  };
  
  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Filterregel bearbeiten</span>
        <div>
          <Button 
            variant="outline-secondary" 
            size="sm"
            className="me-2"
            onClick={onCancel}
          >
            <X size={16} className="me-1" />
            Abbrechen
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleSubmit}
          >
            <Save size={16} className="me-1" />
            Speichern
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Name</Form.Label>
                <Form.Control 
                  type="text" 
                  value={editedRule.name || ''} 
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="z.B. temperature_range"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Typ</Form.Label>
                <Form.Select
                  value={editedRule.type || ''}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  <option value="">Bitte wählen...</option>
                  <option value="ValueComparisonRule">Wertevergleich</option>
                  <option value="RangeRule">Zahlenbereich</option>
                  <option value="RegexRule">Text-Muster (Regex)</option>
                  <option value="ListContainsRule">Werte-Liste</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>Beschreibung</Form.Label>
            <Form.Control 
              type="text" 
              value={editedRule.description || ''} 
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="z.B. Filtert Temperaturen zwischen 18 und 30 Grad"
            />
          </Form.Group>
          
          {renderFormFields()}
        </Form>
      </Card.Body>
    </Card>
  );
};

export default FilterRuleDetailForm; 