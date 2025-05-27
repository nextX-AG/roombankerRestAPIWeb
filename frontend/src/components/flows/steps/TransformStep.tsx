import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import MonacoEditor from 'react-monaco-editor';

interface TransformStepProps {
  config: {
    template: string;
    script?: string;
  };
  onChange: (config: { template: string; script?: string }) => void;
}

const TransformStep: React.FC<TransformStepProps> = ({ config, onChange }) => {
  const [template, setTemplate] = useState(config.template || '');
  const [script, setScript] = useState(config.script || '');
  const [mode, setMode] = useState<'template' | 'script'>('template');

  useEffect(() => {
    onChange({ template, script });
  }, [template, script, onChange]);

  return (
    <div>
      <h6 className="mb-3">Transformation</h6>

      <Form.Group className="mb-3">
        <Form.Label>Transformations-Modus</Form.Label>
        <Form.Select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'template' | 'script')}
        >
          <option value="template">Template</option>
          <option value="script">JavaScript</option>
        </Form.Select>
      </Form.Group>

      {mode === 'template' ? (
        <Form.Group>
          <Form.Label>Template</Form.Label>
          <Form.Select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            <option value="">Template auswählen...</option>
            <option value="evalarm_panic">evAlarm Panic</option>
            <option value="evalarm_status">evAlarm Status</option>
            <option value="evalarm_gateway">evAlarm Gateway</option>
          </Form.Select>
        </Form.Group>
      ) : (
        <Form.Group>
          <Form.Label>JavaScript Transformation</Form.Label>
          <div style={{ border: '1px solid #dee2e6', borderRadius: '0.25rem' }}>
            <MonacoEditor
              height="300"
              language="javascript"
              theme="vs-light"
              value={script}
              onChange={setScript}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                automaticLayout: true
              }}
            />
          </div>
          <Form.Text className="text-muted">
            Schreiben Sie eine JavaScript-Funktion, die die Nachricht transformiert.
            Die Funktion erhält das message-Objekt als Parameter und muss das transformierte Objekt zurückgeben.
          </Form.Text>
        </Form.Group>
      )}
    </div>
  );
};

export default TransformStep; 