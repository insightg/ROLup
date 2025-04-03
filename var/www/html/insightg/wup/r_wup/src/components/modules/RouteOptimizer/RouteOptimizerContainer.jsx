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
  Chip,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  Route as RouteIcon,
  Add as AddIcon
} from '@mui/icons-material';

import POSSelectionTable from './components/POSSelectionTable';
import RouteMapView from './components/RouteMapView';
import RouteScheduleTable from './components/RouteScheduleTable';
import OptimizationPanel from './components/OptimizationPanel';
import NewRouteDialog from './components/NewRouteDialog';
import { useRouteStore } from './store/routeStore';

const RouteOptimizerContainer = () => {
  const [viewMode, setViewMode] = useState('table');
  const [newRouteDialogOpen, setNewRouteDialogOpen] = useState(false);
  
  const { 
    isLoading,
    error,
    availablePos,
    selectedPos,
    routeResult,
    loadAvailablePOS,
    clearRoute,
    optimizeRoute,
    exportRouteData,
    addPosToSelection
  } = useRouteStore();

  // Carica i dati all'avvio del componente
  useEffect(() => {
    loadAvailablePOS();
    
    // Controlla se ci sono POS preselezionati
    const preselectedPosData = sessionStorage.getItem('selected_pos_for_optimization');
    if (preselectedPosData) {
      try {
        const posData = JSON.parse(preselectedPosData);
        
        // Aggiungi i POS preselezionati al nostro stato
        posData.forEach(pos => {
          // Aggiungi con durata visita di default (30 minuti)
          addPosToSelection({...pos, visitDuration: 30, priority: 'normal'});
        });
        
        // Pulisci la sessionStorage
        sessionStorage.removeItem('selected_pos_for_optimization');
      } catch (error) {
        console.error('Error parsing preselected POS data:', error);
      }
    }
  }, []);

  const handleViewChange = (event, newValue) => {
    setViewMode(newValue);
  };

  const handleNewRouteClick = () => {
    clearRoute();
    setNewRouteDialogOpen(true);
  };

  const handleOptimizeRoute = (parameters) => {
    if (selectedPos.length === 0) {
      return;
    }
    
    optimizeRoute(parameters);
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
        <Typography variant="h5">Ottimizzazione Percorsi Visite</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleNewRouteClick}
          >
            Nuovo Percorso
          </Button>
          
          <Button 
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAvailablePOS}
            disabled={isLoading}
          >
            Aggiorna
          </Button>
          
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={exportRouteData}
            disabled={isLoading || !routeResult}
          >
            Esporta
          </Button>
        </Box>
      </Box>

      {/* Mostra errori */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Banner per POS preselezionati */}
      {selectedPos.length > 0 && !routeResult && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {selectedPos.length} punti vendita importati dalla Dashboard PM. Configura i parametri e clicca su "Ottimizza Percorso".
        </Alert>
      )}
      
      {/* Tabs per cambiare vista */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={viewMode} 
          onChange={handleViewChange}
          aria-label="route optimizer views"
        >
          <Tab value="table" label="Selezione POS" />
          <Tab 
            value="map" 
            label="Mappa Percorso" 
            disabled={!routeResult} 
          />
          <Tab 
            value="schedule" 
            label="Piano Visite" 
            disabled={!routeResult}
          />
        </Tabs>
      </Box>
      
      {/* Contenuto principale in base alla tab selezionata */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {viewMode === 'table' && (
              <Grid container spacing={2} sx={{ height: '100%' }}>
                <Grid item xs={8} sx={{ height: '100%' }}>
                  <POSSelectionTable 
                    availablePos={availablePos} 
                    selectedPos={selectedPos}
                  />
                </Grid>
                <Grid item xs={4} sx={{ height: '100%' }}>
                  <OptimizationPanel 
                    onOptimize={handleOptimizeRoute} 
                    selectedPosCount={selectedPos.length}
                    hasResults={!!routeResult}
                  />
                </Grid>
              </Grid>
            )}
            
            {viewMode === 'map' && routeResult && (
              <RouteMapView routeData={routeResult} />
            )}
            
            {viewMode === 'schedule' && routeResult && (
              <RouteScheduleTable routeData={routeResult} />
            )}
          </>
        )}
      </Box>

      {/* Dialog per nuovo percorso */}
      <NewRouteDialog 
        open={newRouteDialogOpen} 
        onClose={() => setNewRouteDialogOpen(false)} 
      />
    </Box>
  );
};

export default RouteOptimizerContainer;


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/index.jsx ======
