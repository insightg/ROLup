/**
 * apiUtils.js
 * Funzioni di utilità per effettuare chiamate API al backend
 */

import API_CONFIG, { getApiUrl, getDefaultHeaders } from './apiConfig';

/**
 * Funzione per effettuare una richiesta GET
 * @param {string} endpoint - L'endpoint relativo dell'API
 * @param {Object} options - Opzioni aggiuntive per la richiesta
 * @returns {Promise<any>} - Promise con la risposta JSON
 */
export const apiGet = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const headers = getDefaultHeaders(options.headers);
  
  try {
    console.log(`apiUtils: GET request to ${url}`);
    
    // Aggiungi withCredentials per inviare i cookie con CORS
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
      mode: 'cors',
      ...options
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    // Evita di loggare la risposta completa che potrebbe essere troncata in console
    console.log(`apiUtils: GET response ricevuta da ${url}, lunghezza: ${responseText.length} caratteri`);
    
    try {
      // Log solo una parte della risposta testuale per evitare troncamenti
      console.log(`Risposta testuale (primi 100 caratteri): ${responseText.substring(0, 100)}...`);
      
      const parsedResponse = JSON.parse(responseText);
      console.log(`Parsed JSON response structure:`, {
        success: parsedResponse.success,
        hasData: !!parsedResponse.data,
        dataType: Array.isArray(parsedResponse.data) ? 'array' : typeof parsedResponse.data,
        dataLength: Array.isArray(parsedResponse.data) ? parsedResponse.data.length : 'N/A',
        total: parsedResponse.total,
        firstItemKeys: Array.isArray(parsedResponse.data) && parsedResponse.data.length > 0 
          ? Object.keys(parsedResponse.data[0]) 
          : []
      });
      
      // Validate response structure
      if (typeof parsedResponse !== 'object') {
        console.warn(`Unexpected response type from ${url}: ${typeof parsedResponse}`);
      }
      
      return parsedResponse;
    } catch (parseError) {
      console.error(`Error parsing JSON response from ${url}:`, parseError);
      console.error(`Raw response text: "${responseText.substring(0, 300)}..."`);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error(`Errore nella chiamata GET a ${url}:`, error);
    throw error;
  }
};

/**
 * Funzione per effettuare una richiesta POST
 * @param {string} endpoint - L'endpoint relativo dell'API
 * @param {Object} data - I dati da inviare nel corpo della richiesta
 * @param {Object} options - Opzioni aggiuntive per la richiesta
 * @returns {Promise<any>} - Promise con la risposta JSON
 */
export const apiPost = async (endpoint, data, options = {}) => {
  const url = getApiUrl(endpoint);
  const headers = getDefaultHeaders(options.headers);
  
  try {
    console.log(`apiUtils: POST request to ${url}`, data);
    
    // Se c'è già un body in options, non aggiungere JSON.stringify(data)
    const hasCustomBody = options && options.body !== undefined;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: hasCustomBody ? options.headers : headers,
      body: hasCustomBody ? options.body : JSON.stringify(data),
      credentials: 'include',
      mode: 'cors',
      ...options,
      // Rimuovi body e headers se già specificati sopra
      ...(hasCustomBody ? {body: undefined, headers: undefined} : {})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    // Evita di loggare la risposta completa che potrebbe essere troncata in console
    console.log(`apiUtils: POST response ricevuta da ${url}, lunghezza: ${responseText.length} caratteri`);
    
    try {
      // Log solo una parte della risposta testuale per evitare troncamenti
      console.log(`Risposta testuale (primi 100 caratteri): ${responseText.substring(0, 100)}...`);
      
      const parsedResponse = JSON.parse(responseText);
      console.log(`Parsed JSON response structure:`, {
        success: parsedResponse.success,
        hasData: !!parsedResponse.data,
        dataType: Array.isArray(parsedResponse.data) ? 'array' : typeof parsedResponse.data,
        dataLength: Array.isArray(parsedResponse.data) ? parsedResponse.data.length : 'N/A',
        total: parsedResponse.total,
        firstItemKeys: Array.isArray(parsedResponse.data) && parsedResponse.data.length > 0 
          ? Object.keys(parsedResponse.data[0]) 
          : []
      });
      
      // Validate response structure
      if (typeof parsedResponse !== 'object') {
        console.warn(`Unexpected response type from ${url}: ${typeof parsedResponse}`);
      }
      
      return parsedResponse;
    } catch (parseError) {
      console.error(`Error parsing JSON response from ${url}:`, parseError);
      console.error(`Raw response text: "${responseText.substring(0, 300)}..."`);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error(`Errore nella chiamata POST a ${url}:`, error);
    throw error;
  }
};

/**
 * Funzione per effettuare una richiesta PUT
 * @param {string} endpoint - L'endpoint relativo dell'API
 * @param {Object} data - I dati da inviare nel corpo della richiesta
 * @param {Object} options - Opzioni aggiuntive per la richiesta
 * @returns {Promise<any>} - Promise con la risposta JSON
 */
export const apiPut = async (endpoint, data, options = {}) => {
  const url = getApiUrl(endpoint);
  const headers = getDefaultHeaders(options.headers);
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Errore nella chiamata PUT a ${url}:`, error);
    throw error;
  }
};

/**
 * Funzione per effettuare una richiesta DELETE
 * @param {string} endpoint - L'endpoint relativo dell'API
 * @param {Object} options - Opzioni aggiuntive per la richiesta
 * @returns {Promise<any>} - Promise con la risposta JSON
 */
export const apiDelete = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const headers = getDefaultHeaders(options.headers);
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      credentials: 'include',
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Errore nella chiamata DELETE a ${url}:`, error);
    throw error;
  }
};

/**
 * Funzione per effettuare una richiesta con un metodo personalizzato
 * @param {string} method - Il metodo HTTP da utilizzare
 * @param {string} endpoint - L'endpoint relativo dell'API
 * @param {Object} data - I dati da inviare nel corpo della richiesta
 * @param {Object} options - Opzioni aggiuntive per la richiesta
 * @returns {Promise<any>} - Promise con la risposta JSON
 */
export const apiRequest = async (method, endpoint, data = null, options = {}) => {
  const url = getApiUrl(endpoint);
  const headers = getDefaultHeaders(options.headers);
  
  const requestOptions = {
    method: method.toUpperCase(),
    headers,
    credentials: 'include',
    ...options
  };
  
  if (data !== null) {
    requestOptions.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Errore nella chiamata ${method} a ${url}:`, error);
    throw error;
  }
};

export default {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  request: apiRequest,
  getApiUrl // Esporta anche la funzione getApiUrl
};