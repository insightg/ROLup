/**
 * API per la gestione dei template di attività
 */
import apiUtils from '../../../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'r_tsis_tasks.php';

/**
 * Recupera la lista dei template di attività
 * @returns {Promise<Object>} Promise con i dati dei template
 */
export const fetchTaskTemplates = async () => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getTaskTemplates`);
    return result;
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera i dettagli di un template di attività
 * @param {number} templateId ID del template
 * @returns {Promise<Object>} Promise con i dati del template
 */
export const fetchTaskTemplate = async (templateId) => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getTaskTemplate&id=${templateId}`);
    return result;
  } catch (error) {
    console.error('Error fetching task template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crea un nuovo template di attività
 * @param {Object} templateData Dati del template
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const createTaskTemplate = async (templateData) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'createTaskTemplate',
      ...templateData
    });
    return result;
  } catch (error) {
    console.error('Error creating task template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Aggiorna un template di attività esistente
 * @param {Object} templateData Dati del template da aggiornare
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const updateTaskTemplate = async (templateData) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'updateTaskTemplate',
      ...templateData
    });
    return result;
  } catch (error) {
    console.error('Error updating task template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Elimina un template di attività
 * @param {number} templateId ID del template da eliminare
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const deleteTaskTemplate = async (templateId) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'deleteTaskTemplate',
      id: templateId
    });
    return result;
  } catch (error) {
    console.error('Error deleting task template:', error);
    return { success: false, error: error.message };
  }
};

export default {
  fetchTaskTemplates,
  fetchTaskTemplate,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate
};