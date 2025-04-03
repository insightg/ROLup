// src/stores/ordiniStore.js
import { create } from 'zustand';

const useOrdiniStore = create((set) => ({
    // Stato
    currentRecord: null,
    filters: [],
    
    // Azioni
    setCurrentRecord: (record) => set({ currentRecord: record }),
    setFilters: (filters) => set({ filters }),
    
    // Reset
    reset: () => set({ 
        currentRecord: null,
        filters: []
    })
}));

export default useOrdiniStore;
