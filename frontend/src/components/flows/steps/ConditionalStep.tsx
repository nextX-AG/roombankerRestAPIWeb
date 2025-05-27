import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';

interface ConditionalConfig {
  condition: string;
  true_step?: {
    type: string;
    config: Record<string, any>;
  };
  false_step?: {
    type: string;
    config: Record<string, any>;
  };
}

interface ConditionalStepProps {
  config: ConditionalConfig;
  onChange: (config: ConditionalConfig) => void;
}

const ConditionalStep: React.FC<ConditionalStepProps> = ({ config, onChange }) => {
  const [condition, setCondition] = useState(config.condition || '');

  useEffect(() => {
    onChange({
      ...config,
      condition
    });
  }, [condition, onChange]);

  return (
    <div>
      <h6 className="mb-3">Bedingung</h6>

      <Form.Group className="mb-3">
        <Form.Label>Bedingungsausdruck</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="z.B.: devices[0].values.alarmtype === 'panic'"
        />
        <Form.Text className="text-muted">
          Geben Sie einen JavaScript-Ausdruck ein, der auf die Nachricht angewendet wird.
          Die Nachricht ist als Variable verfügbar.
        </Form.Text>
      </Form.Group>

      {/* TODO: Implementierung der true/false Steps in zukünftiger Version */}
      <Form.Text className="text-muted">
        Die Konfiguration von True/False-Aktionen wird in einer zukünftigen Version implementiert.
      </Form.Text>
    </div>
  );
};

export default ConditionalStep; 