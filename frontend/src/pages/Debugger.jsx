import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tab, Nav, Form, Button, ListGroup, Badge, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBug, faSync, faSearch, faDownload, faFilter, faServer, faNetworkWired, faDatabase, faCogs, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import MessageDebugger from './MessageDebugger';
import { logApi } from '../api';

const Debugger = () => {
  // State für die Logs-Komponente
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('messages');
  const [selectedComponent, setSelectedComponent] = useState('all');
  const [logLevel, setLogLevel] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState(null);

  // Array der verfügbaren Komponenten
  const components = [
    { id: 'all', name: 'Alle Komponenten', icon: faCogs },
    { id: 'gateway', name: 'Gateway', icon: faNetworkWired },
    { id: 'api', name: 'API Service', icon: faServer },
    { id: 'processor', name: 'Message Processor', icon: faServer },
    { id: 'mongo', name: 'Datenbank', icon: faDatabase }
  ];

  // Array der verfügbaren Log-Level
  const logLevels = [
    { id: 'all', name: 'Alle Level', badge: 'secondary' },
    { id: 'error', name: 'Fehler', badge: 'danger' },
    { id: 'warning', name: 'Warnungen', badge: 'warning' },
    { id: 'info', name: 'Info', badge: 'info' },
    { id: 'debug', name: 'Debug', badge: 'light' }
  ];

  // Laden der Logs von der API
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await logApi.list({
        component: selectedComponent,
        level: logLevel,
        limit: 100,
        query: searchQuery
      });
      
      if (response.status === 'success' && response.data) {
        setLogs(response.data.logs || []);
        setFilteredLogs(response.data.logs || []);
      } else {
        throw new Error(response.error?.message || 'Fehler beim Laden der Logs');
      }
    } catch (err) {
      console.error('Fehler beim Abrufen der Logs:', err);
      setError('Fehler beim Laden der Logs: ' + err.message);
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Effekt zum Laden der Logs beim ersten Rendern und bei Filteränderungen
  useEffect(() => {
    fetchLogs();
  }, [selectedComponent, logLevel, searchQuery]);

  // Auto-Refresh-Effekt
  useEffect(() => {
    let intervalId;
    
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchLogs();
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Manuelles Aktualisieren der Logs
  const handleRefresh = () => {
    fetchLogs();
  };

  // Herunterladen der Logs als JSON-Datei
  const handleDownloadLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'system_logs_' + new Date().toISOString() + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Formatierung des Zeitstempels
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('de-DE');
    } catch (e) {
      return timestamp;
    }
  };

  // Farbe basierend auf Log-Level
  const getLevelBadgeColor = (level) => {
    switch (level) {
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'light';
      default: return 'secondary';
    }
  };

  return (
    <Container fluid>
      <h1 className="page-title mb-4">
        <FontAwesomeIcon icon={faBug} className="icon" />
        Debugger
      </h1>

      <Tab.Container id="debugger-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Row>
          <Col md={12}>
            <Nav variant="tabs" className="mb-3">
              <Nav.Item>
                <Nav.Link eventKey="messages">Nachrichten</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="system-logs">System-Logs</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>

        <Tab.Content>
          {/* Nachrichten-Tab */}
          <Tab.Pane eventKey="messages">
            <MessageDebugger />
          </Tab.Pane>

          {/* System-Logs-Tab */}
          <Tab.Pane eventKey="system-logs">
            <Row>
              {/* Linke Spalte: Filter und Komponenten */}
              <Col md={3}>
                <Card className="mb-4">
                  <Card.Header>Komponenten</Card.Header>
                  <ListGroup variant="flush">
                    {components.map(component => (
                      <ListGroup.Item 
                        key={component.id}
                        action 
                        active={selectedComponent === component.id}
                        onClick={() => setSelectedComponent(component.id)}
                      >
                        <FontAwesomeIcon icon={component.icon} className="me-2" />
                        {component.name}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card>

                <Card className="mb-4">
                  <Card.Header>Log-Level</Card.Header>
                  <ListGroup variant="flush">
                    {logLevels.map(level => (
                      <ListGroup.Item 
                        key={level.id}
                        action 
                        active={logLevel === level.id}
                        onClick={() => setLogLevel(level.id)}
                      >
                        <Badge bg={level.badge} className="me-2">
                          {level.id !== 'all' ? level.id.toUpperCase() : 'ALL'}
                        </Badge>
                        {level.name}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card>

                <Card>
                  <Card.Header>Aktualisierung</Card.Header>
                  <Card.Body>
                    <Form.Check 
                      type="switch"
                      id="auto-refresh-switch"
                      label="Automatische Aktualisierung"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="mb-3"
                    />
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Intervall (ms)</Form.Label>
                      <Form.Control 
                        type="number" 
                        min="1000" 
                        step="1000"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                        disabled={!autoRefresh}
                      />
                    </Form.Group>

                    <Button 
                      variant="primary" 
                      className="w-100" 
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <FontAwesomeIcon icon={faSync} className="me-2" />
                      {loading ? 'Wird geladen...' : 'Jetzt aktualisieren'}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>

              {/* Rechte Spalte: Logs anzeigen */}
              <Col md={9}>
                <Card className="mb-4">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>System-Logs ({filteredLogs.length})</div>
                    <div>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={handleDownloadLogs}
                        disabled={filteredLogs.length === 0}
                      >
                        <FontAwesomeIcon icon={faDownload} className="me-1" />
                        Logs exportieren
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <InputGroup className="mb-3">
                      <InputGroup.Text>
                        <FontAwesomeIcon icon={faSearch} />
                      </InputGroup.Text>
                      <Form.Control
                        placeholder="Logs durchsuchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Button 
                        variant="outline-secondary"
                        onClick={() => setSearchQuery('')}
                        disabled={!searchQuery}
                      >
                        Löschen
                      </Button>
                    </InputGroup>

                    {error && (
                      <div className="alert alert-danger mb-3">
                        {error}
                      </div>
                    )}

                    {loading ? (
                      <div className="text-center p-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Lädt...</span>
                        </div>
                        <p className="mt-3">Logs werden geladen...</p>
                      </div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="text-center p-5">
                        <FontAwesomeIcon icon={faExclamationCircle} className="display-4 text-muted mb-3" />
                        <p className="lead">Keine Logs gefunden</p>
                        <p className="text-muted">Versuchen Sie, die Filter anzupassen oder die Logs zu aktualisieren.</p>
                      </div>
                    ) : (
                      <div style={{ height: '600px', overflowY: 'auto' }}>
                        <ListGroup>
                          {filteredLogs.map(log => (
                            <ListGroup.Item key={log.id} className="mb-2 border">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <div>
                                  <Badge bg={getLevelBadgeColor(log.level)} className="me-2">
                                    {log.level.toUpperCase()}
                                  </Badge>
                                  <span className="text-muted me-2">
                                    [{log.component}]
                                  </span>
                                </div>
                                <small className="text-muted">
                                  {formatTimestamp(log.timestamp)}
                                </small>
                              </div>
                              <div className="log-message">
                                {log.message}
                              </div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default Debugger; 