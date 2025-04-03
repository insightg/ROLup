import { create } from 'zustand';

export const useRouteStore = create((set, get) => ({
  // Stato
  availablePos: [],
  selectedPos: [],
  routeResult: null,
  isLoading: false,
  isOptimizing: false,
  error: null,
  
  // Azioni
  loadAvailablePOS: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('../../backend/r_route_optimizer.php?action=getAvailablePOS');
      const result = await response.json();
      
      if (result.success) {
        set({ availablePos: result.data });
      } else {
        set({ error: result.error || 'Errore nel caricamento dei POS' });
      }
    } catch (error) {
      console.error('Error loading POS:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadPosFromTerritory: async (territory) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`../../backend/r_route_optimizer.php?action=getPOSByTerritory&territory=${encodeURIComponent(territory)}`);
      const result = await response.json();
      
      if (result.success) {
        set({ availablePos: result.data });
      } else {
        set({ error: result.error || 'Errore nel caricamento dei POS' });
      }
    } catch (error) {
      console.error('Error loading POS by territory:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadSavedRoute: async (routeId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`../../backend/r_route_optimizer.php?action=getSavedRoute&route_id=${routeId}`);
      const result = await response.json();
      
      if (result.success) {
        set({ 
          selectedPos: result.data.selected_pos,
          routeResult: result.data.route_result
        });
      } else {
        set({ error: result.error || 'Errore nel caricamento del percorso salvato' });
      }
    } catch (error) {
      console.error('Error loading saved route:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addPosToSelection: (pos) => {
    const { selectedPos } = get();
    const isAlreadySelected = selectedPos.some(item => item.id === pos.id);
    
    if (!isAlreadySelected) {
      set({ selectedPos: [...selectedPos, pos] });
    }
  },
  
  removePosFromSelection: (posId) => {
    const { selectedPos } = get();
    set({ selectedPos: selectedPos.filter(pos => pos.id !== posId) });
  },
  
  setVisitDuration: (posId, duration) => {
    const { selectedPos } = get();
    
    set({
      selectedPos: selectedPos.map(pos => 
        pos.id === posId ? { ...pos, visitDuration: duration } : pos
      )
    });
  },
  
  setPosVisitPriority: (posId, priority) => {
    const { selectedPos } = get();
    
    set({
      selectedPos: selectedPos.map(pos => 
        pos.id === posId ? { ...pos, priority } : pos
      )
    });
  },
  
  optimizeRoute: async (parameters) => {
    set({ isOptimizing: true, error: null });
    
    try {
      const response = await fetch('../../backend/r_route_optimizer.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'optimizeRoute',
          ...parameters
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        set({ routeResult: result.data });
      } else {
        set({ error: result.error || 'Errore nell\'ottimizzazione del percorso' });
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isOptimizing: false });
    }
  },
  
  saveRoute: async (routeName, routeDescription = '') => {
    const { selectedPos, routeResult } = get();
    
    if (!routeResult) {
      set({ error: 'Nessun percorso da salvare' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('../../backend/r_route_optimizer.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveRoute',
          routeName,
          routeDescription,
          selectedPos,
          routeResult
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        set({ error: result.error || 'Errore nel salvataggio del percorso' });
      }
      
      return result;
    } catch (error) {
      console.error('Error saving route:', error);
      set({ error: 'Errore nella comunicazione con il server' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  exportRouteData: () => {
    const { routeResult } = get();
    
    if (!routeResult) {
      set({ error: 'Nessun percorso da esportare' });
      return;
    }
    
    // Crea dati per CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Header
    csvContent += 'N°,POS,Indirizzo,Arrivo,Durata Visita,Partenza,Distanza Prossimo,Tempo Viaggio\n';
    
    // Righe
    routeResult.stops.forEach((stop, index) => {
      const nextLegDistance = index < routeResult.stops.length - 1 
        ? Math.round(stop.nextLegDistance) + ' km' 
        : '';
      
      const nextLegDuration = index < routeResult.stops.length - 1 
        ? Math.round(stop.nextLegDuration) + ' min' 
        : '';
      
      const row = [
        index + 1,
        stop.name,
        stop.address,
        stop.arrivalTime,
        stop.visitDuration + ' min',
        stop.departureTime,
        nextLegDistance,
        nextLegDuration
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Aggiungi statistiche
    csvContent += '\nRiepilogo\n';
    csvContent += `Totale punti,${routeResult.stops.length}\n`;
    csvContent += `Distanza totale,${Math.round(routeResult.totalDistanceKm)} km\n`;
    csvContent += `Tempo totale,${Math.round(routeResult.totalTimeMinutes)} min\n`;
    
    // Crea link per il download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `percorso_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
  },
  
  clearRoute: () => {
    set({
      selectedPos: [],
      routeResult: null,
      error: null
    });
  }
}));


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/ROL.sql ======



# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/DashboardPM/DashboardPMContainer.jsx ======
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button, 
  Grid, 
  Paper,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  TableChart as TableIcon,
  AccountTree as TreeIcon,
  SupervisorAccount as ManagerIcon
} from '@mui/icons-material';
import POSTable from './components/POSTable';
import POSTree from './components/POSTree';
import StatsPanel from './components/StatsPanel';
import { usePMStore } from './stores/pmStore';
import { fetchPMPOSList, fetchPMStats } from './api/pmApi';

const DashboardPMContainer = () => {
  const [viewMode, setViewMode] = useState(localStorage.getItem('preferredView') || 'table');
  
  const { 
    stats, 
    setStats, 
    posList, 
    setPosList,
    refreshData,
    userRole,
    setUserRole,
    isLoading
  } = usePMStore();

  // Funzione per il caricamento iniziale dei dati
  const loadInitialData = async () => {
    try {
      // Carica i dati in parallelo
      const [posResponse, statsResponse] = await Promise.all([
        fetchPMPOSList(),
        fetchPMStats()
      ]);
      
      if (posResponse.success) {
        setPosList(posResponse.data);
        // Memorizza il ruolo dell'utente
        if (posResponse.userRole) {
          setUserRole(posResponse.userRole);
        }
      }
      
      if (statsResponse.success) {
        setStats(statsResponse.data);
        // Memorizza il ruolo dell'utente se non è già stato impostato
        if (statsResponse.userRole && !userRole) {
          setUserRole(statsResponse.userRole);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Carica i dati all'avvio del componente
  useEffect(() => {
    loadInitialData();
    
    // Imposta un refresh periodico ogni 5 minuti
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    }, 5 * 60 * 1000);
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Gestione cambio vista
  const handleViewToggle = () => {
    const newView = viewMode === 'table' ? 'tree' : 'table';
    setViewMode(newView);
    localStorage.setItem('preferredView', newView);
  };

  // Deterimina il titolo della dashboard in base al ruolo
  const getDashboardTitle = () => {
    return userRole === 'manager' ? 'Dashboard Project Manager Supervisor' : 'Dashboard Project Manager';
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header con titolo e azioni */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">{getDashboardTitle()}</Typography>
          
          {/* Badge che mostra se l'utente è un manager */}
          {userRole === 'manager' && (
            <Chip 
              icon={<ManagerIcon />} 
              label="Modalità Supervisore" 
              color="primary" 
              size="small"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined"
            startIcon={viewMode === 'table' ? <TreeIcon /> : <TableIcon />}
            onClick={handleViewToggle}
          >
            {viewMode === 'table' ? 'Vista Albero' : 'Vista Tabella'}
          </Button>
          
          <Button 
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshData}
            disabled={isLoading}
          >
            Aggiorna
          </Button>
          
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={() => {/* implementare l'esportazione */}}
            disabled={isLoading || posList.length === 0}
          >
            Esporta
          </Button>
        </Box>
      </Box>

      {/* Pannello statistiche */}
      <StatsPanel stats={stats} isManager={userRole === 'manager'} />
      
      {/* Contenuto principale */}
      <Box sx={{ flex: 1, mt: 2, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {viewMode === 'table' ? (
              <POSTable data={posList} isManager={userRole === 'manager'} />
            ) : (
              <POSTree data={posList} isManager={userRole === 'manager'} />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default DashboardPMContainer;




# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/DashboardPM/stores/pmStore.js ======
import { create } from 'zustand';

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
      const response = await fetch('../../backend/b_tsis.php?action=getStatiAvanzamento');
      const result = await response.json();
      
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
        fetch('../../backend/r_tsis_pm.php?action=getPMPOSList').then(res => res.json()),
        fetch('../../backend/r_tsis_pm.php?action=getPMStats').then(res => res.json()),
        fetch('../../backend/b_tsis.php?action=getStatiAvanzamento').then(res => res.json())
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


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/DashboardPM/index.jsx ======
import React from 'react';
import { Box } from '@mui/material';
import DashboardPMContainer from './DashboardPMContainer';

/**
 * Componente di punto di ingresso per il modulo DashboardPM.
 */
const DashboardPMModule = () => {
  return (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden' 
      }}
    >
      <DashboardPMContainer />
    </Box>
  );
};

export default DashboardPMModule;




# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/DashboardPM/api/pmApi.js ======
