import React, { createContext, useContext, useState, useEffect } from 'react';
import { getConfigValue, loadDomainConfig } from '../../utils/apiConfig';

// Creazione del Context
const ConfigContext = createContext(null);

/**
 * Provider per accedere alla configurazione in tutta l'applicazione
 * @param {Object} props - Proprietà del componente
 * @param {React.ReactNode} props.children - Componenti figli
 */
export const ConfigProvider = ({ children }) => {
  const [domain, setDomain] = useState('default');

  // Caricamento iniziale della configurazione
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await loadDomainConfig();
        // Estrai il dominio dall'URL
        const host = window.location.hostname;
        const parts = host.split('.');
        
        if (parts.length >= 3) {
          setDomain(parts[0]);
        }
      } catch (error) {
        console.error('Errore nel caricamento della configurazione:', error);
      }
    };
    
    loadConfig();
  }, []);

  /**
   * Ottiene un valore dalla configurazione
   * @param {string} section - Sezione della configurazione
   * @param {string} key - Chiave della configurazione
   * @param {*} defaultValue - Valore predefinito se la configurazione non esiste
   * @returns {*} Il valore della configurazione o il valore predefinito
   */
  const getValue = (section, key, defaultValue = null) => {
    return getConfigValue(section, key, defaultValue);
  };

  /**
   * Ottiene una sezione intera della configurazione
   * @param {string} section - Sezione della configurazione
   * @param {Object} defaultValue - Valore predefinito se la sezione non esiste
   * @returns {Object} La sezione della configurazione o il valore predefinito
   */
  const getSection = (section, defaultValue = {}) => {
    const config = loadDomainConfig();
    return config[section] || defaultValue;
  };

  // Valore del contesto
  const value = {
    domain,
    getValue,
    getSection
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

/**
 * Hook personalizzato per utilizzare la configurazione
 * @returns {Object} Funzioni per accedere alla configurazione
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  
  if (!context) {
    throw new Error('useConfig deve essere utilizzato all\'interno di un ConfigProvider');
  }
  
  return context;
};

export default ConfigContext;