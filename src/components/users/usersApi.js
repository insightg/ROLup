/**
 * API per la gestione degli utenti
 */
import apiUtils from '../../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'b_users.php';

/**
 * Recupera la lista degli utenti
 * @returns {Promise<Object>} Promise con i dati degli utenti
 */
export const fetchUsers = async () => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getUsers`);
    return result;
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera la lista dei gruppi
 * @returns {Promise<Object>} Promise con i dati dei gruppi
 */
export const fetchGroups = async () => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getGroups`);
    return result;
  } catch (error) {
    console.error('Error fetching groups:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crea un nuovo utente
 * @param {Object} userData Dati del nuovo utente
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const createUser = async (userData) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'createUser',
      ...userData
    });
    return result;
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Aggiorna un utente esistente
 * @param {Object} userData Dati dell'utente da aggiornare
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const updateUser = async (userData) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'updateUser',
      ...userData
    });
    return result;
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Elimina un utente
 * @param {number} userId ID dell'utente da eliminare
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const deleteUser = async (userId) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'deleteUser',
      userId
    });
    return result;
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Crea un nuovo gruppo
 * @param {Object} groupData Dati del nuovo gruppo
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const createGroup = async (groupData) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'createGroup',
      ...groupData
    });
    return result;
  } catch (error) {
    console.error('Error creating group:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Aggiorna un gruppo esistente
 * @param {Object} groupData Dati del gruppo da aggiornare
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const updateGroup = async (groupData) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'updateGroup',
      ...groupData
    });
    return result;
  } catch (error) {
    console.error('Error updating group:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Elimina un gruppo
 * @param {number} groupId ID del gruppo da eliminare
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const deleteGroup = async (groupId) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'deleteGroup',
      groupId
    });
    return result;
  } catch (error) {
    console.error('Error deleting group:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera i permessi di un gruppo
 * @param {number} groupId ID del gruppo
 * @returns {Promise<Object>} Promise con i dati dei permessi
 */
export const fetchGroupPermissions = async (groupId) => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getGroupPermissions&groupId=${groupId}`);
    return result;
  } catch (error) {
    console.error('Error fetching group permissions:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Aggiorna i permessi di un gruppo
 * @param {number} groupId ID del gruppo
 * @param {Array} permissions Array di permessi
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const updateGroupPermissions = async (groupId, permissions) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'updateGroupPermissions',
      groupId,
      permissions
    });
    return result;
  } catch (error) {
    console.error('Error updating group permissions:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera i gruppi di un utente
 * @param {number} userId ID dell'utente
 * @returns {Promise<Object>} Promise con i dati dei gruppi dell'utente
 */
export const fetchUserGroups = async (userId) => {
  try {
    const result = await apiUtils.get(`${ENDPOINT}?action=getUserGroups&userId=${userId}`);
    return result;
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Aggiorna i gruppi di un utente
 * @param {number} userId ID dell'utente
 * @param {Array} groupIds Array di ID dei gruppi
 * @returns {Promise<Object>} Promise con l'esito dell'operazione
 */
export const updateUserGroups = async (userId, groupIds) => {
  try {
    const result = await apiUtils.post(ENDPOINT, {
      action: 'updateUserGroups',
      userId,
      groupIds
    });
    return result;
  } catch (error) {
    console.error('Error updating user groups:', error);
    return { success: false, error: error.message };
  }
};

export default {
  fetchUsers,
  fetchGroups,
  createUser,
  updateUser,
  deleteUser,
  createGroup,
  updateGroup,
  deleteGroup,
  fetchGroupPermissions,
  updateGroupPermissions,
  fetchUserGroups,
  updateUserGroups
};