// src/components/modules/ChatBot/components/SettingsPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Key as KeyIcon,
  Security as SecurityIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import useChatBotStore from '../stores/chatBotStore';
import chatBotApi from '../api/chatBotApi';

/**
 * Componente per la gestione delle impostazioni
 */
const SettingsPanel = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // Accesso allo store
  const { settings, updateSettings } = useChatBotStore();
  
  // Stati locali
  const [formData, setFormData] = useState({
    claudeApiKey: '',
    ultramsgToken: '',
    debugMode: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Inizializza il form con i dati dallo store
  useEffect(() => {
    setFormData({
      claudeApiKey: settings.claudeApiKey || '',
      ultramsgToken: settings.ultramsgToken || '',
      debugMode: settings.debugMode || false
    });
  }, [settings]);
  
  // Gestisce i cambiamenti nei campi del form
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Salva le impostazioni
  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Salva su localStorage per compatibilità con il codice originale
      localStorage.setItem('botSettings', JSON.stringify(formData));
      
      // Aggiorna lo store
      updateSettings(formData);
      
      // Mostra notifica di successo
      enqueueSnackbar('Impostazioni salvate con successo', { variant: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Si è verificato un errore durante il salvataggio delle impostazioni: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3, width: '100%', overflow: 'auto' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Impostazioni
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <KeyIcon sx={{ mr: 1 }} /> Chiavi API
              </Typography>
              
              <TextField
                name="claudeApiKey"
                label="Claude API Key"
                value={formData.claudeApiKey}
                onChange={handleChange}
                fullWidth
                type="password"
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                  )
                }}
              />
              
              <TextField
                name="ultramsgToken"
                label="UltraMsg Token"
                value={formData.ultramsgToken}
                onChange={handleChange}
                fullWidth
                type="password"
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                  )
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CodeIcon sx={{ mr: 1 }} /> Opzioni di Sviluppo
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    name="debugMode"
                    checked={formData.debugMode}
                    onChange={handleChange}
                  />
                }
                label="Modalità Debug"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Quando attivata, la modalità debug mostrerà informazioni aggiuntive nei messaggi del bot e nei log della console.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? 'Salvataggio...' : 'Salva Impostazioni'}
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 4 }} />
      
      <Typography variant="h6" gutterBottom>
        Informazioni sul Sistema
      </Typography>
      
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Versione
            </Typography>
            <Typography variant="body1">
              ChatBot Manager 1.0.0
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Framework
            </Typography>
            <Typography variant="body1">
              React 18.2.0
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Modello LLM
            </Typography>
            <Typography variant="body1">
              Claude 3 Opus
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPanel;
