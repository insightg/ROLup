// In RouteOptimizerDialog.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import { Route as RouteIcon } from '@mui/icons-material';

const RouteOptimizerDialog = ({ open, onClose, selectedRows, selectedPosData }) => {
  const [optimizationType, setOptimizationType] = useState('new');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  // Funzione per avviare l'ottimizzazione
  const handleStartOptimization = () => {
    try {
      console.log('Avvio ottimizzazione con dati:', selectedPosData);
      
      // Memorizza i POS selezionati in sessionStorage
      sessionStorage.setItem('selected_pos_for_optimization', JSON.stringify(selectedPosData));
      
      // Chiude il dialog
      onClose();
      
      // Mostra un feedback
      setSnackbarOpen(true);
      
      // Usa il metodo esistente nell'applicazione per cambiare modulo
      // Crea un evento personalizzato che AppContainer può ascoltare
      setTimeout(() => {
        // Avvia il cambio modulo solo dopo aver chiuso il dialog
        document.dispatchEvent(new CustomEvent('changeModule', { 
          detail: { moduleName: 'route-optimizer' } 
        }));
      }, 100);
    } catch (error) {
      console.error('Errore durante l\'avvio dell\'ottimizzazione:', error);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RouteIcon color="primary" />
            <Typography variant="h6">Ottimizzazione Percorsi Visite</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Stai per ottimizzare un percorso per visitare {selectedRows.length} punti vendita.
          </Alert>
          
          <Typography variant="subtitle1" gutterBottom>
            Punti vendita selezionati:
          </Typography>
          
          <List sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
            {selectedPosData.map((pos) => (
              <React.Fragment key={pos.id}>
                <ListItem>
                  <ListItemText
                    primary={pos.nome_account}
                    secondary={`${pos.indirizzo_spedizioni || ''}, ${pos.citt_spedizioni || ''}`}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Tipo di ottimizzazione</InputLabel>
            <Select
              value={optimizationType}
              onChange={(e) => setOptimizationType(e.target.value)}
              label="Tipo di ottimizzazione"
            >
              <MenuItem value="new">Crea nuovo percorso</MenuItem>
              <MenuItem value="add">Aggiungi a percorso esistente</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annulla</Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<RouteIcon />}
            onClick={handleStartOptimization}
          >
            Inizia Ottimizzazione
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Caricamento modulo di ottimizzazione percorsi..."
      />
    </>
  );
};

export default RouteOptimizerDialog;