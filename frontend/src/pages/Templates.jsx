import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import { FileCode, Plus, Search, RefreshCw } from 'lucide-react';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import BasicTable from '../components/BasicTable';
import config, { API_VERSION } from '../config';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { templateApi } from '../api';

// Verwende die konfigurierte API-URL mit Version
const API_URL = `${config.apiBaseUrl}/${API_VERSION}`;

/**
 * Template-Verwaltungskomponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedProviderType, setSelectedProviderType] = useState('all');
  
  const navigate = useNavigate();
  const { id } = useParams();

  // Hersteller-Typen für Template-Regeln
  const providers = [
    { id: 'generic', name: 'Generisch - Standard' },
    { id: 'evalarm', name: 'evAlarm - Notfallalarmierung' },
    { id: 'roombanker', name: 'Roombanker - Smart Home' },
    { id: 'becker-antriebe', name: 'Becker-Antriebe - Gebäudeautomation' }
  ];

  // Templates laden
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Rufe Templates-Liste ab...");
        const response = await templateApi.list();
        console.log("Templates-Antwort erhalten:", response);
        
        if (response.status === 'success') {
          // Templates aus der Antwort extrahieren
          const templatesList = response.data || [];
          console.log("Template-Daten:", templatesList);
          setTemplates(templatesList);
          console.log("Templates gesetzt:", templatesList.length);
        } else {
          console.error("Fehlerhafte API-Antwort:", response);
          throw new Error(response.error?.message || 'Fehler beim Laden der Templates');
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Templates:', error);
        setError('Fehler beim Laden der Templates: ' + (error.message || 'Unbekannter Fehler'));
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleRefresh = () => {
    setTemplates([]);
    setLoading(true);
    const fetchTemplates = async () => {
      try {
        setError(null);
        const response = await templateApi.list();
        
        if (response.status === 'success') {
          const templatesList = response.data || [];
          setTemplates(templatesList);
          setSuccess('Templates erfolgreich aktualisiert');
          
          // Erfolgsbenachrichtigung nach 3 Sekunden ausblenden
          setTimeout(() => setSuccess(null), 3000);
        } else {
          throw new Error(response.error?.message || 'Fehler beim Laden der Templates');
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Templates:', error);
        setError('Fehler beim Laden der Templates: ' + (error.message || 'Unbekannter Fehler'));
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  };

  const handleCreateTemplate = () => {
    navigate('/templates/new');
  };

  const handleTemplateSelect = (template) => {
    navigate(`/templates/${template.id}`);
  };

  // Filtere Templates basierend auf dem ausgewählten Provider-Typ
  const filteredTemplates = useMemo(() => {
    if (selectedProviderType === 'all') return templates;
    return templates.filter(template => template.provider_type === selectedProviderType);
  }, [templates, selectedProviderType]);

  // Spalten-Definition für die Template-Tabelle
  const templateColumns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 250,
      },
      {
        accessorKey: 'provider_type',
        header: 'Anbieter-Typ',
        size: 200,
        cell: ({ row }) => {
          const providerType = row.original.provider_type || 'generic';
          const provider = providers.find(p => p.id === providerType);
          return provider ? provider.name : providerType;
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Erstellt',
        size: 180,
        cell: ({ row }) => {
          const date = row.original.created_at 
            ? new Date(row.original.created_at) 
            : new Date();
          return date.toLocaleString('de-DE');
        },
      },
      {
        id: 'actions',
        header: 'Aktionen',
        size: 120,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleTemplateSelect(row.original);
              }}
            >
              Details
            </Button>
          </div>
        ),
      },
    ],
    [providers]
  );

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <FileCode size={24} className="me-2" />
        Templates
      </h1>
      
      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}
      
      {/* 3. Filter- und Aktionsleiste */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Body className="d-flex">
              <Form.Group className="me-3 flex-grow-1">
                <Form.Label><strong>Anbieter-Typ</strong></Form.Label>
                <Form.Select 
                  value={selectedProviderType}
                  onChange={(e) => setSelectedProviderType(e.target.value)}
                >
                  <option value="all">Alle Anbieter</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <div className="d-flex align-items-end">
                <Button variant="outline-primary" className="me-2" onClick={handleRefresh}>
                  <RefreshCw size={16} className="me-1" />
                  Aktualisieren
                </Button>
                <Button variant="primary" onClick={handleCreateTemplate}>
                  <Plus size={16} className="me-1" />
                  Neues Template
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* 4. Template-Tabelle */}
      <Row>
        <Col>
          <Card>
            <Card.Header>Templates</Card.Header>
            <Card.Body>
              <BasicTable 
                data={filteredTemplates}
                columns={templateColumns}
                isLoading={loading}
                emptyMessage="Keine Templates vorhanden."
                onRowClick={handleTemplateSelect}
                enableGlobalFilter={true}
                enablePagination={true}
                enableSorting={true}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* 5. Outlet für verschachtelte Routen (TemplateDetailDrawer) */}
      <Outlet />
    </>
  );
};

export default Templates;
