import React from 'react';
import { Button, Card } from 'react-bootstrap';
import { JsonView } from 'react-json-view-lite';
import { RefreshCw, Info } from 'lucide-react';
import Drawer from './Drawer';

/**
 * Drawer-Komponente für die Anzeige von Transformationsergebnissen
 */
const TransformationResultDrawer = ({ 
  show, 
  onClose, 
  transformedMessage, 
  onReset,
  loading
}) => {
  // JSON-View-Optionen
  const jsonViewOptions = {
    style: {
      container: {
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }
    },
    shouldExpandNode: () => true, // Alle Knoten standardmäßig erweitern
    displayDataTypes: false,
    displayObjectSize: false
  };

  const hasData = Object.keys(transformedMessage || {}).length > 0;

  return (
    <Drawer
      show={show}
      onClose={onClose}
      title="Transformationsergebnis"
    >
      <div className="d-flex justify-content-end mb-3">
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={onReset}
          disabled={!hasData || loading}
        >
          <RefreshCw size={16} className="me-1" />
          Zurücksetzen
        </Button>
      </div>

      <Card className="mb-4">
        <Card.Body style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {hasData ? (
            <JsonView 
              data={transformedMessage} 
              {...jsonViewOptions} 
            />
          ) : (
            <div className="text-center text-muted py-5">
              <Info size={32} className="mb-2" />
              <p>Verwenden Sie den "Testen"-Button, um die Transformation anzuzeigen.</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Drawer>
  );
};

export default TransformationResultDrawer; 