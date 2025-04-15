import React from 'react';
import PropTypes from 'prop-types';

/**
 * Eine vereinfachte Version des CodeEditors ohne externe Abhängigkeiten
 * Diese Komponente verwendet ein einfaches Textarea mit einigen Styling-Anpassungen
 */
const SimpleCodeEditor = ({ value, onChange, readOnly, height }) => {
  return (
    <div className="simple-code-editor" style={{ height: height || '300px' }}>
      <textarea
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        className="code-textarea"
        style={{
          width: '100%',
          height: '100%',
          padding: '10px',
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontSize: '14px',
          backgroundColor: readOnly ? '#f5f5f5' : '#fff',
          border: '1px solid #ced4da',
          borderRadius: '0.25rem',
          resize: 'none',
          tabSize: '2',
          overflowY: 'auto'
        }}
      />
      <style jsx="true">{`
        .simple-code-editor {
          position: relative;
          width: 100%;
        }
        .code-textarea:focus {
          outline: none;
          border-color: #80bdff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
      `}</style>
    </div>
  );
};

SimpleCodeEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  height: PropTypes.string
};

SimpleCodeEditor.defaultProps = {
  value: '',
  readOnly: false,
  height: '300px'
};

export default SimpleCodeEditor; 