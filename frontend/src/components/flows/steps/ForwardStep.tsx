import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

interface Header {
  key: string;
  value: string;
}

interface ForwardConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Header[];
  retry: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
}

interface ForwardStepProps {
  config: ForwardConfig;
  onChange: (config: ForwardConfig) => void;
}

const ForwardStep: React.FC<ForwardStepProps> = ({ config, onChange }) => {
  const [url, setUrl] = useState(config.url || '');
  const [method, setMethod] = useState(config.method || 'POST');
  const [headers, setHeaders] = useState<Header[]>(config.headers || []);
  const [retryEnabled, setRetryEnabled] = useState(config.retry?.enabled || false);
  const [maxAttempts, setMaxAttempts] = useState(config.retry?.maxAttempts || 3);
  const [retryDelay, setRetryDelay] = useState(config.retry?.delay || 1000);

  useEffect(() => {
    onChange({
      url,
      method,
      headers,
      retry: {
        enabled: retryEnabled,
        maxAttempts,
        delay: retryDelay
      }
    });
  }, [url, method, headers, retryEnabled, maxAttempts, retryDelay, onChange]);

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: keyof Header, value: string) => {
    const updatedHeaders = headers.map((header, i) => {
      if (i === index) {
        return { ...header, [field]: value };
      }
      return header;
    });
    setHeaders(updatedHeaders);
  };

  return (
    <div>
      <h6 className="mb-3">Weiterleitung</h6>

      <Form.Group className="mb-3">
        <Form.Label>URL</Form.Label>
        <Form.Control
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>HTTP-Methode</Form.Label>
        <Form.Select
          value={method}
          onChange={(e) => setMethod(e.target.value as ForwardConfig['method'])}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </Form.Select>
      </Form.Group>

      <div className="mb-3">
        <h6 className="mb-2">HTTP-Header</h6>
        {headers.map((header, index) => (
          <div key={index} className="mb-2 p-2 border rounded">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Header {index + 1}</span>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleRemoveHeader(index)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </div>
            <div className="row g-2">
              <div className="col">
                <Form.Control
                  type="text"
                  value={header.key}
                  onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                  placeholder="Header-Name"
                />
              </div>
              <div className="col">
                <Form.Control
                  type="text"
                  value={header.value}
                  onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                  placeholder="Wert"
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleAddHeader}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Header hinzufügen
        </Button>
      </div>

      <div className="mb-3">
        <h6 className="mb-2">Retry-Konfiguration</h6>
        <Form.Check
          type="switch"
          id="retry-enabled"
          label="Retry aktivieren"
          checked={retryEnabled}
          onChange={(e) => setRetryEnabled(e.target.checked)}
          className="mb-2"
        />

        {retryEnabled && (
          <div className="ms-4">
            <Form.Group className="mb-2">
              <Form.Label>Maximale Versuche</Form.Label>
              <Form.Control
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                min={1}
                max={10}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Verzögerung (ms)</Form.Label>
              <Form.Control
                type="number"
                value={retryDelay}
                onChange={(e) => setRetryDelay(parseInt(e.target.value))}
                min={100}
                step={100}
              />
            </Form.Group>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForwardStep; 