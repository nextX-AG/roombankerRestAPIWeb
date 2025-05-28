import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Button, Form, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { flowApi, FlowGroup } from '../../api/flowApi';

interface FlowGroupData extends Omit<FlowGroup, 'group_type'> {
  group_type: 'gateway_flows' | 'device_flows';
}

const FlowGroupEditor: React.FC = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<FlowGroupData>({
    name: '',
    group_type: 'device_flows',
    flows: []
  });
  const [availableFlows, setAvailableFlows] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string>('');

  // Lade existierende Gruppe und verfügbare Flows
  useEffect(() => {
    loadAvailableFlows();
    if (groupId && groupId !== 'new') {
      loadGroup();
    }
  }, [groupId]);

  const loadGroup = async () => {
    if (!groupId || groupId === 'new') return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await flowApi.getGroup(groupId);
      if (response.status === 'success' && response.data) {
        // Konvertiere type zu group_type falls nötig
        const groupData = response.data;
        setGroup({
          ...groupData,
          group_type: groupData.type || groupData.group_type || 'device_flows'
        });
      } else {
        setError(response.error?.message || 'Fehler beim Laden der Flow-Gruppe');
      }
    } catch (err) {
      setError('Fehler beim Laden der Flow-Gruppe');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFlows = async () => {
    try {
      const response = await flowApi.list();
      if (response.status === 'success' && response.data) {
        setAvailableFlows(response.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der verfügbaren Flows:', err);
    }
  };

  const handleAddFlow = () => {
    if (!selectedFlow) return;

    setGroup(prev => ({
      ...prev,
      flows: [
        ...prev.flows,
        {
          flow_id: selectedFlow,
          priority: prev.flows.length + 1
        }
      ]
    }));
    setSelectedFlow('');
  };

  const handleRemoveFlow = (flowId: string) => {
    setGroup(prev => ({
      ...prev,
      flows: prev.flows.filter(f => f.flow_id !== flowId)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // Konvertiere group_type zu type für die API
      const apiGroup = {
        ...group,
        type: group.group_type
      };

      const response = groupId && groupId !== 'new'
        ? await flowApi.updateGroup(groupId, apiGroup)
        : await flowApi.createGroup(apiGroup);

      if (response.status === 'success') {
        navigate('/flow-groups');
      } else {
        setError(response.error?.message || 'Fehler beim Speichern der Flow-Gruppe');
      }
    } catch (err) {
      setError('Fehler beim Speichern der Flow-Gruppe');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Flow-Gruppe {groupId === 'new' ? 'erstellen' : 'bearbeiten'}</h5>
            <div className="d-flex gap-2 mt-2">
              <Form.Control
                type="text"
                value={group.name}
                onChange={(e) => setGroup(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name der Flow-Gruppe"
              />
              <Form.Select
                value={group.group_type}
                onChange={(e) => setGroup(prev => ({ ...prev, group_type: e.target.value as 'gateway_flows' | 'device_flows' }))}
                style={{ width: 'auto' }}
              >
                <option value="gateway_flows">Gateway Flows</option>
                <option value="device_flows">Device Flows</option>
              </Form.Select>
            </div>
          </div>
          <div>
            <Button
              variant="secondary"
              className="me-2"
              onClick={() => navigate('/flow-groups')}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!group.name}
            >
              <FontAwesomeIcon icon={faSave} className="me-2" />
              Speichern
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Lädt...</span>
              </div>
            </div>
          ) : (
            <Row>
              {/* Linke Spalte: Flow Liste */}
              <Col md={8}>
                <Card className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Flows in dieser Gruppe</h6>
                    <div className="d-flex gap-2">
                      <Form.Select
                        value={selectedFlow}
                        onChange={(e) => setSelectedFlow(e.target.value)}
                        style={{ width: 'auto' }}
                      >
                        <option value="">Flow auswählen...</option>
                        {availableFlows.map(flow => (
                          <option key={flow.id} value={flow.id}>
                            {flow.name} ({flow.flow_type})
                          </option>
                        ))}
                      </Form.Select>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleAddFlow}
                        disabled={!selectedFlow}
                      >
                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                        Hinzufügen
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {group.flows.length === 0 ? (
                      <p className="text-muted text-center">Keine Flows in dieser Gruppe</p>
                    ) : (
                      group.flows.map((flow, index) => {
                        const flowDetails = availableFlows.find(f => f.id === flow.flow_id);
                        return (
                          <div
                            key={flow.flow_id}
                            className="mb-2 p-2 border rounded"
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <span className="me-2">{index + 1}.</span>
                                <span>{flowDetails?.name || flow.flow_id}</span>
                                {flowDetails && (
                                  <span className="text-muted ms-2">({flowDetails.flow_type})</span>
                                )}
                              </div>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemoveFlow(flow.flow_id)}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Rechte Spalte: Hilfe & Info */}
              <Col md={4}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">Information</h6>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted mb-0">
                      Flow-Gruppen ermöglichen es Ihnen, mehrere Flows zu gruppieren und gemeinsam zu verwalten.
                      Die Flows werden in der angegebenen Reihenfolge ausgeführt.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FlowGroupEditor; 