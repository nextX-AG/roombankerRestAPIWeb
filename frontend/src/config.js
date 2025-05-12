/**
 * Konfigurations-Datei für das Frontend
 * Definiert verschiedene Endpunkte je nach Umgebung
 */

// Prüfe, ob wir uns in der Produktionsumgebung befinden
const isProduction = import.meta.env.PROD;

// API-Version für alle Aufrufe
export const API_VERSION = 'v1';

// Basis-URLs für API-Zugriffe
const config = {
  // In der Produktion werden alle Anfragen über den Nginx-Proxy geleitet (relative Pfade)
  // In der Entwicklung werden die Dienste direkt auf den entsprechenden Ports angesprochen
  apiBaseUrl: isProduction ? '/api' : 'http://localhost:8080/api',
  processorUrl: isProduction ? '/api' : 'http://localhost:8082/api',
  workerUrl: isProduction ? '/api' : 'http://localhost:8083/api',
  authUrl: isProduction ? '/api/auth' : 'http://localhost:8081/api/auth',
  
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