// src/components/modules/ChatBot/hooks/useChatSession.js
import { useState, useEffect, useCallback } from 'react';
import useChatBotStore from '../stores/chatBotStore';
import chatBotApi from '../api/chatBotApi';

/**
 * Custom hook per gestire una sessione di chat
 * @returns {Object} Funzioni e stati per gestire la chat
 */
const useChatSession = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Accesso allo store
  const { 
    chatHistory, 
    addMessage, 
    isTyping, 
    setTyping, 
    currentProfileId, 
    getCurrentProfile, 
    clearChatHistory 
  } = useChatBotStore();
  
  // Ottieni il profilo corrente
  const currentProfile = getCurrentProfile();
  
  // Invia un messaggio e ottieni la risposta dal bot
  const sendMessage = useCallback(async (message) => {
    if (!message.trim() || isTyping) return null;
    
    // Aggiungi il messaggio dell'utente alla chat
    const userMessage = addMessage(message, 'user');
    
    // Mostra l'indicatore di digitazione
    setTyping(true);
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepara i dati per la richiesta API
      const requestData = {
        message,
        history: chatHistory.slice(-3),  // Ultimi 3 messaggi per contesto
        profileId: currentProfileId || 'default'
      };
      
      // Chiamata API
      const response = await chatBotApi.getBotResponse(requestData);
      
      if (response.error) {
        throw new Error(response.message || 'Errore nella risposta del bot');
      }
      
      // Aggiungi la risposta del bot alla chat
      const botMessage = addMessage(response.message, 'bot');
      
      return { userMessage, botMessage };
    } catch (error) {
      console.error('Error getting bot response:', error);
      setError(error.message || 'Si è verificato un errore nella comunicazione con il bot');
      
      // Aggiungi un messaggio di errore alla chat
      addMessage('Mi dispiace, si è verificato un errore nella comunicazione.', 'bot');
      
      return null;
    } finally {
      // Nascondi l'indicatore di digitazione
      setTyping(false);
      setIsLoading(false);
    }
  }, [addMessage, chatHistory, currentProfileId, isTyping, setTyping]);
  
  // Inizia una nuova chat
  const startNewChat = useCallback(() => {
    clearChatHistory();
    
    // Invia un messaggio di benvenuto se c'è un profilo corrente
    if (currentProfile) {
      addMessage(currentProfile.welcome || `Ciao! Sono ${currentProfile.name}. Come posso aiutarti?`, 'bot');
    } else {
      addMessage('Ciao! Come posso aiutarti?', 'bot');
    }
  }, [addMessage, clearChatHistory, currentProfile]);
  
  // Inizializza la chat quando cambia il profilo corrente
  useEffect(() => {
    if (currentProfile && chatHistory.length === 0) {
      startNewChat();
    }
  }, [currentProfile, chatHistory.length, startNewChat]);
  
  return {
    chatHistory,
    isTyping,
    isLoading,
    error,
    currentProfile,
    sendMessage,
    startNewChat,
    clearError: () => setError(null)
  };
};

export default useChatSession;
