/**
 * Konfigurations-Datei für das Frontend
 * Definiert verschiedene Endpunkte je nach Umgebung
 */

// Prüfe, ob wir uns in der Produktionsumgebung befinden
const isProduction = import.meta.env.PROD;

// Prüfen, ob wir in Docker laufen (kann durch eine Umgebungsvariable gesteuert werden)
const isDocker = import.meta.env.VITE_DOCKER === 'true';

// API-Version für alle Aufrufe
export const API_VERSION = 'v1';

// Gateway-URL - basierend auf der Umgebung
export const GATEWAY_URL = 
  isProduction ? '/api' :
  isDocker ? '/api' : // In Docker und Produktion nutzen wir relative URLs (Nginx leitet weiter)
  // Der Browser läuft außerhalb von Docker und kann nicht direkt auf Container-Namen zugreifen
  'http://localhost:8000/api';

// Basis-URLs für API-Zugriffe
const config = {
  // In der Entwicklung und Produktion werden alle Anfragen über das API-Gateway geleitet
  apiBaseUrl: GATEWAY_URL,
  processorUrl: GATEWAY_URL,
  workerUrl: GATEWAY_URL,
  authUrl: GATEWAY_URL,
  
  // Debug-Informationen zur Umgebung
  environment: {
    isProduction,
    isDocker
  },
  
  // Standardformat für API-Responses
  responseFormat: {
    success: {
      status: 'success',
      data: null,
      error: null
    },
    error: {
      status: 'error',
      data: null,
      error: {
        message: 'Ein Fehler ist aufgetreten'
      }
    }
  }
};

// Debug-Ausgabe in der Konsole, um die aktuelle Konfiguration zu zeigen
console.log('Frontend Config:', {
  env: isProduction ? 'production' : (isDocker ? 'docker' : 'development'),
  gatewayUrl: GATEWAY_URL
});

export default config; 