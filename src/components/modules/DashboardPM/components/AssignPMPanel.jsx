import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Drawer,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  Paper,
  Alert,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { fetchAvailablePMs, assignPMToOrder } from '../api/pmApi';

const AssignPMPanel = ({ posId, onClose, onUpdate, pmList = [] }) => {
  const [selectedPM, setSelectedPM] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Se pmList non è fornito, carica la lista dei PM
  useEffect(() => {
    const loadPMList = async () => {
      if (pmList.length === 0) {
        try {
          setIsLoading(true);
          const result = await fetchAvailablePMs();
          
          if (result.success) {
            setPMList(result.data);
          }
        } catch (error) {
          console.error('Error fetching PM list:', error);
          setError('Errore nel caricamento della lista PM');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadPMList();
  }, [pmList]);

  // Gestisce l'assegnazione del PM
  const handleAssign = async () => {
    if (!selectedPM) {
      setError('Seleziona un PM');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await assignPMToOrder(posId, selectedPM, note);
      
      if (result.success) {
        setSuccess(true);
        
        // Delay before closing to show success message
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Errore nell\'assegnazione del PM');
      }
    } catch (error) {
      console.error('Error assigning PM:', error);
      setError('Errore nella comunicazione con il server');
    } finally {
      setIsLoading(false);
    }
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
        <Typography variant="h6">Assegna Project Manager</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        {isLoading && !success ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            PM assegnato con successo
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Seleziona Project Manager
              </Typography>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Project Manager</InputLabel>
                <Select
                  value={selectedPM}
                  onChange={(e) => setSelectedPM(e.target.value)}
                  label="Project Manager"
                >
                  <MenuItem value="">
                    <em>Seleziona PM</em>
                  </MenuItem>
                  
                  {pmList.map((pm) => (
                    <MenuItem key={pm.id} value={pm.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {pm.full_name ? pm.full_name.charAt(0).toUpperCase() : 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {pm.full_name || pm.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pm.current_assignments}/{pm.max_pos_assegnabili} ordini
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
            
            <TextField
              label="Note (opzionale)"
              multiline
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              margin="normal"
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleAssign}
                disabled={isLoading || !selectedPM}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Assegna PM'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default AssignPMPanel;