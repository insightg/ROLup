// src/components/modules/PickManager/index.jsx

import React from 'react';
import { Box } from '@mui/material';
import PickManagerContainer from './PickManagerContainer';

/**
 * Entry point component for the PickManager module.
 */
const PickManagerModule = () => {
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
      <PickManagerContainer />
    </Box>
  );
};

export default PickManagerModule;