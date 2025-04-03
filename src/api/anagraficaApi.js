// src/api/anagraficaApi.js
import apiUtils from '../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'r_anagrafica.php';

const anagraficaApi = {
    importData: async (formData) => {
        try {
            // Per FormData, usare opzioni speciali
            const options = {
                headers: {
                    // Non impostare Content-Type, fetch lo imposta automaticamente per FormData
                },
                body: formData
            };
            return await apiUtils.post(`${ENDPOINT}?action=import`, null, options);
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    },
    getData: async (params) => {
        try {
            return await apiUtils.get(`${ENDPOINT}?action=get`, { params });
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    },
    getRecord: async (id) => {
        try {
            return await apiUtils.get(`${ENDPOINT}?action=getRecord&id=${id}`);
        } catch (error) {
            console.error('Error fetching record:', error);
            throw error;
        }
    },
    updateRecord: async (id, data) => {
        try {
            return await apiUtils.post(`${ENDPOINT}?action=updateRecord&id=${id}`, data);
        } catch (error) {
            console.error('Error updating record:', error);
            throw error;
        }
    },
    deleteRecord: async (id) => {
        try {
            return await apiUtils.delete(`${ENDPOINT}?action=deleteRecord&id=${id}`);
        } catch (error) {
            console.error('Error deleting record:', error);
            throw error;
        }
    },
    getHeaderMapping: async () => {
        try {
            return await apiUtils.get(`${ENDPOINT}?action=getHeaderMapping`);
        } catch (error) {
            console.error('Error fetching header mapping:', error);
            throw error;
        }
    },
    saveHeaderMapping: async(mapping) => {
        try {
            return await apiUtils.post(`${ENDPOINT}?action=saveHeaderMapping`, mapping);
        } catch (error) {
            console.error('Error saving header mapping:', error);
            throw error;
        }
    },
    getAllIds: async (params) => {
        try {
            return await apiUtils.get(`${ENDPOINT}?action=getAllIds`, { params });
        } catch (error) {
            console.error('Error fetching all IDs:', error);
            throw error;
        }
    },
    getDbSchema: async () => {
        try {
            return await apiUtils.get(`${ENDPOINT}?action=getDbSchema`);
        } catch (error) {
            console.error('Error fetching DB schema:', error);
            throw error;
        }
    }
};

export default anagraficaApi;