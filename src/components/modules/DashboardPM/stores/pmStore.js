import { create } from 'zustand';
import apiUtils from '../../../../utils/apiUtils';

export const usePMStore = create((set, get) => ({
  // Stato
  posList: [],
  stats: {
    total: 0,
    assegnati: 0,
    in_lavorazione: 0,
    standby: 0,
    non_lavorabili: 0,
    completati: 0
  },
  isLoading: false,
  error: null,
  userRole: null,
  availableStates: [],
  
  // Azioni
  setPosList: (posList) => set({ posList }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setUserRole: (role) => set({ userRole: role }),
  setAvailableStates: (states) => set({ availableStates: states }),
  
  // Azione per caricare gli stati
  loadAvailableStates: async () => {
    try {
      const result = await apiUtils.get('b_tsis.php?action=getStatiAvanzamento');
      
      if (result.success) {
        const orderStates = result.data.filter(stato => 
          stato.tipo === 'ordine' && stato.attivo
        );
        set({ availableStates: orderStates });
      }
    } catch (error) {
      console.error('Error loading available states:', error);
    }
  },
  
  // Azione per ricaricare tutti i dati
  refreshData: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Esegui le chiamate in parallelo
      const [posResponse, statsResponse, statesResponse] = await Promise.all([
        apiUtils.get('r_tsis_pm.php?action=getPMPOSList'),
        apiUtils.get('r_tsis_pm.php?action=getPMStats'),
        apiUtils.get('b_tsis.php?action=getStatiAvanzamento')
      ]);
      
      // Aggiorna lo stato con i dati delle risposte
      if (posResponse.success) {
        set({ 
          posList: posResponse.data,
          userRole: posResponse.userRole || get().userRole // Memorizza il ruolo dell'utente
        });
      } else {
        set({ error: posResponse.error || 'Errore nel caricamento della lista POS' });
      }
      
      if (statsResponse.success) {
        set({ 
          stats: statsResponse.data,
          userRole: get().userRole || statsResponse.userRole 
        });
      }
      
      // Aggiorna stati
      if (statesResponse.success) {
        const orderStates = statesResponse.data.filter(stato => 
          stato.tipo === 'ordine' && stato.attivo
        );
        set({ availableStates: orderStates });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  }
}));