import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { GitBranch, Plus, RefreshCw } from 'lucide-react';
import { useNavigate, Outlet } from 'react-router-dom';
import { flowApi } from '../api/flowApi';
import BasicTable from '../components/BasicTable';

const Flows = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Daten laden
  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await flowApi.list();
      if (response.status === 'success') {
        setFlows(response.data);
      } else {
        setError(response.error?.message || 'Fehler beim Laden der Flows');
      }
    } catch (err) {
      setError('Fehler beim Laden der Flows');
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
      header: 'Typ',
      accessor: 'flow_type',
      cell: (value) => value === 'gateway_flow' ? 'Gateway Flow' : 'Device Flow'
    },
    {
      header: 'Version',
      accessor: 'version'
    },
    {
      header: 'Steps',
      accessor: 'steps',
      cell: (value) => value.length
    },
    {
      header: 'Aktionen',
      accessor: 'id',
      cell: (value) => (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => navigate(`/flows/${value}`)}
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
          <GitBranch className="me-2" />
          Flows
        </h1>
        <div>
          <Button
            variant="outline-secondary"
            className="me-2"
            onClick={loadFlows}
            disabled={loading}
          >
            <RefreshCw size={16} className="me-2" />
            Aktualisieren
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/flows/new')}
          >
            <Plus size={16} className="me-2" />
            Neuer Flow
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
          <h6 className="mb-0">Flow-Übersicht</h6>
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
              data={flows}
              columns={columns}
              noDataText="Keine Flows vorhanden"
            />
          )}
        </Card.Body>
      </Card>

      <Outlet />
    </>
  );
};

export default Flows; 