/**
 * API per l'ottimizzatore di percorsi
 */
import apiUtils from '../../../../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'r_route_optimizer.php';

/**
 * Recupera la chiave API di Google Maps dal backend
 */
export const fetchGoogleMapsApiKey = async () => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getGoogleMapsApiKey`);
    
    if (!result.success) {
      throw new Error(result.error || 'Errore nel recupero della chiave API');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error);
    throw error;
  }
};

/**
 * Recupera i POS con indirizzi per l'autosuggest
 */
export const fetchPOSLocations = async (searchTerm = '') => {
  try {
    console.log('Fetching POS locations with search term:', searchTerm);
    const result = await apiUtils.get(`${ENDPOINT}?action=getPOSLocations&search=${encodeURIComponent(searchTerm)}`);
    
    console.log('POS locations response:', result.success ? `Success: ${result.data?.length || 0} items` : `Error: ${result.error}`);
    
    return result;
  } catch (error) {
    console.error('Error fetching POS locations:', error);
    return { 
      success: false, 
      error: error.message || 'Errore nel recupero dei POS'
    };
  }
};

/**
 * Ottimizza il percorso tra i punti selezionati
 */
export const optimizeRoute = async (locations, settings) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'optimizeRoute',
      locations,
      settings
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Errore nell\'ottimizzazione del percorso');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error optimizing route:', error);
    throw error;
  }
};

/**
 * Salva un piano di percorso sul server
 */
export const savePlan = async (planData) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'savePlan',
      plan: planData
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Errore nel salvataggio del piano');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error saving plan:', error);
    throw error;
  }
};

/**
 * Carica l'elenco dei piani salvati
 */
export const loadPlans = async () => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getPlans`);
    return result;
  } catch (error) {
    console.error('Error loading plans:', error);
    return { 
      success: false, 
      error: error.message || 'Errore nel caricamento dei piani'
    };
  }
};

/**
 * Carica un piano specifico
 */
export const loadPlan = async (planId) => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getPlan&id=${planId}`);
    return result;
  } catch (error) {
    console.error('Error loading plan:', error);
    return { 
      success: false, 
      error: error.message || 'Errore nel caricamento del piano'
    };
  }
};

/**
 * Elimina un piano salvato
 */
export const deletePlan = async (planId) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'deletePlan',
      id: planId
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Errore nell\'eliminazione del piano');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error;
  }
};

/**
 * Geocodifica un indirizzo
 */
export const geocodeAddress = async (address) => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=geocodeAddress&address=${encodeURIComponent(address)}`);
    
    if (!result.success) {
      throw new Error(result.error || 'Errore nella geocodifica dell\'indirizzo');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
};

/**
 * Ottiene un percorso stradale tra due punti
 */
export const getRouteBetweenPoints = async (origin, destination) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'getRouteBetweenPoints',
      origin,
      destination
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Errore nel calcolo del percorso');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error getting route between points:', error);
    throw error;
  }
};