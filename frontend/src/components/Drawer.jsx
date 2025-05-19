import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Offcanvas } from 'react-bootstrap';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/drawer.css';

// Drawer Context für globalen Zugriff auf Drawer-Status
export const DrawerContext = createContext({
  isOpen: false,
  width: 400,
  setIsOpen: () => {},
  setWidth: () => {}
});

export const useDrawer = () => useContext(DrawerContext);

// DrawerProvider Komponente zum Wrappen der App
export const DrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(400); // Standard-Breite

  return (
    <DrawerContext.Provider value={{ isOpen, width, setIsOpen, setWidth }}>
      {children}
    </DrawerContext.Provider>
  );
};

/**
 * Drawer-Komponente für Details-Ansichten mit Resize-Funktion
 */
const Drawer = ({ show, onClose, title, children }) => {
  const navigate = useNavigate();
  const { setIsOpen, width, setWidth } = useDrawer();
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);
  const drawerRef = useRef(null);

  // Informiere DrawerContext über den Öffnungsstatus
  useEffect(() => {
    setIsOpen(show);
    return () => setIsOpen(false);
  }, [show, setIsOpen]);

  // Close-Handler, der zur übergeordneten Route zurücknavigiert
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Wenn kein expliziter Close-Handler übergeben wurde, navigiere zurück
      navigate(-1);
    }
  };

  // Resize-Handler starten
  const startResizing = (e) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
  };

  // Resize-Handler während des Ziehens
  const handleResize = (e) => {
    if (!isResizing) return;
    const newWidth = startWidth - (e.clientX - startX);
    // Begrenze die Breite (min: 300px, max: 80% der Bildschirmbreite)
    const minWidth = 300;
    const maxWidth = window.innerWidth * 0.8;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  };

  // Resize-Handler beenden
  const stopResizing = () => {
    setIsResizing(false);
  };

  // Event-Listener für Mausbewegungen und Loslassen
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResizing);
      // Cursor während des Resizings ändern
      document.body.style.cursor = 'col-resize';
      // Verhindern von Textauswahl während des Resizings
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResizing);
      // Cursor zurücksetzen
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResize]);

  return (
    <Offcanvas 
      show={show} 
      onHide={handleClose} 
      placement="end" 
      backdrop={false} 
      scroll
      className="drawer"
      style={{ width: `${width}px` }}
      ref={drawerRef}
    >
      <div 
        className="drawer-resize-handle"
        onMouseDown={startResizing}
      />
      <Offcanvas.Header className="border-bottom">
        <Offcanvas.Title>{title}</Offcanvas.Title>
        <button 
          className="btn btn-sm btn-close"
          onClick={handleClose}
        />
      </Offcanvas.Header>
      <Offcanvas.Body className="p-0">
        <div className="drawer-content p-4">
          {children}
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default Drawer; 