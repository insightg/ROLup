// src/components/modules/ChatBot/api/chatBotApi.js
import apiUtils from '../../../../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'b_ciao.php';

const chatBotApi = {
  /**
   * Ottiene tutti i profili disponibili
   * @returns {Promise} Promise con la risposta
   */
  getProfiles: async () => {
    try {
      return await apiUtils.get(`${ENDPOINT}?action=getProfiles`);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }
  },
  
  /**
   * Salva un profilo (crea nuovo o aggiorna esistente)
   * @param {Object} profileData Dati del profilo
   * @returns {Promise} Promise con la risposta
   */
  saveProfile: async (profileData) => {
    try {
      return await apiUtils.post(`${ENDPOINT}?action=saveProfile`, profileData);
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  },
  
  /**
   * Elimina un profilo
   * @param {string} profileId ID del profilo
   * @returns {Promise} Promise con la risposta
   */
  deleteProfile: async (profileId) => {
    try {
      return await apiUtils.delete(`${ENDPOINT}?action=deleteProfile&id=${profileId}`);
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  },
  
  /**
   * Imposta il profilo di default per la versione mobile
   * @returns {Promise} Promise con la risposta
   */
  clearMobileDefault: async () => {
    try {
      return await apiUtils.post(`${ENDPOINT}?action=clearMobileDefault`);
    } catch (error) {
      console.error('Error clearing mobile default:', error);
      throw error;
    }
  },
  
  /**
   * Ottiene una risposta dal bot
   * @param {Object} requestData Dati della richiesta
   * @returns {Promise} Promise con la risposta
   */
  getBotResponse: async (requestData) => {
    try {
      return await apiUtils.post(`${ENDPOINT}?action=getBotResponse`, requestData);
    } catch (error) {
      console.error('Error getting bot response:', error);
      throw error;
    }
  },
  
  /**
   * Ottiene le impostazioni
   * @returns {Promise} Promise con la risposta
   */
  getSettings: async () => {
    try {
      return await apiUtils.get(`${ENDPOINT}?action=getSettings`);
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },
  
  /**
   * Salva le impostazioni
   * @param {Object} settingsData Dati delle impostazioni
   * @returns {Promise} Promise con la risposta
   */
  saveSettings: async (settingsData) => {
    try {
      return await apiUtils.post(`${ENDPOINT}?action=saveSettings`, settingsData);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
};

export default chatBotApi;
