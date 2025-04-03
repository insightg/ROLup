// src/components/modules/RouteOptimizer/components/SavePlanDialog.jsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { useRouteOptimizerStore } from '../stores/routeOptimizerStore';

const SavePlanDialog = ({ open, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { savePlanToServer } = useRouteOptimizerStore();
  
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Il nome del piano è obbligatorio');
      return;
    }
    
    setLoading(true);
    
    try {
      await savePlanToServer(name, description);
      onSave(name);
      handleClose();
    } catch (err) {
      setError(err.message || 'Errore nel salvataggio del piano');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };
  
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Salva Piano di Visite</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            label="Nome del Piano"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
            error={!!error}
            helperText={error}
            disabled={loading}
          />
          
          <TextField
            label="Descrizione (opzionale)"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            disabled={loading}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Salvando questo piano, potrai ricaricarlo in futuro per modificarlo o riutilizzarlo.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annulla
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Salvataggio...' : 'Salva'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SavePlanDialog;  // Assicurati che questa riga sia presente e corretta