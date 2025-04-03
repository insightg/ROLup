// src/components/modules/UserManagement/index.jsx
import React from 'react';
import { Box } from '@mui/material';
import UserManagementContainer from './UserManagementContainer';

/**
 * Componente di punto di ingresso per il modulo UserManagement.
 */
const UserManagementModule = () => {
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
      <UserManagementContainer />
    </Box>
  );
};

export default UserManagementModule;