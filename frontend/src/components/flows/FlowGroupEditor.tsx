import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { X } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { flowApi, FlowGroup } from '../../api/flowApi';

const FlowGroupEditor: React.FC = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<FlowGroup>({
    name: '',
    flows: []
  });

  // Lade existierende Gruppe, wenn groupId vorhanden
  useEffect(() => {
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
        setGroup(response.data);
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

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = groupId && groupId !== 'new'
        ? await flowApi.updateGroup(groupId, group)
        : await flowApi.createGroup(group);

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
    <div className="border-start h-100" style={{ width: '500px' }}>
      <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{groupId === 'new' ? 'Neue Flow-Gruppe' : 'Flow-Gruppe bearbeiten'}</h5>
        <Link to="/flow-groups" className="btn btn-link p-0 border-0">
          <X size={20} />
        </Link>
      </div>

      <div className="p-3">
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
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={group.name}
                onChange={(e) => setGroup(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name der Flow-Gruppe"
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Link
                to="/flow-groups"
                className="btn btn-secondary"
              >
                Abbrechen
              </Link>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!group.name}
              >
                Speichern
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
};

export default FlowGroupEditor; 