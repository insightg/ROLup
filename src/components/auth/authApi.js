/**
 * API per la gestione dell'autenticazione
 */
import apiUtils from '../../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'auth.php';

/**
 * Verifica lo stato di autenticazione
 * @returns {Promise<Object>} Promise con la risposta
 */
export const checkAuthStatus = async () => {
  try {
    return await apiUtils.get(`${ENDPOINT}?action=checkAuth`);
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Effettua il login
 * @param {string} username Nome utente
 * @param {string} password Password
 * @returns {Promise<Object>} Promise con la risposta
 */
export const login = async (username, password) => {
  try {
    return await apiUtils.post(ENDPOINT, {
      action: 'login',
      username,
      password
    });
  } catch (error) {
    console.error('Error during login:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Effettua il logout
 * @returns {Promise<Object>} Promise con la risposta
 */
export const logout = async () => {
  try {
    return await apiUtils.post(ENDPOINT, {
      action: 'logout'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cambia la password
 * @param {string} currentPassword Password attuale
 * @param {string} newPassword Nuova password
 * @returns {Promise<Object>} Promise con la risposta
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    return await apiUtils.post(ENDPOINT, {
      action: 'changePassword',
      currentPassword,
      newPassword
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Ottiene il profilo utente
 * @returns {Promise<Object>} Promise con la risposta
 */
export const getProfile = async () => {
  try {
    return await apiUtils.get(`${ENDPOINT}?action=getProfile`);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: error.message };
  }
};

export default {
  checkAuthStatus,
  login,
  logout,
  changePassword,
  getProfile
};