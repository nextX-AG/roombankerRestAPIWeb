import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

interface FilterRule {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

interface FilterStepProps {
  config: {
    rules: FilterRule[];
  };
  onChange: (config: { rules: FilterRule[] }) => void;
}

const FilterStep: React.FC<FilterStepProps> = ({ config, onChange }) => {
  const [rules, setRules] = useState<FilterRule[]>(config.rules || []);

  useEffect(() => {
    onChange({ rules });
  }, [rules, onChange]);

  const handleAddRule = () => {
    setRules([...rules, {
      field: '',
      operator: 'equals',
      value: ''
    }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, field: keyof FilterRule, value: string) => {
    const updatedRules = rules.map((rule, i) => {
      if (i === index) {
        return { ...rule, [field]: value };
      }
      return rule;
    });
    setRules(updatedRules);
  };

  return (
    <div>
      <h6 className="mb-3">Filter-Regeln</h6>
      
      {rules.map((rule, index) => (
        <div key={index} className="mb-3 p-3 border rounded">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="mb-0">Regel {index + 1}</h6>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleRemoveRule(index)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          </div>
          
          <Form.Group className="mb-2">
            <Form.Label>Feld</Form.Label>
            <Form.Control
              type="text"
              value={rule.field}
              onChange={(e) => handleRuleChange(index, 'field', e.target.value)}
              placeholder="z.B. message.type"
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Operator</Form.Label>
            <Form.Select
              value={rule.operator}
              onChange={(e) => handleRuleChange(index, 'operator', e.target.value as FilterRule['operator'])}
            >
              <option value="equals">Gleich</option>
              <option value="contains">Enthält</option>
              <option value="greater_than">Größer als</option>
              <option value="less_than">Kleiner als</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Wert</Form.Label>
            <Form.Control
              type="text"
              value={rule.value}
              onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
              placeholder="Vergleichswert"
            />
          </Form.Group>
        </div>
      ))}

      <Button
        variant="outline-primary"
        size="sm"
        onClick={handleAddRule}
        className="mt-2"
      >
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        Regel hinzufügen
      </Button>
    </div>
  );
};

export default FilterStep; 