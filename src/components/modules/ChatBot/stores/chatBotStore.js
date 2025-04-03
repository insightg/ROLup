// src/components/modules/ChatBot/stores/chatBotStore.js
import { create } from 'zustand';

const useChatBotStore = create((set, get) => ({
  // Stato dei profili
  profiles: [],
  currentProfileId: null,
  
  // Stato della chat
  chatHistory: [],
  isTyping: false,
  
  // Stato per il knowledge base
  knowledgeBases: [],
  
  // Impostazioni
  settings: {
    debugMode: false,
    claudeApiKey: '',
    ultramsgToken: ''
  },
  
  // Statistiche
  stats: {
    totalMessages: 0,
    activeUsers: 0
  },
  
  // Azioni per i profili
  setProfiles: (profiles) => set({ profiles }),
  setCurrentProfileId: (id) => set({ currentProfileId: id }),
  
  // Metodo per ottenere il profilo corrente
  getCurrentProfile: () => {
    const { profiles, currentProfileId } = get();
    return profiles.find(profile => profile.id === currentProfileId) || null;
  },
  
  // Azioni per la chat
  addMessage: (message, type) => {
    const newMessage = {
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    set(state => ({
      chatHistory: [...state.chatHistory, newMessage],
      stats: {
        ...state.stats,
        totalMessages: state.stats.totalMessages + 1
      }
    }));
    
    return newMessage;
  },
  
  clearChatHistory: () => set({ chatHistory: [] }),
  
  setTyping: (isTyping) => set({ isTyping }),
  
  // Azioni per knowledge base
  setKnowledgeBases: (knowledgeBases) => set({ knowledgeBases }),
  
  addKnowledgeBase: (knowledgeBase) => set(state => ({ 
    knowledgeBases: [...state.knowledgeBases, knowledgeBase] 
  })),
  
  updateKnowledgeBase: (id, updatedKnowledgeBase) => set(state => ({
    knowledgeBases: state.knowledgeBases.map(kb => 
      kb.id === id ? { ...kb, ...updatedKnowledgeBase } : kb
    )
  })),
  
  removeKnowledgeBase: (id) => set(state => ({
    knowledgeBases: state.knowledgeBases.filter(kb => kb.id !== id)
  })),
  
  // Azioni per impostazioni
  updateSettings: (newSettings) => set(state => ({
    settings: { ...state.settings, ...newSettings }
  })),
  
  // Azioni per i profili
  addProfile: (profile) => set(state => ({ 
    profiles: [...state.profiles, profile] 
  })),
  
  updateProfile: (id, updatedProfile) => set(state => ({
    profiles: state.profiles.map(profile => 
      profile.id === id ? { ...profile, ...updatedProfile } : profile
    )
  })),
  
  deleteProfile: (id) => set(state => ({
    profiles: state.profiles.filter(profile => profile.id !== id),
    currentProfileId: state.currentProfileId === id ? null : state.currentProfileId
  })),
  
  // Azione per aggiornare le statistiche
  updateStats: (newStats) => set(state => ({
    stats: { ...state.stats, ...newStats }
  })),
}));

export default useChatBotStore;
