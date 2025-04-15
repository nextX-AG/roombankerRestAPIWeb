/**
 * Konfigurations-Datei für das Frontend
 * Definiert verschiedene Endpunkte je nach Umgebung
 */

// Prüfe, ob wir uns in der Produktionsumgebung befinden
const isProduction = import.meta.env.PROD;

// Basis-URLs für API-Zugriffe
const config = {
  // In der Produktion werden alle Anfragen über den Nginx-Proxy geleitet (relative Pfade)
  // In der Entwicklung werden die Dienste direkt auf den entsprechenden Ports angesprochen
  apiBaseUrl: isProduction ? '/api' : 'http://localhost:8080/api',
  processorUrl: isProduction ? '/api' : 'http://localhost:8081/api',
  authUrl: isProduction ? '/api/auth' : 'http://localhost:8082/api/auth',
};

export default config; 