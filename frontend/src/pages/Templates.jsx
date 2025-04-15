import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [testMessage, setTestMessage] = useState({
    ts: Math.floor(Date.now() / 1000),
    subdevicelist: [
      {
        id: 665531142918213,
        values: {
          alarmstatus: "alarm",
          alarmtype: "panic"
        }
      }
    ]
  });
  const [transformedMessage, setTransformedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Templates laden
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get('http://localhost:8081/api/templates');
        if (response.status === 200) {
          setTemplates(response.data);
          if (response.data.length > 0) {
            setSelectedTemplate(response.data[0]);
          }
        }
      } catch (err) {
        setError('Fehler beim Abrufen der Templates. Bitte stellen Sie sicher, dass der Message Processor läuft.');
        console.error('Fehler beim Abrufen der Templates:', err);
      } finally {
        setLoading(false);
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
          setTemplateContent(JSON.stringify({
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
          setTemplateContent(JSON.stringify({
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

  const handleTemplateChange = (e) => {
    setSelectedTemplate(e.target.value);
  };

  const handleTestMessageChange = (e) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setTestMessage(parsed);
      setError('');
    } catch (err) {
      setError('Ungültiges JSON-Format');
    }
  };

  const handleTestTransform = async () => {
    try {
      setError('');
      setSuccess('');
      setTransformedMessage(null);
      
      const response = await axios.post('http://localhost:8081/api/test-transform', {
        message: {
          data: testMessage,
          id: 'test-' + Date.now(),
          timestamp: Math.floor(Date.now() / 1000),
          received_at: new Date().toISOString()
        },
        template: selectedTemplate
      });
      
      if (response.status === 200) {
        setTransformedMessage(response.data.transformed_message);
        setSuccess('Transformation erfolgreich!');
      }
    } catch (err) {
      setError('Fehler bei der Transformation: ' + (err.response?.data?.message || err.message));
      console.error('Fehler bei der Transformation:', err);
    }
  };

  return (
    <Container>
      <h1 className="mb-4">Templates</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              Template auswählen
            </Card.Header>
            <Card.Body>
              {loading ? (
                <p>Lade Templates...</p>
              ) : templates.length > 0 ? (
                <Form.Group>
                  <Form.Label>Verfügbare Templates</Form.Label>
                  <Form.Select 
                    value={selectedTemplate} 
                    onChange={handleTemplateChange}
                  >
                    {templates.map((template, index) => (
                      <option key={index} value={template}>
                        {template}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              ) : (
                <p>Keine Templates verfügbar.</p>
              )}
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header className="bg-primary text-white">
              Template-Inhalt
            </Card.Header>
            <Card.Body>
              {selectedTemplate ? (
                <Form.Group>
                  <Form.Control
                    as="textarea"
                    rows={10}
                    value={templateContent}
                    readOnly
                    className="font-monospace"
                  />
                  <Form.Text className="text-muted">
                    Dieses Template wird verwendet, um Nachrichten zu transformieren.
                    Platzhalter wie {{ "{{variable}}" }} werden durch Werte aus der Nachricht ersetzt.
                  </Form.Text>
                </Form.Group>
              ) : (
                <p>Kein Template ausgewählt.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              Test-Transformation
            </Card.Header>
            <Card.Body>
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
            <Card.Header className="bg-primary text-white">
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
    </Container>
  );
};

export default Templates;
