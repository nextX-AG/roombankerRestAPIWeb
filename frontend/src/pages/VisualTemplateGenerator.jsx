import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageTemplate from './PageTemplate';
import VisualTemplateGeneratorComponent from '../components/VisualTemplateGenerator';
import { Zap } from 'lucide-react';
import { Alert } from 'react-bootstrap';

const VisualTemplateGenerator = () => {
  const location = useLocation();
  const [initialMessage, setInitialMessage] = useState(null);
  const [error, setError] = useState(null);

  // Lese die Nachricht aus den URL-Parametern, wenn vorhanden
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const messageParam = params.get('message');

    if (messageParam) {
      try {
        // Versuche die Nachricht zu parsen
        const parsedMessage = JSON.parse(decodeURIComponent(messageParam));
        setInitialMessage(parsedMessage);
      } catch (err) {
        console.error('Fehler beim Parsen der übergebenen Nachricht:', err);
        setError('Die übergebene Nachricht konnte nicht geladen werden. Ungültiges Format.');
      }
    }
  }, [location]);

  return (
    <PageTemplate 
      title="Visueller Template-Generator" 
      icon={<Zap size={18} />}
      description="Erstellen und testen Sie Templates visuell mit normalisierten Daten."
    >
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      
      {initialMessage && (
        <Alert variant="info" className="mb-4">
          Eine Nachricht wurde übergeben. Die Daten wurden in den Editor geladen.
        </Alert>
      )}
      
      <VisualTemplateGeneratorComponent initialMessage={initialMessage} />
    </PageTemplate>
  );
};

export default VisualTemplateGenerator; 