import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle,
  faExclamationCircle, 
  faSpinner, 
  faClock, 
  faQuestionCircle,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

/**
 * MessageStatusIcons - Zeigt Icons für den Nachrichtenstatus an
 * 
 * @param {string} status - Der Status der Nachricht: "completed", "failed", "processing", "pending" oder ein anderer Status
 * @returns Ein Icon-Element mit Tooltip für den Nachrichtenstatus
 */
const MessageStatusIcons = ({ status }) => {
  // Standardstil für Icons
  const style = { marginRight: '5px' };
  
  // Icons und Farben für verschiedene Status
  let icon, color, tooltip;
  
  switch (status) {
    case 'completed':
      icon = faCheckCircle;
      color = 'var(--bs-success)'; // Bootstrap-Grün
      tooltip = 'Erfolgreich übermittelt';
      break;
    
    case 'failed':
      icon = faExclamationCircle;
      color = 'var(--bs-danger)'; // Bootstrap-Rot
      tooltip = 'Übermittlung fehlgeschlagen';
      break;
    
    case 'processing':
      icon = faSpinner;
      color = 'var(--bs-warning)'; // Bootstrap-Gelb
      tooltip = 'Wird verarbeitet';
      break;
    
    case 'pending':
      icon = faClock;
      color = 'var(--bs-info)'; // Bootstrap-Blau
      tooltip = 'Ausstehend';
      break;
      
    case 'forwarded':
      icon = faArrowRight;
      color = 'var(--bs-primary)'; // Bootstrap-Primärfarbe
      tooltip = 'Weitergeleitet';
      break;
    
    default:
      icon = faQuestionCircle;
      color = 'var(--bs-secondary)'; // Bootstrap-Grau
      tooltip = 'Unbekannter Status';
      break;
  }
  
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`tooltip-${status}`}>{tooltip}</Tooltip>}
    >
      <FontAwesomeIcon 
        icon={icon} 
        style={{ ...style, color }} 
        className="icon-with-tooltip"
        spin={status === 'processing'} // Spinner-Animation für 'processing'
      />
    </OverlayTrigger>
  );
};

export default MessageStatusIcons; 