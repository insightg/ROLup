// src/components/modules/POSDashboard/api/posApi.ts
import apiUtils from '../../../../utils/apiUtils';

// Endpoint relativi che verranno risolti dinamicamente tramite apiUtils.getApiUrl
const TSIS_ENDPOINT = 'b_tsis.php';

/**
 * Interfaccia per lo stato di avanzamento
 */
interface StatoAvanzamento {
  id: number;
  codice: string;
  descrizione: string;
  tipo: string;
  colore: string;
  icona: string;
  attivo: boolean;
}

/**
 * Interfaccia per la risposta del server
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

/**
 * Recupera la struttura ad albero degli ordini
 * @returns {Promise<ApiResponse<any>>}
 */
export const fetchOrderTree = async (): Promise<ApiResponse<any>> => {
  try {
    return await apiUtils.get(`${TSIS_ENDPOINT}?action=getTree`);
  } catch (error) {
    console.error('Error fetching order tree:', error);
    return { success: false, data: null, error: (error as Error).message };
  }
};

/**
 * Recupera gli stati di avanzamento disponibili
 * @returns {Promise<ApiResponse<StatoAvanzamento[]>>}
 */
export const fetchStatiAvanzamento = async (): Promise<ApiResponse<StatoAvanzamento[]>> => {
  try {
    return await apiUtils.get(`${TSIS_ENDPOINT}?action=getStatiAvanzamento`);
  } catch (error) {
    console.error('Error fetching stati avanzamento:', error);
    return { success: false, data: [], error: (error as Error).message };
  }
};

/**
 * Aggiorna lo stato di un subtask
 * @param params I parametri per l'aggiornamento
 * @returns {Promise<ApiResponse<any>>}
 */
export const updateTaskState = async (params: {
  order_id: number;
  task_id: string;
  subtask_id: string;
  new_state: string;
}): Promise<ApiResponse<any>> => {
  try {
    return await apiUtils.post(`${TSIS_ENDPOINT}?action=updateTaskState`, params);
  } catch (error) {
    console.error('Error updating task state:', error);
    return { success: false, data: null, error: (error as Error).message };
  }
};

/**
 * Salva lo stato di un ordine
 * @param params I parametri per il salvataggio
 * @returns {Promise<ApiResponse<any>>}
 */
export const saveOrderState = async (params: {
  order_id: number;
  status: string;
  reason?: string;
}): Promise<ApiResponse<any>> => {
  try {
    return await apiUtils.post(`${TSIS_ENDPOINT}?action=saveOrderState`, params);
  } catch (error) {
    console.error('Error saving order state:', error);
    return { success: false, data: null, error: (error as Error).message };
  }
};