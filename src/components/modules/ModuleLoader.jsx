// Modifiche da apportare al file src/components/modules/ModuleLoader.jsx

import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

// Componente di fallback durante il caricamento
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%' 
    }}
  >
    <CircularProgress size={60} thickness={4} />
    <Typography sx={{ mt: 2 }} variant="h6">Caricamento modulo...</Typography>
  </Box>
);

// Componente di errore
const ErrorComponent = ({ message }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      p: 3 
    }}
  >
    <Typography variant="h5" color="error" gutterBottom>
      Errore durante il caricamento del modulo
    </Typography>
    <Typography>{message || 'Si è verificato un errore imprevisto.'}</Typography>
  </Box>
);

const ModuleLoader = ({ moduleName }) => {
  // Mappa dei moduli disponibili con lazy loading
  const modules = {
    'pos-dashboard': lazy(() => import('../modules/POSDashboard/PosOrdersDashboard')),
    'anagrafica': lazy(() => import('../modules/Anagrafica')),
    'chatbot': lazy(() => import('../modules/ChatBot')), // Nuovo modulo ChatBot
    'dashboard-pm': lazy(() => import('../modules/DashboardPM')), // Nuovo modulo
	  'task-templates': lazy(() => import('../modules/TaskTemplates')), // Nuovo modulo TaskTemplates   )
    'route-optimizer': lazy(() => import('../modules/RouteOptimizer')),
    'pick-manager': lazy(() => import('../modules/PickManager')) // Nuovo modulo PickManager
    // Aggiungi altri moduli qui
  };

  // Ottieni il componente modulo richiesto
  const ModuleComponent = modules[moduleName];

  // Se il modulo non esiste
  if (!ModuleComponent) {
    return <ErrorComponent message={`Modulo "${moduleName}" non trovato.`} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Box sx={{ height: '100%', overflow: 'hidden' }}>
        <ModuleComponent />
      </Box>
    </Suspense>
  );
};

export default ModuleLoader;
