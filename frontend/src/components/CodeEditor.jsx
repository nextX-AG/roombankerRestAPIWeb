import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * Einfacher Code-Editor für JSON und andere Formate
 * In Zukunft kann dieser durch eine fortschrittlichere Editor-Komponente wie Monaco ersetzt werden
 */
const CodeEditor = ({ value, onChange, language = 'json', height = '300px' }) => {
  const [internalValue, setInternalValue] = useState(value || '');
  
  // Aktualisiere den internen Wert, wenn sich der externe ändert
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value || '');
    }
  }, [value]);
  
  // Handler für Änderungen im Textarea
  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };
  
  return (
    <Form.Control
      as="textarea"
      value={internalValue}
      onChange={handleChange}
      style={{ 
        fontFamily: 'monospace', 
        height, 
        resize: 'vertical',
        backgroundColor: '#f8f9fa',
        color: '#212529',
        border: '1px solid #ced4da',
        borderRadius: '0.25rem',
        padding: '10px',
        fontSize: '14px',
        lineHeight: 1.5,
        whiteSpace: 'pre'
      }}
    />
  );
};

CodeEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  language: PropTypes.string,
  height: PropTypes.string
};

CodeEditor.defaultProps = {
  value: '',
  language: 'json',
  height: '300px'
};

export default CodeEditor; 