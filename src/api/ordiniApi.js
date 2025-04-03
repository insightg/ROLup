// src/components/modules/Ordini/api/ordiniApi.js
import apiUtils from '../utils/apiUtils';

// L'endpoint relativo che verrà risolto dinamicamente tramite apiUtils.getApiUrl
const ENDPOINT = 'r_ordini.php';

const ordiniApi = {
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
    getAllIds: async (params) => {
        try {
            return await apiUtils.get(`${ENDPOINT}?action=getAllIds`, { params });
        } catch (error) {
            console.error('Error fetching all IDs:', error);
            throw error;
        }
    }
};

export default ordiniApi;
