import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// CodeMirror und erforderliche Addons
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/selection/active-line';

const CodeEditor = ({ value, onChange, readOnly, language, height }) => {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    // CodeMirror-Instanz erstellen, wenn das Komponente mounted wird
    if (textareaRef.current && !editorRef.current) {
      editorRef.current = CodeMirror.fromTextArea(textareaRef.current, {
        mode: language === 'json' ? { name: 'javascript', json: true } : language,
        theme: 'material',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        readOnly: readOnly,
        lineWrapping: true,
        tabSize: 2,
        indentWithTabs: false,
        extraKeys: {
          'Tab': (cm) => cm.execCommand('indentMore'),
          'Shift-Tab': (cm) => cm.execCommand('indentLess')
        }
      });

      // Event-Handler für Änderungen
      editorRef.current.on('change', (instance) => {
        if (onChange) {
          onChange(instance.getValue());
        }
      });
    }

    // Wert aktualisieren, wenn er von außen geändert wird
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }

    // readOnly-Eigenschaft aktualisieren, wenn sie sich ändert
    if (editorRef.current) {
      editorRef.current.setOption('readOnly', readOnly);
    }

    // Cleanup beim Unmount
    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
        editorRef.current = null;
      }
    };
  }, [value, onChange, readOnly, language]);

  return (
    <div className="code-editor-container" style={{ height: height || '300px' }}>
      <textarea ref={textareaRef} defaultValue={value} />
      <style jsx="true">{`
        .code-editor-container {
          border: 1px solid #ced4da;
          border-radius: 0.25rem;
        }
        .code-editor-container .CodeMirror {
          height: 100%;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

CodeEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  language: PropTypes.string,
  height: PropTypes.string
};

CodeEditor.defaultProps = {
  value: '',
  readOnly: false,
  language: 'javascript',
  height: '300px'
};

export default CodeEditor; 