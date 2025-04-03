// src/components/modules/DashboardPM/api/pmApi.js
import apiUtils from '../../../../utils/apiUtils';

// Endpoint relativi per PM e Task che verranno risolti dinamicamente tramite apiUtils.getApiUrl
const PM_ENDPOINT = 'r_tsis_pm.php';
const TASK_ENDPOINT = 'r_tsis_tasks.php';
const TSIS_ENDPOINT = 'b_tsis.php';
  
/**
 * Recupera la lista dei POS assegnati al PM
 * @returns {Promise<Object>} - Promise con i dati dei POS
 */
export const fetchPMPOSList = async () => {
  try {
    return await apiUtils.get(`${PM_ENDPOINT}?action=getPMPOSList`);
  } catch (error) {
    console.error('Error fetching PM POS list:', error);
    return { success: false, error: error.message };
  }
};
  
/**
 * Recupera le statistiche del PM
 * @returns {Promise<Object>} - Promise con le statistiche
 */
export const fetchPMStats = async () => {
  try {
    return await apiUtils.get(`${PM_ENDPOINT}?action=getPMStats`);
  } catch (error) {
    console.error('Error fetching PM stats:', error);
    return { success: false, error: error.message };
  }
};
  
/**
 * Aggiorna lo stato di un POS
 * @param {number} posId - ID del POS
 * @param {string} status - Nuovo stato
 * @param {string} reason - Motivo del cambiamento
 * @returns {Promise<Object>} - Promise con il risultato
 */
export const updatePOSStatus = async (posId, status, reason) => {
  try {
    return await apiUtils.post(PM_ENDPOINT, {
      action: 'updatePOSStatus',
      pos_id: posId,
      status: status,
      reason: reason
    });
  } catch (error) {
    console.error('Error updating POS status:', error);
    return { success: false, error: error.message };
  }
};
  
/**
 * Recupera i task per un ordine specifico
 * @param {number} posOrderId - ID dell'ordine POS
 * @returns {Promise<Object>} - Promise con i task
 */
export const fetchTasksForOrder = async (posOrderId) => {
  try {
    // Usando l'endpoint e l'action corretti
    return await apiUtils.get(`${TASK_ENDPOINT}?action=getOrderTasks&order_id=${posOrderId}`);
  } catch (error) {
    console.error('Error fetching tasks for order:', error);
    return { success: false, error: error.message };
  }
};
  
/**
 * Aggiorna lo stato di un subtask
 * @param {number} posOrderId - ID dell'ordine POS
 * @param {string} taskId - ID del task
 * @param {string} subtaskId - ID del subtask
 * @param {string} newState - Nuovo stato
 * @returns {Promise<Object>} - Promise con il risultato
 */
export const updateTaskState = async (posOrderId, taskId, subtaskId, newState) => {
  try {
    // Formato corretto per l'API r_tsis_tasks.php
    const formData = new URLSearchParams();
    formData.append('order_id', posOrderId);
    formData.append('task_title', taskId);
    formData.append('subtask_title', subtaskId || taskId);
    formData.append('stato', newState);
    
    return await apiUtils.post(`${TASK_ENDPOINT}?action=updateTaskState`, null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
  } catch (error) {
    console.error('Error updating task state:', error);
    return { success: false, error: error.message };
  }
};
  
/**
 * Recupera i documenti per un POS
 * @param {number} posId - ID del POS
 * @returns {Promise<Object>} - Promise con i documenti
 */
export const fetchDocuments = async (posId) => {
  try {
    return await apiUtils.get(`${PM_ENDPOINT}?action=getDocuments&pos_id=${posId}`);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message };
  }
};
  
/**
 * Recupera i dettagli di un POS
 * @param {number} posId - ID del POS
 * @returns {Promise<Object>} - Promise con i dettagli
 */
export const fetchPOSDetails = async (posId) => {
  try {
    return await apiUtils.get(`${PM_ENDPOINT}?action=getPOSDetails&pos_id=${posId}`);
  } catch (error) {
    console.error('Error fetching POS details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera gli stati di avanzamento disponibili
 * @returns {Promise<Object>} - Promise con gli stati di avanzamento
 */
export const fetchStatiAvanzamento = async () => {
  try {
    return await apiUtils.get(`${TSIS_ENDPOINT}?action=getStatiAvanzamento`);
  } catch (error) {
    console.error('Error fetching stati avanzamento:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera la lista dei PM disponibili
 * @returns {Promise<Object>} - Promise con i PM disponibili
 */
export const fetchAvailablePMs = async () => {
  try {
    return await apiUtils.get(`${TSIS_ENDPOINT}?action=getAvailablePMs`);
  } catch (error) {
    console.error('Error fetching available PMs:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Assegna un PM a un ordine
 * @param {number} orderId - ID dell'ordine
 * @param {number} pmId - ID del PM
 * @param {string} note - Note opzionali
 * @returns {Promise<Object>} - Promise con il risultato dell'assegnazione
 */
export const assignPMToOrder = async (orderId, pmId, note = '') => {
  try {
    const formData = new URLSearchParams();
    formData.append('order_id', orderId);
    formData.append('pm_id', pmId);
    formData.append('note', note);
    
    return await apiUtils.post(`${TSIS_ENDPOINT}?action=assignPMToOrder`, null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
  } catch (error) {
    console.error('Error assigning PM to order:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Assegna un PM a più ordini (batch)
 * @param {Array<number>} orderIds - Array di ID degli ordini
 * @param {number} pmId - ID del PM
 * @returns {Promise<Object>} - Promise con il risultato delle assegnazioni
 */
export const batchAssignPMToOrders = async (orderIds, pmId) => {
  try {
    const promises = orderIds.map(orderId => assignPMToOrder(orderId, pmId));
    const results = await Promise.all(promises);
    
    // Verifica se tutte le operazioni sono andate a buon fine
    const allSuccess = results.every(result => result.success);
    
    return {
      success: allSuccess,
      results: results
    };
  } catch (error) {
    console.error('Error in batch assign PM:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cambia lo stato di più ordini (batch)
 * @param {Array<number>} orderIds - Array di ID degli ordini
 * @param {string} status - Nuovo stato
 * @param {string} reason - Motivo del cambiamento
 * @returns {Promise<Object>} - Promise con il risultato dei cambi di stato
 */
export const batchUpdatePOSStatus = async (orderIds, status, reason) => {
  try {
    const promises = orderIds.map(orderId => 
      updatePOSStatus(orderId, status, reason)
    );
    
    const results = await Promise.all(promises);
    
    // Verifica se tutte le operazioni sono andate a buon fine
    const allSuccess = results.every(result => result.success);
    
    return {
      success: allSuccess,
      results: results
    };
  } catch (error) {
    console.error('Error in batch update POS status:', error);
    return { success: false, error: error.message };
  }
};