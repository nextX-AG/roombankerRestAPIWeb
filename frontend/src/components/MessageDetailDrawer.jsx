import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import { Table, Badge, Button, Alert, Nav, Tab } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Copy, ArrowLeft, Check, X } from 'lucide-react';
import { messageApi } from '../api';
import config from '../config';

/**
 * MessageDetailDrawer - Zeigt Details einer ausgewählten Nachricht in einem Drawer an
 * Diese Komponente wird durch die Route /messages/:messageId geladen
 */
const MessageDetailDrawer = () => {
  const { messageId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('raw');
  const [debugResult, setDebugResult] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    const fetchMessage = async () => {
      if (!messageId) return;
      
      setLoading(true);
      try {
        // In einer echten Implementierung würden wir eine API-Methode zum Abrufen einer einzelnen Nachricht verwenden
        // Da diese Methode möglicherweise noch nicht existiert, rufen wir alle Nachrichten ab und filtern
        const response = await messageApi.list();
        if (response.status === 'success' && response.data) {
          const messages = response.data || [];
          const foundMessage = messages.find(m => m.id === messageId);
          
          if (foundMessage) {
            setMessage(foundMessage);
            
            // Automatisch Debug-Infos laden, wenn die Nachricht erfolgreich geladen wurde
            loadDebugInfo(foundMessage);
          } else {
            setError('Nachricht nicht gefunden');
          }
        } else {
          throw new Error(response.error?.message || 'Fehler beim Laden der Nachricht');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Nachrichtdetails:', error);
        setError('Nachricht konnte nicht geladen werden: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessage();
  }, [messageId]);

  // Automatisch Debug-Informationen laden
  const loadDebugInfo = async (msg) => {
    try {
      setDebugLoading(true);
      
      // Der Netzwerk-Call muss eine msg.gateway_id und eine msg.message haben
      const debugPayload = {
        gateway_id: getGatewayId(msg),
        message: msg.content || msg
      };
      
      // API-Aufruf zum Debugging der Nachricht
      const response = await messageApi.debugMessage(debugPayload);
      
      if (response.status === 'success') {
        setDebugResult(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Debug-Informationen:', error);
    } finally {
      setDebugLoading(false);
    }
  };

  // Hilfsfunktionen
  const getGatewayId = (message) => {
    if (!message) return 'Unbekanntes Gateway';
    
    try {
      if (message.content && message.content.gateway_id) {
        return message.content.gateway_id;
      }
      const contentStr = JSON.stringify(message);
      const match = contentStr.match(/"gateway_id"\s*:\s*"([^"]+)"/);
      return match ? match[1] : 'Unbekanntes Gateway';
    } catch (e) {
      return 'Unbekanntes Gateway';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unbekannt';
    
    try {
      // 1. Unix-Zeitstempel (Sekunden)
      if (typeof timestamp === 'number' || (!isNaN(Number(timestamp)) && String(timestamp).length <= 10)) {
        const date = new Date(Number(timestamp) * 1000);
        return date.toLocaleString('de-DE');
      }
      
      // 2. Millisekunden-Zeitstempel
      if (!isNaN(Number(timestamp)) && String(timestamp).length > 10) {
        const date = new Date(Number(timestamp));
        return date.toLocaleString('de-DE');
      }
      
      // 3. ISO-String
      if (typeof timestamp === 'string' && timestamp.includes('T')) {
        const date = new Date(timestamp.replace('Z', '+00:00'));
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

  const getCorrectDate = (message) => {
    if (!message) return 'Unbekannt';
    
    if (message.received_at) {
      return formatTimestamp(message.received_at);
    }
    if (message.data && message.data.received_at) {
      return formatTimestamp(message.data.received_at);
    }
    return formatTimestamp(message.timestamp);
  };
  
  const copyToClipboard = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('JSON in Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
      alert('Fehler beim Kopieren: ' + error.message);
    }
  };

  const renderApiResponseBadge = (statusCode) => {
    if (!statusCode) return <Badge bg="secondary">Keine Daten</Badge>;
    
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge bg="success">Erfolgreich ({statusCode})</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge bg="warning">Client-Fehler ({statusCode})</Badge>;
    } else if (statusCode >= 500) {
      return <Badge bg="danger">Server-Fehler ({statusCode})</Badge>;
    } else {
      return <Badge bg="secondary">{statusCode}</Badge>;
    }
  };

  const drawerContent = () => {
    if (loading) {
      return <div className="text-center p-5">Lade Nachrichtendaten...</div>;
    }
    
    if (error) {
      return (
        <>
          <Alert variant="danger" className="mb-4">{error}</Alert>
          <Button variant="secondary" onClick={() => navigate('/messages')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    if (!message) {
      return (
        <>
          <Alert variant="warning" className="mb-4">Nachricht nicht gefunden</Alert>
          <Button variant="secondary" onClick={() => navigate('/messages')}>
            <ArrowLeft size={16} className="me-2" />
            Zurück zur Übersicht
          </Button>
        </>
      );
    }
    
    return (
      <>
        <h5>Metadaten</h5>
        <Table bordered size="sm" className="mb-3">
          <tbody>
            <tr>
              <th style={{ width: '150px' }}>ID</th>
              <td>{message.id}</td>
            </tr>
            <tr>
              <th>Empfangen</th>
              <td>{getCorrectDate(message)}</td>
            </tr>
            <tr>
              <th>Gateway</th>
              <td>{getGatewayId(message)}</td>
            </tr>
            {(message.result || (debugResult && debugResult.result)) && (
              <tr>
                <th>API-Antwort</th>
                <td>
                  {renderApiResponseBadge(message.result?.response_status || debugResult?.result?.response_status)}
                </td>
              </tr>
            )}
            {(message.error || (debugResult && debugResult.error)) && (
              <tr>
                <th>Fehler</th>
                <td>
                  <span className="text-danger">
                    {message.error || debugResult?.error || 'Unbekannter Fehler'}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        <Tab.Container id="message-details-tabs" activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="raw">Empfangene Nachricht</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="normalized" disabled={!debugResult?.normalized_data}>
                Normalisierte Daten {debugLoading ? '(lädt...)' : ''}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="transformed" disabled={!message.result?.transformed_message && !debugResult?.transformed_message}>
                Transformierte Nachricht {debugLoading ? '(lädt...)' : ''}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="response" disabled={!message.result?.api_response && !debugResult?.api_response}>
                API Response {debugLoading ? '(lädt...)' : ''}
              </Nav.Link>
            </Nav.Item>
          </Nav>
          
          <div className="mb-2 d-flex justify-content-end">
            <Button 
              size="sm" 
              variant="outline-secondary"
              onClick={() => copyToClipboard(
                activeTab === 'raw' ? (message.content || message) :
                activeTab === 'normalized' ? debugResult?.normalized_data :
                activeTab === 'transformed' ? (message.result?.transformed_message || debugResult?.transformed_message) :
                activeTab === 'response' ? (message.result?.api_response || debugResult?.api_response) :
                message
              )}
            >
              <Copy size={16} className="me-1" />
              Kopieren
            </Button>
          </div>
          
          <Tab.Content>
            <Tab.Pane eventKey="raw">
              <div className="border rounded bg-light" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <JsonView data={message.content || message} />
              </div>
            </Tab.Pane>
            
            <Tab.Pane eventKey="normalized">
              {debugResult?.normalized_data ? (
                <div className="border rounded bg-light" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <JsonView data={debugResult.normalized_data} />
                </div>
              ) : (
                <Alert variant="info">
                  Keine normalisierten Daten verfügbar
                  {debugLoading && ' (Lade Daten...)'}
                </Alert>
              )}
            </Tab.Pane>
            
            <Tab.Pane eventKey="transformed">
              {message.result?.transformed_message || debugResult?.transformed_message ? (
                <div className="border rounded bg-light" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <JsonView data={message.result?.transformed_message || debugResult?.transformed_message} />
                </div>
              ) : (
                <Alert variant="info">
                  Keine transformierte Nachricht verfügbar
                  {debugLoading && ' (Lade Daten...)'}
                </Alert>
              )}
            </Tab.Pane>
            
            <Tab.Pane eventKey="response">
              {message.result?.api_response || debugResult?.api_response ? (
                <div className="border rounded bg-light" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <JsonView data={message.result?.api_response || debugResult?.api_response} />
                </div>
              ) : (
                <Alert variant="info">
                  Keine API-Antwort verfügbar
                  {debugLoading && ' (Lade Daten...)'}
                </Alert>
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
        
        {debugLoading && (
          <div className="text-center p-3">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Lade Debug-Informationen...
          </div>
        )}
        
        <div className="mt-3">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/messages')}>
            <ArrowLeft size={16} className="me-1" />
            Zurück
          </Button>
        </div>
      </>
    );
  };

  return (
    <Drawer
      show={true}
      onClose={() => navigate('/messages')}
      title="Nachrichtendetails"
    >
      {drawerContent()}
    </Drawer>
  );
};

export default MessageDetailDrawer; 