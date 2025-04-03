// src/api/anagraficaApi.js
import axios from 'axios';

const API_BASE_URL = '../../backend/r_anagrafica.php'; // Percorso al backend

const anagraficaApi = {
    importData: async (formData) => {
        return await axios.post(`${API_BASE_URL}?action=import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    getData: async (params) => {
        return await axios.get(`${API_BASE_URL}?action=get&${new URLSearchParams(params).toString()}`);
    },
    getRecord: async (id) => {
        return await axios.get(`${API_BASE_URL}?action=getRecord&id=${id}`);
    },
    updateRecord: async (id, data) => {
        return await axios.post(`${API_BASE_URL}?action=updateRecord&id=${id}`, data);
    },
    deleteRecord: async (id) => {
        return await axios.delete(`${API_BASE_URL}?action=deleteRecord&id=${id}`);
    },
    getHeaderMapping: async () => {
        return await axios.get(`${API_BASE_URL}?action=getHeaderMapping`);
    },
    saveHeaderMapping: async(mapping) => {
        return await axios.post(`${API_BASE_URL}?action=saveHeaderMapping`, mapping);
    }
};

export default anagraficaApi;

