/**
 * apiConfig.js
 * Configurazione centralizzata per le chiamate API al backend
 */

// Configurazione di base per le API
const API_CONFIG = {
  // URL base per le API del backend
  // Configurato per accesso diretto ai file backend senza proxy
  BASE_URL: (() => {
    console.log('apiConfig.js - Hostname:', window.location.hostname);
    
    // Determina l'URL del backend in base all'ambiente
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // In qualsiasi ambiente, usiamo un percorso relativo per evitare problemi di mixed content
    // Usare sempre percorsi relativi: '/backend' 
    console.log('apiConfig.js - Utilizzo backend via percorso relativo:', '/backend');
    return '/backend';
  })(),
  
  // Timeout predefinito per le richieste in millisecondi
  TIMEOUT: 30000,
  
  // Headers predefiniti per le richieste
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Configurazione caricata dinamicamente dal server
  DOMAIN_CONFIG: null,
  
  // Flag per indicare se la configurazione è stata caricata
  CONFIG_LOADED: false
};

/**
 * Funzione per ottenere l'URL completo di un endpoint API
 * @param {string} endpoint - L'endpoint relativo dell'API
 * @returns {string} L'URL completo dell'API
 */
export const getApiUrl = (endpoint) => {
  // Rimuovi eventuali '../' o './' all'inizio dell'endpoint
  const cleanEndpoint = endpoint.replace(/^(\.\.\/)+|\.\//g, '');
  
  // Rimuovi eventuali '/' all'inizio dell'endpoint
  const normalizedEndpoint = cleanEndpoint.startsWith('/') 
    ? cleanEndpoint.substring(1) 
    : cleanEndpoint;
  
  // Costruisci l'URL completo
  return `${API_CONFIG.BASE_URL}/${normalizedEndpoint}`;
};

/**
 * Funzione per ottenere gli headers predefiniti per le richieste
 * @param {Object} additionalHeaders - Headers aggiuntivi da includere
 * @returns {Object} Gli headers completi
 */
export const getDefaultHeaders = (additionalHeaders = {}) => {
  return {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...additionalHeaders
  };
};

/**
 * Carica la configurazione dal server in base al dominio
 * @returns {Promise<Object>} La configurazione completa 
 */
export const loadDomainConfig = async () => {
  if (API_CONFIG.CONFIG_LOADED) {
    return API_CONFIG.DOMAIN_CONFIG;
  }
  
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/r_config.php`);
    if (!response.ok) {
      throw new Error(`Error loading config: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.success) {
      API_CONFIG.DOMAIN_CONFIG = data.config;
      API_CONFIG.CONFIG_LOADED = true;
      console.log(`Configurazione caricata per il dominio: ${data.domain}`);
      return data.config;
    } else {
      throw new Error(data.error || 'Unknown error loading configuration');
    }
  } catch (error) {
    console.error('Errore nel caricamento della configurazione:', error);
    throw error;
  }
};

/**
 * Ottiene un valore di configurazione
 * @param {string} section - Sezione della configurazione
 * @param {string} key - Chiave della configurazione
 * @param {*} defaultValue - Valore predefinito se la configurazione non esiste
 * @returns {*} Il valore della configurazione o il valore predefinito
 */
export const getConfigValue = (section, key, defaultValue = null) => {
  if (!API_CONFIG.CONFIG_LOADED || !API_CONFIG.DOMAIN_CONFIG) {
    console.warn('La configurazione non è ancora stata caricata');
    return defaultValue;
  }
  
  if (
    API_CONFIG.DOMAIN_CONFIG[section] && 
    API_CONFIG.DOMAIN_CONFIG[section][key] !== undefined
  ) {
    return API_CONFIG.DOMAIN_CONFIG[section][key];
  }
  
  return defaultValue;
};

export default API_CONFIG;
