import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Drawer,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import { updatePOSStatus, fetchStatiAvanzamento } from '../api/pmApi';

const StatusPanel = ({ posId, onClose, onUpdate, availableStates = [] }) => {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [statesList, setStatesList] = useState([]);
  
  // Carica gli stati disponibili se non forniti
  useEffect(() => {
    const loadStatiAvanzamento = async () => {
      if (availableStates.length === 0) {
        try {
          setIsLoading(true);
          const result = await fetchStatiAvanzamento();
          
          if (result.success) {
            // Filtra solo gli stati per gli ordini
            const orderStates = result.data.filter(stato => 
              stato.tipo === 'ordine' && stato.attivo
            );
            setStatesList(orderStates);
          }
        } catch (error) {
          console.error('Error fetching stati avanzamento:', error);
          setError('Errore nel caricamento degli stati');
        } finally {
          setIsLoading(false);
        }
      } else {
        setStatesList(availableStates);
      }
    };
    
    loadStatiAvanzamento();
  }, [availableStates]);

  // Gestione cambio stato
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await updatePOSStatus(posId, status, reason);
      
      if (response.success) {
        setSuccess(true);
        
        // Delay before closing to show success message
        setTimeout(() => {
          if (onUpdate) {
            onUpdate();
          }
          onClose();
        }, 1500);
      } else {
        setError(response.error || 'Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating POS status:', error);
      setError('Errore nella comunicazione con il server');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verifica se lo stato richiede un motivo
  const statusRequiresReason = () => {
    const selectedState = statesList.find(s => s.codice === status);
    return selectedState?.codice === 'standby' || selectedState?.codice === 'non_lavorabile';
  };

  return (
    <Drawer
      anchor="right"
      open={true}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Modifica Stato</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Box sx={{ p: 2 }}>
        {isLoading && !success ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : success ? (
          <Alert severity="success">
            Stato aggiornato con successo
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Nuovo Stato</InputLabel>
              <Select
                value={status}
                label="Nuovo Stato"
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLoading || statesList.length === 0}
              >
                <MenuItem value="">
                  <em>Seleziona stato</em>
                </MenuItem>
                {statesList.map((stato) => (
                  <MenuItem key={stato.codice} value={stato.codice}>
                    {stato.descrizione}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Motivo del cambio"
              multiline
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              margin="normal"
              disabled={isLoading}
              helperText={
                statusRequiresReason()
                  ? 'Specificare il motivo è obbligatorio per questo stato'
                  : undefined
              }
              required={statusRequiresReason()}
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={onClose}
                disabled={isLoading}
              >
                Annulla
              </Button>
              <Button 
                type="submit" 
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isLoading || !status || (statusRequiresReason() && !reason)}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Salva'}
              </Button>
            </Box>
          </form>
        )}
      </Box>
    </Drawer>
  );
};

export default StatusPanel;