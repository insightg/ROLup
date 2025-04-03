// src/stores/anagraficaStore.js
import { create } from 'zustand';

const useAnagraficaStore = create((set) => ({
    headerMapping: [],
    setHeaderMapping: (mapping) => set({ headerMapping: mapping }),
    importMode: 'insert', // Default: 'insert' o 'update'
    setImportMode: (mode) => set({ importMode: mode }),
}));

export default useAnagraficaStore;
