import React from 'react';
import { Box } from '@mui/material';
import RouteOptimizerContainer from './RouteOptimizerContainer';

/**
 * Componente di punto di ingresso per il modulo di ottimizzazione percorsi.
 */
const RouteOptimizerModule = () => {
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
      <RouteOptimizerContainer />
    </Box>
  );
};

export default RouteOptimizerModule;