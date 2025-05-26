import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from './PageTemplate';
import { Table, Button, Badge, Card, Spinner, Alert } from 'react-bootstrap';
import { Layers, Plus, Edit, Trash2, Copy } from 'lucide-react';
import { templateApi } from '../api';
import TemplateGroupModal from '../components/TemplateGroupModal';

const TemplateGroups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await templateApi.listGroups();
      if (response.status === 'success') {
        setGroups(response.data || []);
      } else {
        setError('Fehler beim Laden der Template-Gruppen');
      }
    } catch (err) {
      setError('Netzwerkfehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGroup(null);
    setShowModal(true);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setShowModal(true);
  };

  const handleDelete = async (groupId) => {
    if (window.confirm('Möchten Sie diese Template-Gruppe wirklich löschen?')) {
      try {
        await templateApi.deleteGroup(groupId);
        fetchGroups();
      } catch (err) {
        setError('Fehler beim Löschen der Gruppe');
      }
    }
  };

  const handleClone = async (group) => {
    try {
      const newGroup = {
        ...group,
        name: `${group.name} (Kopie)`,
        id: undefined
      };
      await templateApi.createGroup(newGroup);
      fetchGroups();
    } catch (err) {
      setError('Fehler beim Klonen der Gruppe');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingGroup(null);
    fetchGroups();
  };

  if (loading) {
    return (
      <PageTemplate title="Template-Gruppen" icon={<Layers size={18} />}>
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate 
      title="Template-Gruppen" 
      icon={<Layers size={18} />}
      description="Verwalten Sie Template-Gruppen für verschiedene Gerätetypen"
    >
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Template-Gruppen ({groups.length})</span>
          <Button variant="primary" size="sm" onClick={handleCreate}>
            <Plus size={16} className="me-1" />
            Neue Gruppe
          </Button>
        </Card.Header>
        <Card.Body>
          {groups.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Layers size={48} className="mb-3" />
              <p>Keine Template-Gruppen vorhanden</p>
              <Button variant="primary" onClick={handleCreate}>
                Erste Gruppe erstellen
              </Button>
            </div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Beschreibung</th>
                  <th>Templates</th>
                  <th>Verwendung</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <tr key={group.id}>
                    <td className="fw-bold">{group.name}</td>
                    <td>{group.description}</td>
                    <td>
                      <Badge bg="info">{group.templates?.length || 0} Templates</Badge>
                    </td>
                    <td>
                      <Badge bg="secondary">{group.usage_count || 0}x verwendet</Badge>
                    </td>
                    <td>{new Date(group.created_at).toLocaleDateString()}</td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-1"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        variant="outline-info" 
                        size="sm" 
                        className="me-1"
                        onClick={() => handleClone(group)}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <TemplateGroupModal 
        show={showModal}
        onHide={handleModalClose}
        group={editingGroup}
      />
    </PageTemplate>
  );
};

export default TemplateGroups; 