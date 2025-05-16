import React from 'react';
import { Offcanvas } from 'react-bootstrap';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Drawer-Komponente für Details-Ansichten
 */
const Drawer = ({ show, onClose, title, children }) => {
  const navigate = useNavigate();
  
  // Close-Handler, der zur übergeordneten Route zurücknavigiert
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Wenn kein expliziter Close-Handler übergeben wurde, navigiere zurück
      navigate(-1);
    }
  };
  
  return (
    <Offcanvas 
      show={show} 
      onHide={handleClose} 
      placement="end" 
      backdrop={false} 
      scroll
      className="drawer"
    >
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