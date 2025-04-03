import React from 'react';
import { Box } from '@mui/material';

// Funzione per caricare dinamicamente il componente POSOrdersDashboard
const POSDashboardModule = () => {
  const [Component, setComponent] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Importa il componente principale dinamicamente
    import('./PosOrdersDashboard')
      .then(module => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch(err => {
        console.error("Errore nel caricamento del POSOrdersDashboard:", err);
        setError(err);
        setLoading(false);
      });
  }, []);
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%' 
      }}>
        <div>Caricamento del modulo in corso...</div>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        <h2>Errore nel caricamento del modulo POSDashboard</h2>
        <p>Si è verificato un errore durante il caricamento del modulo.</p>
        <pre>{String(error)}</pre>
      </Box>
    );
  }
  
  // Se il componente è stato caricato, renderizzalo all'interno di un contenitore
  // che limita le sue dimensioni allo spazio disponibile
  return (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%', 
        overflow: 'hidden',
        position: 'relative', 
        display: 'flex',
        flexDirection: 'column'
      }}
      className="pos-dashboard-wrapper"
    >
      {/* Contenitore che adatta il POSOrdersDashboard allo spazio disponibile */}
      <Box 
        sx={{ 
          flexGrow: 1,
          overflow: 'hidden',
          position: 'relative',
          '& > *': {
            // Override importante per forzare il componente a usare lo spazio disponibile
            position: 'relative !important',
            height: '100% !important',
            width: '100% !important',
            maxHeight: 'none !important',
            overflow: 'hidden !important'
          }
        }}
        className="pos-content-container"
      >
        {Component && <Component />}
      </Box>
    </Box>
  );
};

export default POSDashboardModule;
