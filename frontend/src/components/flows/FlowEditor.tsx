import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Button, Form } from 'react-bootstrap';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlay, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

// Step-Komponenten importieren
import FilterStep from './steps/FilterStep';
import TransformStep from './steps/TransformStep';
import ForwardStep from './steps/ForwardStep';

// API-Client importieren
import { flowApi, Flow as ApiFlow, FlowTestResult } from '../../api/flowApi';

// Types
interface FlowStep {
  id: string;
  type: 'filter' | 'transform' | 'forward' | 'conditional';
  config: Record<string, any>;
  position: number;
}

interface Flow {
  id?: string;
  name: string;
  flow_type: 'gateway_flow' | 'device_flow';
  version: number;
  steps: FlowStep[];
}

// Komponente
const FlowEditor: React.FC<{ flowId?: string }> = ({ flowId }) => {
  // State
  const [flow, setFlow] = useState<Flow>({
    name: '',
    flow_type: 'device_flow',
    version: 1,
    steps: []
  });
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flow laden
  useEffect(() => {
    if (flowId) {
      loadFlow();
    }
  }, [flowId]);

  const loadFlow = async () => {
    if (!flowId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await flowApi.getById(flowId);
      if (response.status === 'success') {
        setFlow(response.data);
      } else {
        setError(response.error?.message || 'Fehler beim Laden des Flows');
      }
    } catch (err) {
      setError('Fehler beim Laden des Flows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAddStep = (type: FlowStep['type']) => {
    const newStep: FlowStep = {
      id: `step_${Date.now()}`,
      type,
      config: type === 'filter' ? { rules: [] } :
             type === 'transform' ? { template: '' } :
             type === 'forward' ? {
               url: '',
               method: 'POST',
               headers: [],
               retry: { enabled: false, maxAttempts: 3, delay: 1000 }
             } : {},
      position: flow.steps.length
    };
    setFlow(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setSelectedStep(newStep);
  };

  const handleStepSelect = (step: FlowStep) => {
    setSelectedStep(step);
  };

  const handleStepUpdate = (updatedConfig: any) => {
    if (!selectedStep) return;

    setFlow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === selectedStep.id 
          ? { ...step, config: updatedConfig }
          : step
      )
    }));
  };

  const handleDeleteStep = (stepId: string) => {
    setFlow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
    if (selectedStep?.id === stepId) {
      setSelectedStep(null);
    }
  };

  const handleSaveFlow = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFlow: ApiFlow = {
        ...flow,
        steps: flow.steps.map((step, index) => ({
          ...step,
          position: index
        }))
      };

      const response = flowId
        ? await flowApi.update(flowId, apiFlow)
        : await flowApi.create(apiFlow);

      if (response.status === 'success') {
        // Erfolgsmeldung anzeigen
        alert('Flow erfolgreich gespeichert');
      } else {
        setError(response.error?.message || 'Fehler beim Speichern');
      }
    } catch (err) {
      setError('Fehler beim Speichern des Flows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestFlow = async () => {
    setIsTestMode(true);
    setLoading(true);
    setError(null);
    try {
      // Erst Flow speichern wenn noch nicht gespeichert
      let currentFlowId = flowId;
      if (!currentFlowId) {
        const saveResponse = await flowApi.create(flow);
        if (saveResponse.status !== 'success') {
          throw new Error('Fehler beim Speichern des Flows');
        }
        currentFlowId = saveResponse.data.id;
      }

      // Testnachricht erstellen
      const testMessage = {
        gateway: {
          id: 'test-gateway',
          type: 'test'
        },
        devices: [{
          id: 'test-device',
          type: 'test',
          values: {
            status: 'ok'
          }
        }]
      };

      // Flow testen
      const response = await flowApi.test(currentFlowId, testMessage);
      
      if (response.status === 'success') {
        setTestResult(response.data);
      } else {
        setTestResult({
          success: false,
          error: response.error?.message || 'Unbekannter Fehler'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: String(err)
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepConfig = () => {
    if (!selectedStep) return null;

    switch (selectedStep.type) {
      case 'filter':
        return (
          <FilterStep
            config={selectedStep.config}
            onChange={handleStepUpdate}
          />
        );
      case 'transform':
        return (
          <TransformStep
            config={selectedStep.config}
            onChange={handleStepUpdate}
          />
        );
      case 'forward':
        return (
          <ForwardStep
            config={selectedStep.config}
            onChange={handleStepUpdate}
          />
        );
      default:
        return <p>Unbekannter Step-Typ</p>;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Container fluid className="py-4">
        {error && (
          <div className="alert alert-danger mb-4">
            {error}
          </div>
        )}
        
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">Flow Editor</h5>
              <div className="d-flex gap-2 mt-2">
                <Form.Control
                  type="text"
                  value={flow.name}
                  onChange={(e) => setFlow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Flow-Name"
                />
                <Form.Select
                  value={flow.flow_type}
                  onChange={(e) => setFlow(prev => ({ ...prev, flow_type: e.target.value as 'gateway_flow' | 'device_flow' }))}
                  style={{ width: 'auto' }}
                >
                  <option value="gateway_flow">Gateway Flow</option>
                  <option value="device_flow">Device Flow</option>
                </Form.Select>
              </div>
            </div>
            <div>
              <Button 
                variant="primary" 
                className="me-2"
                onClick={handleSaveFlow}
                disabled={!flow.name || !flow.flow_type}
              >
                <FontAwesomeIcon icon={faSave} className="me-2" />
                Speichern
              </Button>
              <Button 
                variant="success"
                onClick={handleTestFlow}
              >
                <FontAwesomeIcon icon={faPlay} className="me-2" />
                Testen
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Lädt...</span>
                </div>
              </div>
            ) : (
              <Row>
                {/* Linke Spalte: Flow Steps */}
                <Col md={8}>
                  <Card className="mb-3">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Flow Steps</h6>
                      <div className="btn-group">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleAddStep('filter')}
                        >
                          <FontAwesomeIcon icon={faPlus} className="me-1" />
                          Filter
                        </Button>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleAddStep('transform')}
                        >
                          <FontAwesomeIcon icon={faPlus} className="me-1" />
                          Transform
                        </Button>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleAddStep('forward')}
                        >
                          <FontAwesomeIcon icon={faPlus} className="me-1" />
                          Forward
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {flow.steps.map((step, index) => (
                        <div 
                          key={step.id}
                          className={`mb-2 p-2 border rounded cursor-pointer ${
                            selectedStep?.id === step.id ? 'border-primary' : ''
                          }`}
                          onClick={() => handleStepSelect(step)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span>{`${index + 1}. ${step.type}`}</span>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStep(step.id);
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>

                  {/* Test-Ergebnisse */}
                  {testResult && (
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Test-Ergebnisse</h6>
                      </Card.Header>
                      <Card.Body>
                        {testResult.success ? (
                          <div>
                            <div className="alert alert-success">
                              Flow-Test erfolgreich
                            </div>
                            {testResult.steps_executed.map((step: any, index: number) => (
                              <div key={index} className="mb-2">
                                <strong>Step {step.step}:</strong> {step.type} - {step.result}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="alert alert-danger">
                            Flow-Test fehlgeschlagen: {testResult.error}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  )}
                </Col>

                {/* Rechte Spalte: Step Konfiguration */}
                <Col md={4}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Step Konfiguration</h6>
                    </Card.Header>
                    <Card.Body>
                      {selectedStep ? (
                        renderStepConfig()
                      ) : (
                        <p className="text-muted">Wählen Sie einen Step aus</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>
      </Container>
    </DndProvider>
  );
};

export default FlowEditor; 