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

