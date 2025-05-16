import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import { Table, Badge, Button, Alert } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Copy, Bug, ArrowLeft } from 'lucide-react';
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
  
  const handleDebugMessage = async () => {
    try {
      setDebugLoading(true);
      
      // Prüfe, ob eine gültige Nachricht ausgewählt ist
      if (!message) {
        throw new Error('Keine Nachricht ausgewählt');
      }
      
      // Der Netzwerk-Call muss eine msg.gateway_id und eine msg.message haben
      const debugPayload = {
        gateway_id: getGatewayId(message),
        message: message.content || message
      };
      
      console.log('Debug-Anfrage-Payload:', debugPayload);
      
      // API-Aufruf zum Debugging der Nachricht
      const response = await messageApi.debugMessage(debugPayload);
      
      console.log('Debug-Antwort:', response);
      
      if (response.status === 'success') {
        // In einer produktiven Umgebung würden wir hier das Debug-Modal anzeigen
        // Da wir den Drawer verwenden, zeigen wir stattdessen eine Warnung an
        alert('Debug erfolgreich! In der vollständigen Implementierung würde hier das Debug-Modal angezeigt.');
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
              <th>ID</th>
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
            {message.result && (
              <tr>
                <th>API-Antwort</th>
                <td>
                  {message.result.response_status === 200 ? (
                    <Badge bg="success">Erfolgreich ({message.result.response_status})</Badge>
                  ) : (
                    <Badge bg="danger">Fehler ({message.result.response_status})</Badge>
                  )}
                </td>
              </tr>
            )}
            {message.error && (
              <tr>
                <th>Fehler</th>
                <td><span className="text-danger">{message.error}</span></td>
              </tr>
            )}
          </tbody>
        </Table>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Nachrichteninhalt</h5>
          <div>
            <Button 
              size="sm" 
              variant="outline-secondary" 
              className="me-2"
              onClick={() => copyToClipboard(message.content || message)}
            >
              <Copy size={16} className="me-1" />
              Kopieren
            </Button>
            
            <Button 
              size="sm" 
              variant="outline-primary"
              onClick={handleDebugMessage}
              disabled={debugLoading}
            >
              <Bug size={16} className="me-1" />
              {debugLoading ? 'Wird analysiert...' : 'Debuggen'}
            </Button>
          </div>
        </div>
        
        <div className="border p-3 rounded bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <JsonView data={message.content || message} />
        </div>

        {message.result && message.result.transformed_message && (
          <>
            <h5 className="mt-3">Transformierte Nachricht</h5>
            <div className="border p-3 rounded bg-light" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <JsonView data={message.result.transformed_message} />
            </div>
          </>
        )}
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