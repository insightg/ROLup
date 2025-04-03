import { useSnackbar } from 'notistack';

/**
 * Hook personalizzato per gestire le notifiche in tutta l'applicazione
 * @returns {Object} Metodi per mostrare diverse tipologie di notifiche
 */
const useNotification = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  /**
   * Mostra una notifica di successo
   * @param {string} message - Il messaggio da mostrare
   * @param {Object} options - Opzioni aggiuntive per la notifica
   */
  const showSuccess = (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'success',
      ...options,
    });
  };

  /**
   * Mostra una notifica di errore
   * @param {string} message - Il messaggio da mostrare
   * @param {Object} options - Opzioni aggiuntive per la notifica
   */
  const showError = (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'error',
      ...options,
    });
  };

  /**
   * Mostra una notifica di avviso
   * @param {string} message - Il messaggio da mostrare
   * @param {Object} options - Opzioni aggiuntive per la notifica
   */
  const showWarning = (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'warning',
      ...options,
    });
  };

  /**
   * Mostra una notifica informativa
   * @param {string} message - Il messaggio da mostrare
   * @param {Object} options - Opzioni aggiuntive per la notifica
   */
  const showInfo = (message, options = {}) => {
    enqueueSnackbar(message, {
      variant: 'info',
      ...options,
    });
  };

  /**
   * Mostra una notifica con opzioni personalizzate
   * @param {string} message - Il messaggio da mostrare
   * @param {string} severity - Il tipo di notifica ('success', 'error', 'warning', 'info')
   * @param {Object} options - Opzioni aggiuntive per la notifica
   */
  const showNotification = (message, severity = 'info', options = {}) => {
    enqueueSnackbar(message, {
      variant: severity,
      ...options,
    });
  };

  /**
   * Chiude una specifica notifica
   * @param {string} key - La chiave della notifica da chiudere
   */
  const dismissNotification = (key) => {
    closeSnackbar(key);
  };

  /**
   * Chiude tutte le notifiche
   */
  const dismissAll = () => {
    closeSnackbar();
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    dismissNotification,
    dismissAll,
  };
};

export default useNotification;
