// src/components/modules/ChatBot/ChatBotContainer.jsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Tabs, Tab, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';

// API e Store
import chatBotApi from './api/chatBotApi';
import useChatBotStore from './stores/chatBotStore';

// Componenti
import ChatInterface from './components/ChatInterface';
import ProfileManager from './components/ProfileManager';
import SettingsPanel from './components/SettingsPanel';

const ChatBotContainer = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Accesso allo store
  const { 
    profiles, 
    setProfiles, 
    currentProfileId, 
    setCurrentProfileId 
  } = useChatBotStore();
  
  // Carica i profili all'avvio
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        const data = await chatBotApi.getProfiles();
        setProfiles(data);
        
        // Se c'è almeno un profilo, imposta il primo come attivo
        if (data.length > 0 && !currentProfileId) {
          setCurrentProfileId(data[0].id);
        }
      } catch (error) {
        enqueueSnackbar('Errore nel caricamento dei profili', { variant: 'error' });
        console.error('Error loading profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfiles();
  }, []);
  
  // Gestione del cambio tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Rendering condizionale in base al caricamento
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Tabs di navigazione */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="chat bot tabs"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="CHAT" id="tab-0" />
          <Tab label="PROFILI" id="tab-1" />
          <Tab label="IMPOSTAZIONI" id="tab-2" />
        </Tabs>
      </Box>
      
      {/* Contenuto delle tab */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          overflow: 'hidden',
          bgcolor: 'background.default'
        }}
      >
        {/* Tab Chat */}
        <Box
          role="tabpanel"
          hidden={activeTab !== 0}
          id="tabpanel-0"
          aria-labelledby="tab-0"
          sx={{ 
            width: '100%', 
            height: '100%', 
            display: activeTab !== 0 ? 'none' : 'flex' 
          }}
        >
          <ChatInterface />
        </Box>
        
        {/* Tab Profili */}
        <Box
          role="tabpanel"
          hidden={activeTab !== 1}
          id="tabpanel-1"
          aria-labelledby="tab-1"
          sx={{ 
            width: '100%', 
            height: '100%',
            display: activeTab !== 1 ? 'none' : 'flex',
            overflow: 'auto'
          }}
        >
          <ProfileManager />
        </Box>
        
        {/* Tab Impostazioni */}
        <Box
          role="tabpanel"
          hidden={activeTab !== 2}
          id="tabpanel-2"
          aria-labelledby="tab-2"
          sx={{ 
            width: '100%', 
            height: '100%',
            display: activeTab !== 2 ? 'none' : 'flex',
            overflow: 'auto'
          }}
        >
          <SettingsPanel />
        </Box>
      </Box>
    </Box>
  );
};

export default ChatBotContainer;
