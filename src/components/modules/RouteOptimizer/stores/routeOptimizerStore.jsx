import { create } from 'zustand';
import { 
  fetchPOSLocations, 
  optimizeRoute, 
  savePlan, 
  loadPlans, 
  loadPlan, 
  geocodeAddress,
  fetchGoogleMapsApiKey,
  deletePlan
} from '../api/routeOptimizerApi';

export const useRouteOptimizerStore = create((set, get) => ({
  // Stato
  locations: [], // Elenco di POS da visitare
  availablePOS: [], // POS disponibili per autosuggest
  optimizedRoute: null, // Risultati dell'ottimizzazione
  isOptimizing: false, // Flag operazione in corso
  isLoading: false, // Flag caricamento dati
  optimizationStats: null, // Statistiche sull'ottimizzazione
  error: null, // Eventuali errori
  savedPlans: [], // Piani salvati
  selectedPlan: null, // Piano selezionato
  
  // Impostazioni di pianificazione
  scheduleSettings: {
    startLocationType: 'firstLocation', // 'firstLocation' o 'custom'
    startLocation: null, // { address, lat, lng } per indirizzo personalizzato
    returnToStart: false, // se tornare al punto di partenza
    workStartTime: '08:00', // Orario inizio giornata
    workEndTime: '18:00', // Orario fine giornata
    lunchBreakStart: '13:00', // Inizio pausa pranzo
    lunchBreakDuration: 60, // Durata pausa pranzo in minuti
    maxDays: 7, // Massimi giorni pianificabili
    travelMode: 'driving', // Modalità di viaggio
    considerTraffic: true, // Considera il traffico
    avoidTolls: false, // Evita pedaggi
    avoidHighways: false, // Evita autostrade
    useHubForDailyStart: false, // Nuova opzione: usa il punto hub per iniziare ogni giorno
    optimizationMethod: 'global', // 'global' (ottimizzazione globale) o 'daily' (ottimizzazione giornaliera)
  },
  
  // Azioni
  addLocation: (location) => {
    set((state) => ({
      locations: [...state.locations, {
        ...location,
        id: Date.now().toString(), // Genera un ID univoco
        duration: location.duration || 30, // Durata in minuti, default 30
        priority: location.priority || 'normal', // Priorità, default normal
        notes: location.notes || ''
      }]
    }));
  },
  setAvailablePOS: (pos) => {
    set({ availablePOS: pos });
  },
  removeLocation: (locationId) => {
    set((state) => ({
      locations: state.locations.filter(loc => loc.id !== locationId)
    }));
  },
  
  updateLocation: (locationId, updates) => {
    set((state) => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, ...updates } : loc
      )
    }));
  },
  
  updateScheduleSettings: (settings) => {
    set((state) => ({
      scheduleSettings: { ...state.scheduleSettings, ...settings }
    }));
  },
  
  fetchPOS: async () => {
    try {
      console.log('Starting fetchPOS in store');
      set({ isLoading: true, error: null });
      
      const response = await fetchPOSLocations();
      console.log('Received POS data:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Errore nel caricamento dei POS');
      }
      
      const pos = response.data || [];
      
      if (pos.length === 0) {
        console.warn('No POS data received or empty array');
        set({ availablePOS: [], isLoading: false });
        return;
      }
      
      // Verifica che i dati siano nel formato corretto e contengano i campi necessari
      const validPos = pos.filter(item => 
        item && 
        typeof item === 'object' && 
        item.nome_account && 
        item.id
      );
      
      console.log(`Filtered ${validPos.length} valid POS records out of ${pos.length}`);
      
      set({ availablePOS: validPos, isLoading: false });
    } catch (error) {
      console.error('Error in fetchPOS:', error);
      set({ 
        error: error.message || 'Errore nel caricamento dei POS', 
        isLoading: false,
        availablePOS: [] 
      });
    }
  },
  
  optimizeRoute: async () => {
    const { locations, scheduleSettings } = get();
    
    if (locations.length < 2) {
      set({ error: 'Servono almeno due posizioni per ottimizzare un percorso' });
      return;
    }
    
    set({ isOptimizing: true, error: null });
    
    try {
      const result = await optimizeRoute(locations, scheduleSettings);
      
      set({ 
        optimizedRoute: result.route, 
        optimizationStats: result.stats,
        isOptimizing: false 
      });
      
      return result;
    } catch (error) {
      set({ 
        error: error.message || 'Errore nell\'ottimizzazione del percorso', 
        isOptimizing: false 
      });
      throw error;
    }
  },
  
  savePlanToServer: async (name, description) => {
    try {
      const { optimizedRoute, locations, scheduleSettings } = get();
      
      if (!optimizedRoute) {
        throw new Error('Nessun percorso da salvare');
      }
      
      const planData = {
        name,
        description,
        originalLocations: locations,
        optimizedRoute,
        scheduleSettings
      };
      
      await savePlan(planData);
      await get().fetchSavedPlans(); // Ricarica i piani salvati
      
      return true;
    } catch (error) {
      set({ error: error.message || 'Errore nel salvataggio del piano' });
      return false;
    }
  },
  
  fetchSavedPlans: async () => {
    try {
      const response = await loadPlans();
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Errore nel caricamento dei piani');
      }
      
      set({ savedPlans: response.data || [] });
    } catch (error) {
      set({ error: error.message || 'Errore nel caricamento dei piani salvati' });
    }
  },
  
  loadPlanFromServer: async (planId) => {
    try {
      const response = await loadPlan(planId);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Errore nel caricamento del piano');
      }
      
      const plan = response.data;
      
      set({ 
        selectedPlan: plan,
        locations: plan.originalLocations,
        optimizedRoute: plan.optimizedRoute,
        scheduleSettings: plan.scheduleSettings,
        optimizationStats: plan.optimizedRoute.stats
      });
      
      return plan;
    } catch (error) {
      set({ error: error.message || 'Errore nel caricamento del piano' });
      throw error;
    }
  },
  
  clearLocations: () => {
    set({ locations: [] });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  clearError: () => {
    set({ error: null });
  }
}));