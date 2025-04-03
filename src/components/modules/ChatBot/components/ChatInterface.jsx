// src/components/modules/ChatBot/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  IconButton, 
  Typography, 
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import { 
  Send as SendIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import useChatBotStore from '../stores/chatBotStore';
import chatBotApi from '../api/chatBotApi';
import Message from './common/Message';
import TypingIndicator from './common/TypingIndicator';
import { useSnackbar } from 'notistack';

const ChatInterface = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const messageContainerRef = useRef(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [error, setError] = useState(null);
  
  // Accesso allo store
  const { 
    chatHistory, 
    addMessage, 
    isTyping, 
    setTyping, 
    currentProfileId, 
    profiles,
    getCurrentProfile,
    clearChatHistory
  } = useChatBotStore();
  
  const currentProfile = getCurrentProfile();
  
  // Scroll alla fine dei messaggi quando la chat history cambia
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);
  
  // Invia messaggio quando l'utente preme invio o clicca sul pulsante
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isTyping) return;
    
    // Aggiungi il messaggio dell'utente alla chat
    addMessage(messageInput, 'user');
    setMessageInput('');
    
    // Mostra l'indicatore di digitazione
    setTyping(true);
    
    try {
      setError(null);
      
      // Prepara i dati per la richiesta API
      const requestData = {
        message: messageInput,
        history: chatHistory.slice(-3),  // Ultimi 3 messaggi per contesto
        profileId: currentProfileId || 'default'
      };
      
      // Chiamata API
      const response = await chatBotApi.getBotResponse(requestData);
      
      if (response.error) {
        throw new Error(response.message || 'Errore nella risposta del bot');
      }
      
      // Aggiungi la risposta del bot alla chat
      addMessage(response.message, 'bot');
    } catch (error) {
      console.error('Error getting bot response:', error);
      setError('Si è verificato un errore nella comunicazione con il bot.');
      
      // Aggiungi un messaggio di errore alla chat
      addMessage('Mi dispiace, si è verificato un errore nella comunicazione.', 'bot');
    } finally {
      // Nascondi l'indicatore di digitazione
      setTyping(false);
    }
  };
  
  // Gestione tasto invio
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Gestione reset chat
  const handleResetChat = () => {
    clearChatHistory();
    
    // Invia un messaggio di benvenuto se c'è un profilo corrente
    if (currentProfile) {
      addMessage(currentProfile.welcome || 'Ciao! Come posso aiutarti?', 'bot');
    } else {
      addMessage('Ciao! Come posso aiutarti?', 'bot');
    }
  };
  
  // Se non c'è un profilo selezionato, mostra un messaggio informativo
  if (!currentProfile) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%', 
          p: 3 
        }}
      >
        <Typography variant="h5" gutterBottom>
          Nessun profilo attivo
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 2 }}>
          Seleziona un profilo dalla tab "PROFILI" per iniziare a chattare.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            // Naviga alla tab dei profili
            document.getElementById('tab-1').click();
          }}
        >
          Vai ai Profili
        </Button>
      </Box>
    );
  }
  
  // Se la chat history è vuota, aggiungi un messaggio di benvenuto
  useEffect(() => {
    if (currentProfile && chatHistory.length === 0) {
      addMessage(currentProfile.welcome || `Ciao! Sono ${currentProfile.name}. Come posso aiutarti?`, 'bot');
    }
  }, [currentProfile, chatHistory.length]);
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Header della chat */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 1
        }}
      >
        <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>
          <PersonIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div">
            {currentProfile?.name || 'Bot'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isTyping ? 'Sta scrivendo...' : 'Online'}
          </Typography>
        </Box>
        <Button 
          startIcon={<RefreshIcon />} 
          variant="outlined" 
          onClick={handleResetChat}
          size="small"
        >
          Nuova Chat
        </Button>
      </Paper>
      
      {/* Contenitore messaggi */}
      <Box 
        ref={messageContainerRef}
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          p: 2,
          bgcolor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Messaggi */}
        {chatHistory.map((msg, index) => (
          <Message 
            key={index}
            message={msg.message}
            type={msg.type}
            timestamp={msg.timestamp}
          />
        ))}
        
        {/* Indicatore di digitazione */}
        {isTyping && <TypingIndicator />}
        
        {/* Errore */}
        {error && (
          <Alert 
            severity="error"
            sx={{ mb: 2, maxWidth: '75%', alignSelf: 'center' }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
      </Box>
      
      {/* Input messaggio */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Scrivi un messaggio..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isTyping}
          variant="outlined"
          size="small"
        />
        <IconButton 
          color="primary" 
          onClick={handleSendMessage} 
          disabled={!messageInput.trim() || isTyping}
        >
          {isTyping ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Paper>
    </Box>
  );
};

export default ChatInterface;
