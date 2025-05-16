/**
 * Formatierungs-Hilfsfunktionen
 */

/**
 * Formatiert einen Zeitstempel als lesbares Datum und Uhrzeit
 * @param {string|Date} timestamp - Der zu formatierende Zeitstempel
 * @return {string} Formatierte Datum/Zeit
 */
export const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Formatiert nur das Datum ohne Uhrzeit
 * @param {string|Date} timestamp - Der zu formatierende Zeitstempel
 * @return {string} Formatiertes Datum
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatiert Zahlen mit Tausendertrennzeichen
 * @param {number} number - Die zu formatierende Zahl
 * @param {number} decimals - Anzahl der Dezimalstellen (Standard: 0)
 * @return {string} Formatierte Zahl
 */
export const formatNumber = (number, decimals = 0) => {
  if (number === null || number === undefined) return '-';
  
  return number.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Kürzt einen Text auf eine bestimmte Länge und fügt ... hinzu
 * @param {string} text - Der zu kürzende Text
 * @param {number} maxLength - Maximale Länge (Standard: 50)
 * @return {string} Gekürzter Text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
};

export default {
  formatDateTime,
  formatDate,
  formatNumber,
  truncateText
}; 