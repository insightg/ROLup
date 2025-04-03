// src/components/modules/ChatBot/index.jsx
import React from 'react';
import { Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import ChatBotContainer from './ChatBotContainer';

/**
 * Componente di punto di ingresso per il modulo ChatBot.
 * Configura SnackbarProvider per le notifiche e renderizza il container principale.
 */
const ChatBotModule = () => {
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
      <SnackbarProvider 
        maxSnack={3}
        autoHideDuration={3000}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: 'right' 
        }}
      >
        <ChatBotContainer />
      </SnackbarProvider>
    </Box>
  );
};

export default ChatBotModule;
