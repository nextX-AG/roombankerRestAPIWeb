import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBell, 
  faBatteryFull, 
  faBatteryHalf, 
  faBatteryQuarter, 
  faExclamationTriangle, 
  faPlug, 
  faWifi, 
  faTowerCell, 
  faLock,
  faLockOpen,
  faSignal,
  faCircle
} from '@fortawesome/free-solid-svg-icons';

const GatewayStatusIcons = ({ gatewayData }) => {
  if (!gatewayData || !gatewayData.gateway) return null;
  
  const { gateway } = gatewayData;

  // Icons für verschiedene Stati
  const getStatusIcon = (key) => {
    const style = { marginRight: '10px', cursor: 'help' };
    let icon, color, tooltip;

    switch (key) {
      case 'alarmstatus':
        icon = faBell;
        color = gateway[key] === 'alarm' ? 'red' : 'green';
        tooltip = gateway[key] === 'alarm' ? 'Alarm ausgelöst' : 'Kein Alarm';
        break;
        
      case 'batterystatus':
        if (gateway[key] === 'connected') {
          icon = faBatteryFull;
          color = 'green';
          tooltip = 'Batterie verbunden und voll';
        } else if (gateway[key] === 'low') {
          icon = faBatteryQuarter;
          color = 'orange';
          tooltip = 'Batterie niedrig';
        } else {
          icon = faBatteryHalf;
          color = 'red';
          tooltip = 'Batterie nicht verbunden';
        }
        break;
        
      case 'cellularstatus':
        icon = faTowerCell;
        color = gateway[key] === 'connected' ? 'green' : 'gray';
        tooltip = gateway[key] === 'connected' ? 'Mobiles Netzwerk verbunden' : 'Kein mobiles Netzwerk';
        break;
        
      case 'wifistatus':
        icon = faWifi;
        color = gateway[key] === 'connected' ? 'green' : 'gray';
        tooltip = gateway[key] === 'connected' ? 'WLAN verbunden' : 'Kein WLAN';
        break;
        
      case 'powerstatus':
        icon = faPlug;
        color = gateway[key] === 'connected' ? 'green' : 'red';
        tooltip = gateway[key] === 'connected' ? 'Stromversorgung OK' : 'Keine Stromversorgung';
        break;
        
      case 'lidstatus':
        icon = gateway[key] === 'open' ? faLockOpen : faLock;
        color = gateway[key] === 'open' ? 'orange' : 'green';
        tooltip = gateway[key] === 'open' ? 'Gehäuse offen' : 'Gehäuse geschlossen';
        break;

      case 'wanstatus':
        icon = faSignal;
        color = gateway[key] === 'connected' ? 'green' : 'red';
        tooltip = gateway[key] === 'connected' ? 'WAN verbunden' : 'WAN nicht verbunden';
        break;

      case 'faultstatus':
        icon = faExclamationTriangle;
        color = gateway[key] === 'normal' ? 'green' : 'red';
        tooltip = gateway[key] === 'normal' ? 'Keine Fehler' : 'Fehler vorhanden';
        break;

      default:
        return null;
    }

    return (
      <OverlayTrigger
        key={key}
        placement="top"
        overlay={<Tooltip id={`tooltip-${key}`}>{tooltip}</Tooltip>}
      >
        <FontAwesomeIcon icon={icon} style={{ ...style, color }} />
      </OverlayTrigger>
    );
  };

  // Die wichtigsten Status-Indikatoren für die Übersicht
  const primaryStatusKeys = ['alarmstatus', 'powerstatus', 'batterystatus', 'wanstatus'];
  
  // Alle Status-Indikatoren für die Detailansicht
  const allStatusKeys = [
    'alarmstatus', 'powerstatus', 'batterystatus', 'wanstatus', 
    'wifistatus', 'cellularstatus', 'lidstatus', 'faultstatus'
  ];

  return {
    // Nur die wichtigsten Icons für die Übersicht 
    primary: (
      <div className="gateway-status-icons">
        {primaryStatusKeys.map(key => getStatusIcon(key))}
      </div>
    ),
    // Alle Status-Icons für die Detailansicht
    all: (
      <div className="gateway-status-icons">
        {allStatusKeys.map(key => getStatusIcon(key))}
      </div>
    ),
    // Einzelne Icons können bei Bedarf abgerufen werden
    getIcon: getStatusIcon
  };
};

export default GatewayStatusIcons; 