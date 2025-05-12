/**
 * API-Client für das Frontend
 * Zentrale Implementierung aller API-Aufrufe mit einheitlichem Format
 */

import config, { API_VERSION } from './config';

// Basis-URLs für die verschiedenen Services
const API_URLS = {
  api: config.apiBaseUrl,
  worker: config.workerUrl,
  auth: config.authUrl
};

/**
 * Hilfsfunktion für API-Aufrufe mit einheitlichem Fehlerhandling
 * 
 * @param {string} url - Die vollständige URL für den API-Aufruf
 * @param {Object} options - Fetch-Optionen (method, headers, body)
 * @returns {Promise<Object>} - Ein Promise mit den API-Daten oder einem Fehler
 */
async function fetchApi(url, options = {}) {
  try {
    // Standard-Headers setzen
    if (!options.headers) {
      options.headers = {
        'Content-Type': 'application/json'
      };
    }

    // Token aus localStorage hinzufügen, falls vorhanden
    const token = localStorage.getItem('auth_token');
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // API-Aufruf durchführen
    const response = await fetch(url, options);
    
    // JSON-Daten extrahieren
    const data = await response.json();
    
    // HTTP-Fehler behandeln
    if (!response.ok) {
      throw new Error(data?.error?.message || `HTTP error! status: ${response.status}`);
    }
    
    // Standardmäßig wird data zurückgegeben (das ist unser Erfolgsformat)
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    // Fehler in unserem Standardformat zurückgeben
    return {
      status: 'error',
      data: null,
      error: {
        message: error.message
      }
    };
  }
}

/**
 * Generiert eine API-URL basierend auf Service, Ressource und Aktion
 * 
 * @param {string} service - Der Service (api, worker, auth)
 * @param {string} resource - Die Ressource (gateways, messages, etc.)
 * @param {string} action - Die Aktion (list, detail, etc.)
 * @param {Object} params - Parameter für die URL
 * @returns {string} - Die vollständige API-URL
 */
function getApiUrl(service, resource, action, params = {}) {
  // Basis-URL für den Service
  const baseUrl = API_URLS[service] || API_URLS.api;
  
  // Resource-Pfad mit Version
  let path = `/${resource}`;
  
  // Aktion hinzufügen, wenn vorhanden
  if (action) {
    path += `/${action}`;
  }
  
  // Parameter ersetzen
  if (params) {
    Object.keys(params).forEach(key => {
      path = path.replace(`:${key}`, params[key]);
    });
  }
  
  return `${baseUrl}/${API_VERSION}${path}`;
}

// Auth-API-Endpunkte
export const authApi = {
  login: async (username, password) => {
    return fetchApi(getApiUrl('auth', 'auth', 'login'), {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  
  logout: async () => {
    return fetchApi(getApiUrl('auth', 'auth', 'logout'), {
      method: 'POST'
    });
  },
  
  status: async () => {
    return fetchApi(getApiUrl('auth', 'auth', 'status'));
  }
};

// Gateway-API-Endpunkte
export const gatewayApi = {
  list: async () => {
    return fetchApi(getApiUrl('api', 'gateways', ''));
  },
  
  detail: async (uuid) => {
    return fetchApi(getApiUrl('api', 'gateways', ':uuid', { uuid }));
  },
  
  create: async (gateway) => {
    return fetchApi(getApiUrl('api', 'gateways', ''), {
      method: 'POST',
      body: JSON.stringify(gateway)
    });
  },
  
  update: async (uuid, gateway) => {
    return fetchApi(getApiUrl('api', 'gateways', ':uuid', { uuid }), {
      method: 'PUT',
      body: JSON.stringify(gateway)
    });
  },
  
  delete: async (uuid) => {
    return fetchApi(getApiUrl('api', 'gateways', ':uuid', { uuid }), {
      method: 'DELETE'
    });
  },
  
  unassigned: async () => {
    return fetchApi(getApiUrl('api', 'gateways', 'unassigned'));
  }
};

// Customer-API-Endpunkte
export const customerApi = {
  list: async () => {
    return fetchApi(getApiUrl('api', 'customers', ''));
  },
  
  detail: async (id) => {
    return fetchApi(getApiUrl('api', 'customers', ':id', { id }));
  },
  
  create: async (customer) => {
    return fetchApi(getApiUrl('api', 'customers', ''), {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  },
  
  update: async (id, customer) => {
    return fetchApi(getApiUrl('api', 'customers', ':id', { id }), {
      method: 'PUT',
      body: JSON.stringify(customer)
    });
  },
  
  delete: async (id) => {
    return fetchApi(getApiUrl('api', 'customers', ':id', { id }), {
      method: 'DELETE'
    });
  }
};

// Templates-API-Endpunkte
export const templateApi = {
  list: async () => {
    return fetchApi(getApiUrl('worker', 'templates', ''));
  },
  
  detail: async (id) => {
    return fetchApi(getApiUrl('worker', 'templates', ':id', { id }));
  },
  
  test: async (templateId, message) => {
    return fetchApi(getApiUrl('worker', 'templates', 'test-transform'), {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId, message })
    });
  }
};

// Message-API-Endpunkte
export const messageApi = {
  status: async () => {
    return fetchApi(getApiUrl('worker', 'messages', 'status'));
  },
  
  queueStatus: async () => {
    return fetchApi(getApiUrl('worker', 'messages', 'queue/status'));
  },
  
  forwarding: async () => {
    return fetchApi(getApiUrl('worker', 'messages', 'forwarding'));
  },
  
  retry: async (messageId) => {
    return fetchApi(getApiUrl('worker', 'messages', `retry/${messageId}`), {
      method: 'POST'
    });
  }
};

// System-API-Endpunkte
export const systemApi = {
  health: async () => {
    return fetchApi(getApiUrl('worker', 'health', ''));
  },
  
  iotStatus: async () => {
    return fetchApi(getApiUrl('worker', 'iot-status', ''));
  },
  
  endpoints: async () => {
    return fetchApi(getApiUrl('worker', 'endpoints', ''));
  }
};

// Exportiere alle API-Funktionen als API-Objekt
export default {
  auth: authApi,
  gateways: gatewayApi,
  customers: customerApi,
  templates: templateApi,
  messages: messageApi,
  system: systemApi
}; 