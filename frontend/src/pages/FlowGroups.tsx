import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { GitMerge, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { flowApi } from '../api/flowApi';
import BasicTable from '../components/BasicTable';

const FlowGroups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Daten laden
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await flowApi.listGroups();
      if (response.status === 'success') {
        setGroups(response.data);
      } else {
        setError(response.error?.message || 'Fehler beim Laden der Flow-Gruppen');
      }
    } catch (err) {
      setError('Fehler beim Laden der Flow-Gruppen');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Tabellen-Spalten definieren
  const columns = [
    {
      header: 'Name',
      accessor: 'name'
    },
    {
      header: 'Flows',
      accessor: 'flows',
      cell: (value) => value.length
    },
    {
      header: 'Aktionen',
      accessor: 'id',
      cell: (value) => (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => navigate(`/flow-groups/${value}`)}
        >
          Bearbeiten
        </Button>
      )
    }
  ];

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title">
          <GitMerge className="me-2" />
          Flow-Gruppen
        </h1>
        <div>
          <Button
            variant="outline-secondary"
            className="me-2"
            onClick={loadGroups}
            disabled={loading}
          >
            <RefreshCw size={16} className="me-2" />
            Aktualisieren
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/flow-groups/new')}
          >
            <Plus size={16} className="me-2" />
            Neue Flow-Gruppe
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h6 className="mb-0">Flow-Gruppen-Übersicht</h6>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Lädt...</span>
              </div>
            </div>
          ) : (
            <BasicTable
              data={groups}
              columns={columns}
              noDataText="Keine Flow-Gruppen vorhanden"
            />
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default FlowGroups; 