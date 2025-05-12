/**
 * Konfigurations-Datei für das Frontend
 * Definiert verschiedene Endpunkte je nach Umgebung
 */

// Prüfe, ob wir uns in der Produktionsumgebung befinden
const isProduction = import.meta.env.PROD;

// API-Version für alle Aufrufe
export const API_VERSION = 'v1';

// Gateway-URL - expliziter Port für Entwicklung
export const GATEWAY_URL = isProduction ? '/api' : 'http://localhost:8000/api';

// Basis-URLs für API-Zugriffe
const config = {
  // In der Entwicklung und Produktion werden alle Anfragen über das API-Gateway geleitet
  apiBaseUrl: GATEWAY_URL,
  processorUrl: GATEWAY_URL,
  workerUrl: GATEWAY_URL,
  authUrl: GATEWAY_URL,
  
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

export default config; 