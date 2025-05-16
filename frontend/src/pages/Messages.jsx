import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Form, Alert, InputGroup, Badge, Nav, Tab, Accordion, Modal } from 'react-bootstrap';
import { RefreshCw, Inbox, Bug, Copy, Filter, ListFilter } from 'lucide-react';
import { messageApi, customerApi } from '../api';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import config, { API_VERSION } from '../config';
import BasicTable from '../components/BasicTable';
import { useNavigate, useParams, Outlet } from 'react-router-dom';

// Verwende die konfigurierte API-URL mit Version
const API_URL = `${config.apiBaseUrl}/${API_VERSION}`;
const WORKER_URL = `${config.workerUrl}/${API_VERSION}`;

/**
 * Nachrichten-Verwaltungskomponente
 * 
 * Struktur folgt dem PageTemplate:
 * 1. Seiten-Titel mit Icon (h1.page-title)
 * 2. Fehler/Erfolgs-Anzeigen (Alert)
 * 3. Inhalt in Karten mit konsistenten Headers
 */
const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [forwardingStatus, setForwardingStatus] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [queueStatus, setQueueStatus] = useState({});
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [activeTab, setActiveTab] = useState('all-messages');
  
  const navigate = useNavigate();
  const { messageId } = useParams();

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await messageApi.list();
      if (response.status === 'success' && response.data) {
        let messagesList = response.data || [];
        
        // Stelle sicher, dass alle Nachrichten ein received_at-Feld haben
        messagesList = messagesList.map(msg => {
          if (!msg.received_at) {
            // Wenn kein received_at, erstelle es aus timestamp
            return {
              ...msg,
              received_at: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString()
            };
          }
          return msg;
        });
        
        // Sortiere nach received_at (neueste zuerst)
        messagesList.sort((a, b) => {
          const dateA = new Date(a.received_at || 0);
          const dateB = new Date(b.received_at || 0);
          return dateB - dateA;
        });
        
        setMessages(Array.isArray(messagesList) ? messagesList : []);
        setError(null);
      } else {
        throw new Error(response.error?.message || 'Keine Daten in der Antwort');
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Nachrichten:', error);
      setError('Fehler beim Abrufen der Nachrichten: ' + error.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchForwardingStatus = async () => {
    try {
      setLoadingStatus(true);
      
      // Hole Weiterleitungsstatus
      const forwardingResponse = await messageApi.forwarding();
      if (forwardingResponse.status === 'success' && forwardingResponse.data) {
        const forwardingData = forwardingResponse.data || { details: { completed: [], failed: [] } };
        setForwardingStatus([
          ...(forwardingData.details?.completed || []),
          ...(forwardingData.details?.failed || [])
        ]);
      }
      
      // Hole Queue-Status
      const queueResponse = await messageApi.queueStatus();
      if (queueResponse.status === 'success' && queueResponse.data) {
        const queueData = queueResponse.data || {};
        setQueueStatus(queueData);
      }
      
      setError(null);
    } catch (error) {
      console.error('Fehler beim Abrufen des Weiterleitungsstatus:', error);
      setError('Fehler beim Abrufen des Weiterleitungsstatus: ' + error.message);
      setForwardingStatus([]);
      setQueueStatus({});
    } finally {
      setLoadingStatus(false);
    }
  };
  
  // Lade verfügbare Kunden für die Filterung
  const fetchCustomers = async () => {
    try {
      const response = await customerApi.list();
      if (response.status === 'success') {
        setCustomers(response.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchForwardingStatus();
    fetchCustomers();
    
    // Alle 10 Sekunden aktualisieren
    const interval = setInterval(() => {
      fetchMessages();
      fetchForwardingStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Überprüfe, ob ein messageId in der URL vorhanden ist
  useEffect(() => {
    if (messageId) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        setSelectedMessage(message);
        setShowDetailDrawer(true);
      }
    }
  }, [messageId, messages]);

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
    setShowDetailDrawer(true);
    navigate(`/messages/${message.id}`);
  };

  const handleCloseDrawer = () => {
    setShowDetailDrawer(false);
    setSelectedMessage(null);
    navigate('/messages');
  };

  const handleRefresh = () => {
    fetchMessages();
    fetchForwardingStatus();
  };

  // Hilfsfunktionen
  const getGatewayId = (message) => {
    try {
      // Versuche die gateway_id aus dem Inhalt zu extrahieren
      if (message.content && typeof message.content === 'object' && message.content.gateway_id) {
        return message.content.gateway_id;
      }
      // Fallback: Suche in der gesamten Nachricht nach gateway_id
      const contentStr = JSON.stringify(message);
      const match = contentStr.match(/"gateway_id"\s*:\s*"([^"]+)"/);
      return match ? match[1] : 'Unbekanntes Gateway';
    } catch (e) {
      return 'Unbekanntes Gateway';
    }
  };

  const getDeviceType = (message) => {
    try {
      // Prüfe auf alarmtype
      if (message.content && message.content.alarmtype) {
        return message.content.alarmtype.charAt(0).toUpperCase() + message.content.alarmtype.slice(1);
      }
      
      // Prüfe auf subdevicelist
      if (message.content && message.content.subdevicelist && message.content.subdevicelist.length > 0) {
        const device = message.content.subdevicelist[0];
        if (device.values && device.values.alarmtype) {
          return device.values.alarmtype.charAt(0).toUpperCase() + device.values.alarmtype.slice(1);
        }
      }
      
      // Fallbacks
      if (message.type) {
        return message.type.charAt(0).toUpperCase() + message.type.slice(1);
      }
      
      return 'Unbekannter Typ';
    } catch (e) {
      return 'Unbekannter Typ';
    }
  };
  
  // Finde die Kunden-ID aus der Gateway-ID (falls Gateway einem Kunden zugeordnet ist)
  const getCustomerIdFromGateway = (message) => {
    const gatewayId = getGatewayId(message);
    // Diese Funktion müsste angepasst werden, um tatsächlich den Kunden einer Gateway-ID zu finden
    // Hier nur als Platzhalter implementiert
    return message.customer_id || '';
  };

  // Filtere Nachrichten nach ausgewähltem Kunden
  const filteredMessages = useMemo(() => {
    if (!selectedCustomerId) return messages;
    
    return messages.filter(message => {
      // Direkte Kunden-ID in der Nachricht
      if (message.customer_id === selectedCustomerId) return true;
      
      // Kunden-ID über Gateway-Zuordnung finden
      const customerIdFromGateway = getCustomerIdFromGateway(message);
      return customerIdFromGateway === selectedCustomerId;
    });
  }, [messages, selectedCustomerId]);

  // Formatiere Zeitstempel für bessere Lesbarkeit
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unbekannt';
    
    try {
      // 1. Wenn es ein Unix-Zeitstempel als Zahl ist (Sekunden seit 1970)
      if (typeof timestamp === 'number' || (!isNaN(Number(timestamp)) && String(timestamp).length <= 10)) {
        const numericTimestamp = Number(timestamp);
        const date = new Date(numericTimestamp * 1000);
        return date.toLocaleString('de-DE');
      }
      
      // 2. Wenn es eine große Zahl ist (Millisekunden seit 1970)
      if (!isNaN(Number(timestamp)) && String(timestamp).length > 10) {
        const date = new Date(Number(timestamp));
        return date.toLocaleString('de-DE');
      }
      
      // 3. ISO-String
      if (typeof timestamp === 'string' && timestamp.includes('T')) {
        const normalizedTimestamp = timestamp.replace('Z', '+00:00');
        const date = new Date(normalizedTimestamp);
        if (!isNaN(date.getTime())) { 
          return date.toLocaleString('de-DE');
        }
      }
      
      // 4. Standard-Fallback
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('de-DE');
      }
      
      // 5. Wenn alles fehlschlägt
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };

  // Hilfsfunktion zum Extrahieren des korrekten empfangenen Datums
  const getCorrectDate = (message) => {
    // Direkt received_at aus dem Nachrichtenobjekt verwenden, wenn vorhanden
    if (message.received_at) {
      return formatTimestamp(message.received_at);
    }
    
    // Wenn message.data und received_at vorhanden, dieses verwenden
    if (message.data && message.data.received_at) {
      return formatTimestamp(message.data.received_at);
    }
    
    // Fallback auf Timestamp
    return formatTimestamp(message.timestamp);
  };

  // Bestimme die Typ-Farbe für visuelle Unterscheidung
  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'alarm':
      case 'panic':
        return 'danger';
      case 'status':
        return 'info';
      case 'temperature':
        return 'primary';
      case 'humidity':
        return 'success';
      default:
        return 'secondary';
    }
  };

  // Kürze lange IDs für die Anzeige
  const shortenId = (id) => {
    if (!id) return 'N/A';
    if (id.length > 12) {
      return id.substring(0, 8) + '...';
    }
    return id;
  };

  // Status einer Nachricht formatieren
  const formatForwardingStatus = (status) => {
    switch(status) {
      case 'completed':
        return <Badge bg="success">Erfolgreich</Badge>;
      case 'failed':
        return <Badge bg="danger">Fehlgeschlagen</Badge>;
      case 'processing':
        return <Badge bg="warning">In Bearbeitung</Badge>;
      case 'pending':
        return <Badge bg="info">Ausstehend</Badge>;
      default:
        return <Badge bg="secondary">Unbekannt</Badge>;
    }
  };

  // Ziel der Weiterleitung formatieren
  const formatEndpoint = (endpoint) => {
    if (endpoint.startsWith('customer_')) {
      return `Kunde: ${endpoint.replace('customer_', '')}`;
    }
    return endpoint === 'evalarm_default' ? 'evAlarm (Standard)' : endpoint;
  };

  // Nachricht erneut versuchen
  const handleRetryMessage = async (messageId) => {
    try {
      const response = await messageApi.retry(messageId);
      if (response.status === 'success') {
        // Aktualisiere die Listen nach erfolgreicher Wiederholung
        fetchForwardingStatus();
        fetchMessages();
      } else {
        throw new Error(response.error?.message || 'Wiederholung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Fehler bei der Nachrichtenwiederholung:', error);
      setError('Fehler bei der Nachrichtenwiederholung: ' + error.message);
    }
  };

  // Funktion zum Kopieren von JSON in die Zwischenablage
  const copyToClipboard = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('JSON in Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
      alert('Fehler beim Kopieren: ' + error.message);
    }
  };

  // Funktion zum Debuggen der ausgewählten Nachricht
  const handleDebugMessage = async () => {
    try {
      setDebugLoading(true);
      
      // Prüfe, ob eine gültige Nachricht ausgewählt ist
      if (!selectedMessage) {
        throw new Error('Keine Nachricht ausgewählt');
      }
      
      // Der Netzwerk-Call muss eine msg.gateway_id und eine msg.message haben
      const debugPayload = {
        gateway_id: getGatewayId(selectedMessage),
        message: selectedMessage.content || selectedMessage
      };
      
      console.log('Debug-Anfrage-Payload:', debugPayload);
      
      // API-Aufruf zum Debugging der Nachricht
      const response = await messageApi.debugMessage(debugPayload);
      
      console.log('Debug-Antwort:', response);
      
      if (response.status === 'success') {
        // Setze die Debug-Ergebnisse
        setDebugResult(response.data);
        setShowDebugModal(true);
      } else {
        throw new Error(response.error?.message || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      console.error('Fehler beim Debugging der Nachricht:', error);
      alert(`Fehler beim Debugging: ${error.message}`);
    } finally {
      setDebugLoading(false);
    }
  };

  // Funktion zum Schließen des Debug-Modals
  const handleCloseDebugModal = () => {
    setShowDebugModal(false);
    setDebugResult(null);
  };
  
  // Spalten-Definition für die Nachrichten-Tabelle
  const messageColumns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 120,
        cell: ({ row }) => shortenId(row.original.id),
      },
      {
        accessorKey: 'received_at',
        header: 'Empfangen',
        size: 180,
        cell: ({ row }) => getCorrectDate(row.original),
      },
      {
        accessorKey: 'gateway_id',
        header: 'Gateway',
        size: 150,
        cell: ({ row }) => shortenId(getGatewayId(row.original)),
      },
      {
        accessorKey: 'type',
        header: 'Typ',
        size: 120,
        cell: ({ row }) => {
          const type = getDeviceType(row.original);
          return <Badge bg={getTypeColor(type)}>{type}</Badge>;
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
                handleMessageSelect(row.original);
              }}
            >
              Details
            </Button>
          </div>
        ),
      },
    ],
    []
  );
  
  // Spalten-Definition für die Weiterleitungstabelle
  const forwardingColumns = useMemo(
    () => [
      {
        accessorFn: (row) => formatTimestamp(row.completed_at || row.failed_at || row.created_at),
        header: 'Zeit',
        size: 180,
      },
      {
        accessorKey: 'template',
        header: 'Template',
        size: 140,
      },
      {
        accessorKey: 'endpoint',
        header: 'Ziel',
        size: 150,
        cell: ({ row }) => formatEndpoint(row.original.endpoint),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 130,
        cell: ({ row }) => formatForwardingStatus(row.original.status),
      },
      {
        id: 'actions',
        header: 'Aktionen',
        size: 180,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button 
              size="sm" 
              variant="outline-primary"
              className="me-1"
              onClick={(e) => {
                e.stopPropagation();
                if (row.original.message) {
                  handleMessageSelect(row.original.message);
                }
              }}
            >
              Details
            </Button>
            {row.original.status === 'failed' && (
              <Button 
                size="sm" 
                variant="outline-warning"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetryMessage(row.original.id);
                }}
              >
                Wiederholen
              </Button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      {/* 1. Seiten-Titel */}
      <h1 className="page-title mb-4">
        <Inbox size={24} className="me-2" />
        Nachrichten
      </h1>
      
      {/* 2. Fehler/Erfolgs-Anzeigen */}
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      
      {/* 3. Aktionsleiste mit Filtern und Aktualisieren */}
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Body className="d-flex">
              <Form.Group className="me-3 flex-grow-1">
                <Form.Label><strong>Kunde</strong></Form.Label>
                <Form.Select 
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Alle Kunden</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <div className="d-flex align-items-end">
                <Button variant="primary" onClick={handleRefresh}>
                  <RefreshCw size={16} className="me-1" />
                  Aktualisieren
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="small text-muted">Ausstehend</div>
                  <h4 className="mb-0">{queueStatus.pending_count || 0}</h4>
                </div>
                <div>
                  <div className="small text-muted">Fehlgeschlagen</div>
                  <h4 className="mb-0">{queueStatus.failed_count || 0}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 4. Tabs für verschiedene Nachrichtenansichten */}
      <Tab.Container 
        id="message-view-tabs" 
        defaultActiveKey="all-messages"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
      >
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="all-messages">Alle Nachrichten</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="forwarding-status">Weiterleitungsstatus</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* Alle Nachrichten Tab */}
          <Tab.Pane eventKey="all-messages">
            <Row>
              <Col>
                <Card>
                  <Card.Header>Nachrichten</Card.Header>
                  <Card.Body>
                    <BasicTable 
                      data={filteredMessages}
                      columns={messageColumns}
                      isLoading={loading}
                      emptyMessage="Keine Nachrichten vorhanden."
                      onRowClick={handleMessageSelect}
                      enableGlobalFilter={true}
                      enablePagination={true}
                      enableSorting={true}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>
          
          {/* Weiterleitungsstatus Tab */}
          <Tab.Pane eventKey="forwarding-status">
            <Row>
              <Col>
                <Card>
                  <Card.Header>Weiterleitungsstatus</Card.Header>
                  <Card.Body>
                    <BasicTable 
                      data={forwardingStatus}
                      columns={forwardingColumns}
                      isLoading={loadingStatus}
                      emptyMessage="Keine Weiterleitungsdaten vorhanden."
                      onRowClick={(row) => row.message && handleMessageSelect(row.message)}
                      enableGlobalFilter={true}
                      enablePagination={true}
                      enableSorting={true}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
      
      {/* 5. Nachrichtendetail-Drawer */}
      {/* Dieser Code wird entfernt, da wir nun Routing für den Drawer verwenden */}
      {/* <MessageDetailDrawer
        show={showDetailDrawer}
        onClose={handleCloseDrawer}
        message={selectedMessage}
        handleDebugMessage={handleDebugMessage}
        debugLoading={debugLoading}
        copyToClipboard={copyToClipboard}
      /> */}
      
      {/* 6. Debug-Modal für die Anzeige der Debug-Ergebnisse */}
      <Modal 
        show={showDebugModal} 
        onHide={handleCloseDebugModal}
        size="xl"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Nachrichtenverarbeitungs-Debug</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {debugResult ? (
            <div>
              <h5>Eingangsnachricht</h5>
              <div className="border p-3 rounded bg-light mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <JsonView data={debugResult.input_message || {}} />
              </div>
              
              <h5>Verarbeitete Nachricht</h5>
              <div className="border p-3 rounded bg-light mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <JsonView data={debugResult.processed_message || {}} />
              </div>
              
              {debugResult.rules_applied && (
                <>
                  <h5>Angewendete Regeln</h5>
                  <div className="border p-3 rounded bg-light mb-4">
                    <ul className="m-0">
                      {debugResult.rules_applied.map((rule, idx) => (
                        <li key={idx}>
                          {rule.rule_name || `Regel ${idx + 1}`}
                          {rule.result === false && <span className="text-danger"> (nicht angewendet)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              
              <h5>Empfänger</h5>
              <div className="border p-3 rounded bg-light mb-4">
                {debugResult.endpoints && debugResult.endpoints.length > 0 ? (
                  <ul className="m-0">
                    {debugResult.endpoints.map((endpoint, idx) => (
                      <li key={idx}>{formatEndpoint(endpoint)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0">Keine Empfänger bestimmt</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-4">Keine Debug-Daten vorhanden.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDebugModal}>
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Outlet für verschachtelte Routen */}
      <Outlet />
    </>
  );
};

export default Messages;
