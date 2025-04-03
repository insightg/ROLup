import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button, 
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import {
  Save as SaveIcon,
  Folder as LoadIcon,
  Navigation as NavigationIcon,
  CalendarToday as CalendarIcon,
  ViewDay as DayIcon
} from '@mui/icons-material';

import POSTableWithSelection from './components/POSTableWithSelection';
import RouteMap from './components/RouteMap';
import ScheduleSettings from './components/ScheduleSettings';
import OptimizationResults from './components/OptimizationResults';
import SavePlanDialog from './components/SavePlanDialog';
import LoadPlanDialog from './components/LoadPlanDialog';
import TimelineView from './components/TimelineView';

import { useRouteOptimizerStore } from './stores/routeOptimizerStore';

const RouteOptimizerContainer = () => {
  const [activeMainTab, setActiveMainTab] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [selectedDay, setSelectedDay] = useState(0); // 0 = visione completa, 1+ = giorni specifici

  const { 
    locations, 
    optimizedRoute,
    isOptimizing,
    optimizationStats,
    error,
    fetchPOS,
    optimizeRoute,
    clearError,
    savedPlans,
    fetchSavedPlans
  } = useRouteOptimizerStore();

  // Reimposta il giorno selezionato quando cambia il piano
  useEffect(() => {
    if (optimizedRoute && optimizedRoute.days && optimizedRoute.days.length > 0) {
      setSelectedDay(0); // Seleziona la vista completa quando cambia il piano
    }
  }, [optimizedRoute?.days]);

  useEffect(() => {
    // Carica i POS per autosuggest
    fetchPOS();
    // Carica piani salvati
    fetchSavedPlans();
  }, []);

  const handleSave = () => {
    setSaveDialogOpen(true);
  };

  const handleLoad = () => {
    setLoadDialogOpen(true);
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({...notification, open: false});
  };

  const handleOptimize = () => {
    optimizeRoute()
      .then(() => {
        showNotification('Percorso ottimizzato con successo!');
        setActiveMainTab(1); // Passa alla tab dei risultati
        setSelectedDay(0); // Seleziona la vista completa per default
      })
      .catch((err) => {
        showNotification(err.message || 'Errore nell\'ottimizzazione del percorso', 'error');
      });
  };

  // Gestisce il cambio di giorno selezionato
  const handleDayChange = (event, newValue) => {
    console.log("Changing selected day to:", newValue);
    setSelectedDay(newValue);
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
        <Typography variant="h5">Ottimizzatore Percorsi Visite POS</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6">
      </Typography>
      <Button 
        variant="contained"
        color="primary"
        disabled={isOptimizing || locations.length < 2}
        onClick={handleOptimize}
        startIcon={isOptimizing ? <CircularProgress size={20} /> : null}
      >
        {isOptimizing ? 'Ottimizzazione in corso...' : 'Ottimizza Percorso'}
      </Button>
    </Box>
          <Button 
            variant="outlined"
            startIcon={<LoadIcon />}
            onClick={handleLoad}
          >
            Carica Piano
          </Button>
          
          <Button 
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!optimizedRoute?.days?.length}
          >
            Salva Piano
          </Button>
          
          {optimizedRoute?.days?.length && (
            <Button
              variant="contained"
              onClick={() => setActiveMainTab(activeMainTab === 0 ? 1 : 0)}
              startIcon={<NavigationIcon />}
            >
              {activeMainTab === 0 ? 'Vedi Risultati' : 'Torna all\'Input'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Contenuto principale */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeMainTab === 0 ? (
          // Tab Input
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                {/* Left column - Settings */}
                <Box sx={{ width: '30%', minWidth: 300 }}>
                  <ScheduleSettings />
                </Box>
                
                {/* Right column - POS Tables */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <POSTableWithSelection />
                </Box>
              </Box>
            </Paper>
          </Box>
        ) : (
          // Tab Risultati
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Riepilogo ottimizzazione in alto a tutta larghezza */}
            <Paper sx={{ p: 2 }}>
              <OptimizationResults stats={optimizationStats} />
            </Paper>
            
            {/* Verifica che il piano abbia giorni */}
            {optimizedRoute && optimizedRoute.days && optimizedRoute.days.length > 0 ? (
              <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Tab per i giorni */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs 
                    value={selectedDay}
                    onChange={handleDayChange}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab 
                      key="all-days"
                      icon={<CalendarIcon />}
                      label="Programma Completo" 
                      value={0}
                    />

                    {optimizedRoute.days.map((day, index) => (
                      <Tab 
                        key={`day-tab-${index}`}
                        icon={<DayIcon />}
                        label={`Giorno ${index + 1} - ${new Date(day.date).toLocaleDateString()}`} 
                        value={index + 1}
                      />
                    ))}
                  </Tabs>
                </Box>
                
                {/* Contenuto: Programma Completo (tab 0) */}
                <Box 
                  key="all-days-content"
                  sx={{ 
                    flex: 1,
                    p: 1,
                    display: selectedDay === 0 ? 'flex' : 'none',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'auto'
                  }}
                >
                  {/* Mappa e dettagli in container scrollabile */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Paper sx={{ minHeight: '500px', p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Mappa Globale - Programma Completo
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ height: 'calc(100% - 56px)' }}>
                        <RouteMap 
                          key="complete-route-map"
                          route={optimizedRoute}
                          selectedDay={0} // 0 indica tutti i giorni
                          showConnections={true} // Mostra le connessioni tra i giorni
                        />
                      </Box>
                    </Paper>
                  
                    {/* Timeline completa */}
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" gutterBottom>
                        Pianificazione Globale - {optimizedRoute.days.length} Giorni
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <TimelineView 
                          key="complete-timeline"
                          route={optimizedRoute}
                          selectedDay={0} // 0 indica tutti i giorni
                          showDayConnections={true} // Mostra le connessioni tra i giorni
                        />
                      </Box>
                    </Paper>
                  </Box>
                </Box>
                
                {/* Contenuto dei giorni singoli */}
                {optimizedRoute.days.map((day, index) => (
                  <Box 
                    key={`day-content-${index + 1}`}
                    sx={{ 
                      flex: 1,
                      p: 1,
                      display: selectedDay === index + 1 ? 'flex' : 'none',
                      flexDirection: 'column',
                      height: '100%',
                      overflow: 'auto'
                    }}
                  >
                    {/* Mappa e dettagli in container scrollabile */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Paper sx={{ minHeight: '500px', p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Mappa delle Visite - Giorno {index + 1}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ height: 'calc(100% - 56px)' }}>
                          <RouteMap 
                            key={`map-day-${index + 1}`}
                            route={{
                              ...optimizedRoute,
                              days: [day] // Passa solo il giorno corrente
                            }}
                            selectedDay={1} // Sempre 1 perché passiamo solo un giorno
                            singleDayMode={true} // Indica che stiamo lavorando in modalità giorno singolo
                          />
                        </Box>
                      </Paper>
                    
                      {/* Timeline del giorno */}
                      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>
                          Dettaglio Visite - Giorno {index + 1}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                          <TimelineView 
                            key={`timeline-day-${index + 1}`}
                            route={{
                              ...optimizedRoute,
                              days: [day] // Passa solo il giorno corrente
                            }}
                            selectedDay={1} // Sempre 1 perché passiamo solo un giorno
                            singleDayMode={true} // Indica che stiamo lavorando in modalità giorno singolo
                          />
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                ))}
              </Paper>
            ) : (
              <Paper sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Typography color="text.secondary">
                  Nessun piano disponibile. Ottimizza un percorso per visualizzare i risultati.
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      <SavePlanDialog 
        open={saveDialogOpen} 
        onClose={() => setSaveDialogOpen(false)} 
        onSave={(name) => {
          showNotification(`Piano "${name}" salvato con successo`);
          setSaveDialogOpen(false);
        }}
      />
      
      <LoadPlanDialog 
        open={loadDialogOpen} 
        onClose={() => setLoadDialogOpen(false)}
        plans={savedPlans}
        onLoad={(plan) => {
          showNotification(`Piano "${plan.name}" caricato con successo`);
          setLoadDialogOpen(false);
          setActiveMainTab(1); // Passa alla tab dei risultati
          setSelectedDay(0); // Seleziona la vista completa dopo il caricamento
        }}
      />

      {/* Notifiche */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
      
      {/* Error snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={clearError} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RouteOptimizerContainer;
