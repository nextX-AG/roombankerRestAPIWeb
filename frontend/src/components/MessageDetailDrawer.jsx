import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import { Table, Badge, Button, Alert, Card, ButtonGroup } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Copy, ArrowLeft, Check, X, Zap, FileCode } from 'lucide-react';
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
  
  const copyToClipboard = (data, title = '') => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert(`${title || 'JSON'} in Zwischenablage kopiert!`);
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
      alert('Fehler beim Kopieren: ' + error.message);
    }
  };

  // Öffne den Template-Generator mit der aktuellen Nachricht
  const openTemplateGenerator = () => {
    if (!message) return;
    
    // Wir serialisieren die Nachricht und benutzen sie als URL-Parameter
    // In einer echten Anwendung würden wir sie im State speichern und weitergeben
    try {
      // URL zum Template-Generator mit der aktuellen Nachricht
      const encoded = encodeURIComponent(JSON.stringify(message.content || message));
      const url = `/visual-template-generator?message=${encoded}`;
      
      // Navigiere zur Seite
      navigate(url);
    } catch (error) {
      console.error('Fehler beim Öffnen des Template-Generators:', error);
      alert('Fehler beim Öffnen des Template-Generators: ' + error.message);
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

  // Render eine JSON-Sektion mit Titel, Copy-Button und Inhalt
  const renderJsonSection = (title, data, expanded = false) => {
    if (!data) return null;
    
    return (
      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light">
          <h6 className="mb-0">{title}</h6>
          <Button 
            size="sm" 
            variant="outline-secondary"
            onClick={() => copyToClipboard(data, title)}
          >
            <Copy size={16} className="me-1" />
            Kopieren
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="border-0 rounded-0 bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <JsonView data={data} />
          </div>
        </Card.Body>
      </Card>
    );
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
      <div className="message-detail-content" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <h5 className="d-flex justify-content-between align-items-center mb-3">
          <span>Metadaten</span>
          <Button 
            variant="success" 
            size="sm" 
            onClick={openTemplateGenerator}
          >
            <FileCode size={16} className="me-1" />
            Template erstellen
          </Button>
        </h5>
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

        {/* Empfangene Nachricht */}
        {renderJsonSection('Empfangene Nachricht', message.content || message, true)}
        
        {/* Extrahierte Nachrichten-Eigenschaften (falls verfügbar) */}
        {debugResult?.extracted_properties && renderJsonSection('Extrahierte Eigenschaften', debugResult.extracted_properties)}
        
        {/* Normalisierte Daten */}
        {debugResult?.normalized_data && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Normalisierte Daten</h6>
              <ButtonGroup>
                <Button 
                  size="sm" 
                  variant="outline-success"
                  onClick={openTemplateGenerator}
                >
                  <Zap size={16} className="me-1" />
                  Template erstellen
                </Button>
                <Button 
                  size="sm" 
                  variant="outline-secondary"
                  onClick={() => copyToClipboard(debugResult.normalized_data, 'Normalisierte Daten')}
                >
                  <Copy size={16} className="me-1" />
                  Kopieren
                </Button>
              </ButtonGroup>
            </div>
            <Card>
              <Card.Body className="p-0">
                <div className="border-0 rounded-0 bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <JsonView data={debugResult.normalized_data} />
                </div>
              </Card.Body>
            </Card>
          </div>
        )}
        
        {/* Filterregeln (falls verfügbar) */}
        {debugResult?.filter_results && renderJsonSection('Filter-Ergebnisse', debugResult.filter_results)}
        
        {/* Transformierte Nachricht */}
        {(message.result?.transformed_message || debugResult?.transformed_message) && 
          renderJsonSection('Transformierte Nachricht', message.result?.transformed_message || debugResult?.transformed_message)}
        
        {/* API-Request (falls verfügbar) */}
        {(message.result?.api_request || debugResult?.api_request) && 
          renderJsonSection('API Request', message.result?.api_request || debugResult?.api_request)}
        
        {/* API-Response */}
        {(message.result?.api_response || debugResult?.api_response) && 
          renderJsonSection('API Response', message.result?.api_response || debugResult?.api_response)}
        
        {/* Debug-Infos (falls verfügbar) */}
        {debugResult?.debug_info && renderJsonSection('Debug-Informationen', debugResult.debug_info)}
        
        {/* Pipeline-Schritte (falls verfügbar) */}
        {debugResult?.pipeline_steps && renderJsonSection('Pipeline-Schritte', debugResult.pipeline_steps)}
        
        {/* Alle weiteren Debug-Daten, die nicht explizit behandelt wurden */}
        {debugResult && Object.entries(debugResult).map(([key, value]) => {
          // Überspringe bereits angezeigte Schlüssel
          if (['normalized_data', 'transformed_message', 'api_response', 'api_request', 
               'filter_results', 'extracted_properties', 'debug_info', 'pipeline_steps', 
               'result', 'error'].includes(key)) {
            return null;
          }
          // Zeige alle anderen Daten an
          return value ? renderJsonSection(`${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}`, value) : null;
        })}
        
        {debugLoading && (
          <div className="text-center p-3 mb-3">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Lade Debug-Informationen...
          </div>
        )}
        
        <div className="mt-3 mb-4">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/messages')}>
            <ArrowLeft size={16} className="me-1" />
            Zurück
          </Button>
        </div>
      </div>
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