// src/components/modules/Anagrafica/api/anagraficaApi.js
import apiUtils from '../../../../utils/apiUtils';

/**
 * API per la gestione dell'Anagrafica
 * Utilizza le utility centralizzate per le chiamate API
 * Endpoint backend: backend/r_anagrafica.php
 */

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'r_anagrafica.php';

const anagraficaApi = {
    /**
     * Importa dati da un file
     * @param {FormData} formData - Dati del form con il file
     * @returns {Promise<Object>} - Promise con il risultato dell'importazione
     */
    importData: async (formData) => {
        const url = `${ENDPOINT}?action=import`;
        const options = {
            headers: {
                // Non impostare Content-Type, fetch lo imposta automaticamente per FormData
            },
            body: formData
        };
        return apiUtils.post(url, null, options);
    },

    /**
     * Recupera i dati dell'anagrafica con paginazione e filtri
     * @param {Object} params - Parametri di query (page, pageSize, filters, etc.)
     * @returns {Promise<Object>} - Promise con i dati dell'anagrafica
     */
    getData: async (params) => {
        try {
            console.log("anagraficaApi: Attempting to fetch data from backend with params:", params);
            
            // Risolve problemi potenziali
            const cleanParams = {...params};
            // Assicurati che le stringhe siano stringhe
            if (cleanParams.search !== undefined && typeof cleanParams.search !== 'string') {
                cleanParams.search = String(cleanParams.search);
            }
            
            // Log completo dei parametri
            console.log("anagraficaApi: Clean params:", cleanParams);
            
            // Tentativo di chiamata con timeout esteso
            const fetchPromise = apiUtils.get(`${ENDPOINT}?action=get`, { params: cleanParams });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout dopo 20 secondi')), 20000)
            );
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            console.log("anagraficaApi: Backend response received, type:", typeof response);
            console.log("anagraficaApi: Backend response structure:", {
                hasSuccess: response && 'success' in response,
                successValue: response && response.success,
                hasData: response && 'data' in response,
                dataType: response && response.data ? (Array.isArray(response.data) ? 'array' : typeof response.data) : 'undefined',
                dataLength: response && response.data && Array.isArray(response.data) ? response.data.length : 'N/A'
            });
            
            if (response && response.success && response.data) {
                // Prova a ispezionare più in dettaglio i dati
                if (Array.isArray(response.data)) {
                    console.log(`anagraficaApi: Received ${response.data.length} records as direct array`);
                    if (response.data.length > 0) {
                        console.log("anagraficaApi: First record keys:", Object.keys(response.data[0]));
                    }
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    console.log(`anagraficaApi: Received ${response.data.data.length} records in nested data.data`);
                    if (response.data.data.length > 0) {
                        console.log("anagraficaApi: First record keys (nested):", Object.keys(response.data.data[0]));
                    }
                }
            }
            
            // Controlla se ci sono problemi di parsing o di struttura
            if (typeof response !== 'object') {
                console.error("anagraficaApi: Response is not an object:", response);
                throw new Error("Risposta non valida dal server (not an object)");
            }
            
            if (!('success' in response)) {
                console.error("anagraficaApi: Response missing 'success' property:", response);
                throw new Error("Risposta incompleta dal server (missing success)");
            }
            
            if (!response.success) {
                console.error("anagraficaApi: Response indicates failure:", response);
                throw new Error(response.message || "Errore dal server");
            }
            
            if (!('data' in response)) {
                console.error("anagraficaApi: Response missing 'data' property:", response);
                throw new Error("Risposta incompleta dal server (missing data)");
            }
            
            return response;
        } catch (error) {
            console.error("anagraficaApi: Error fetching from backend:", error);
            console.log("anagraficaApi: Falling back to test data due to error");
            
            // Use test data as fallback for development/testing
            try {
                console.log("anagraficaApi: Trying to load test data...");
                const testResponse = await fetch('/temp/test_data.json');
                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    console.log("anagraficaApi: Successfully loaded test data:", testData);
                    return testData;
                } else {
                    console.error("anagraficaApi: Failed to load test data, status:", testResponse.status);
                }
            } catch (fallbackError) {
                console.error("anagraficaApi: Error loading test data:", fallbackError);
            }
            
            // Re-throw the original error if test data also fails
            throw error;
        }
    },

    /**
     * Recupera un record specifico
     * @param {number|string} id - ID del record
     * @returns {Promise<Object>} - Promise con il record
     */
    getRecord: async (id) => {
        return apiUtils.get(`${ENDPOINT}?action=getRecord&id=${id}`);
    },

    /**
     * Aggiorna un record
     * @param {number|string} id - ID del record
     * @param {Object} data - Dati da aggiornare
     * @returns {Promise<Object>} - Promise con il risultato dell'aggiornamento
     */
    updateRecord: async (id, data) => {
        return apiUtils.post(`${ENDPOINT}?action=updateRecord&id=${id}`, data);
    },

    /**
     * Elimina un record
     * @param {number|string} id - ID del record
     * @returns {Promise<Object>} - Promise con il risultato dell'eliminazione
     */
    deleteRecord: async (id) => {
        return apiUtils.delete(`${ENDPOINT}?action=deleteRecord&id=${id}`);
    },

    /**
     * Recupera la mappatura degli header
     * @returns {Promise<Object>} - Promise con la mappatura
     */
    getHeaderMapping: async () => {
        return apiUtils.get(`${ENDPOINT}?action=getHeaderMapping`);
    },

    /**
     * Salva la mappatura degli header
     * @param {Object} mapping - Mappatura da salvare
     * @returns {Promise<Object>} - Promise con il risultato del salvataggio
     */
    saveHeaderMapping: async (mapping) => {
        return apiUtils.post(`${ENDPOINT}?action=saveHeaderMapping`, mapping);
    },

    /**
     * Recupera tutti gli ID
     * @param {Object} params - Parametri di query (filters, etc.)
     * @returns {Promise<Object>} - Promise con gli ID
     */
    getAllIds: async (params) => {
        return apiUtils.get(`${ENDPOINT}?action=getAllIds`, { params });
    },

    /**
     * Recupera lo schema del database
     * @returns {Promise<Object>} - Promise con lo schema
     */
    getDbSchema: async () => {
        return apiUtils.get(`${ENDPOINT}?action=getDbSchema`);
    },
    
    /**
     * Test diretto di connessione al backend e recupero dati
     * @returns {Promise<Object>} - Promise con i risultati del test
     */
    testDirectFetch: async () => {
        try {
            console.log("anagraficaApi: Testing direct fetch to backend");
            
            // Test 1: Chiamata diretta fetch senza librerie
            const directResponse = await fetch(`${ENDPOINT}?action=get&page=1&pageSize=2`);
            console.log("anagraficaApi: Direct fetch status:", directResponse.status);
            console.log("anagraficaApi: Direct fetch headers:", Object.fromEntries([...directResponse.headers]));
            
            let responseText = await directResponse.text();
            console.log("anagraficaApi: Direct fetch response text length:", responseText.length);
            console.log("anagraficaApi: Direct fetch response text excerpt:", responseText.substring(0, 300) + "...");
            
            // Test 2: Chiamata con XMLHttpRequest
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `${ENDPOINT}?action=get&page=1&pageSize=2`);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        console.log("anagraficaApi: XHR Success - response length:", xhr.responseText.length);
                        try {
                            const data = JSON.parse(xhr.responseText);
                            console.log("anagraficaApi: XHR parsed data:", {
                                success: data.success,
                                hasData: 'data' in data,
                                dataType: data.data ? (Array.isArray(data.data) ? 'array' : typeof data.data) : 'undefined',
                                dataLength: data.data && Array.isArray(data.data) ? data.data.length : 'N/A'
                            });
                            resolve(data);
                        } catch (e) {
                            console.error("anagraficaApi: XHR parse error:", e);
                            reject(e);
                        }
                    } else {
                        console.error("anagraficaApi: XHR error:", xhr.status);
                        reject(new Error('XHR request failed: ' + xhr.status));
                    }
                };
                xhr.onerror = function() {
                    console.error("anagraficaApi: XHR network error");
                    reject(new Error('XHR Network Error'));
                };
                xhr.send();
            });
        } catch (error) {
            console.error("anagraficaApi: Test direct fetch error:", error);
            throw error;
        }
    }
};

export default anagraficaApi;