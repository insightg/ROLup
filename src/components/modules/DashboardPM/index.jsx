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

