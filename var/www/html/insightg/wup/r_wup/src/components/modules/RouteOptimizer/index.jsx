import React from 'react';
import { Box } from '@mui/material';
import RouteOptimizerContainer from './RouteOptimizerContainer';

/**
 * Punto di ingresso per il modulo RouteOptimizer.
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


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/components/NewRouteDialog.jsx ======
