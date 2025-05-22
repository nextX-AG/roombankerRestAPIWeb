import React from 'react';
import PageTemplate from '../components/PageTemplate';
import VisualTemplateGeneratorComponent from '../components/VisualTemplateGenerator';
import { Zap } from 'lucide-react';

const VisualTemplateGenerator = () => {
  return (
    <PageTemplate 
      title="Visueller Template-Generator" 
      icon={<Zap size={18} />}
      description="Erstellen und testen Sie Templates visuell mit normalisierten Daten."
    >
      <VisualTemplateGeneratorComponent />
    </PageTemplate>
  );
};

export default VisualTemplateGenerator; 