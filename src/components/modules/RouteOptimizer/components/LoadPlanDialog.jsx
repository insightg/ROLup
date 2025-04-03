import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  CircularProgress,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  Today as DateIcon
} from '@mui/icons-material';
import { useRouteOptimizerStore } from '../stores/routeOptimizerStore';
import { deletePlan } from '../api/routeOptimizerApi';

const LoadPlanDialog = ({ open, onClose, plans = [], onLoad }) => {
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const { loadPlanFromServer, fetchSavedPlans } = useRouteOptimizerStore();
  
  const handleLoadPlan = async () => {
    if (!selectedPlanId) {
      setError('Seleziona un piano da caricare');
      return;
    }
    
    setLoading(true);
    
    try {
      const loadedPlan = await loadPlanFromServer(selectedPlanId);
      onLoad(loadedPlan);
      handleClose();
    } catch (err) {
      setError(err.message || 'Errore nel caricamento del piano');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeletePlan = async (planId) => {
    if (deleteConfirmId === planId) {
      try {
        await deletePlan(planId);
        await fetchSavedPlans();
        setDeleteConfirmId(null);
      } catch (err) {
        setError(err.message || 'Errore nell\'eliminazione del piano');
      }
    } else {
      setDeleteConfirmId(planId);
      // Reset del timer di conferma dopo 3 secondi
      setTimeout(() => {
        setDeleteConfirmId(null);
      }, 3000);
    }
  };
  
  const handleClose = () => {
    setSelectedPlanId(null);
    setSearchTerm('');
    setError('');
    onClose();
  };
  
  // Filtra i piani in base al termine di ricerca
  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Carica Piano di Visite</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            placeholder="Cerca piano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            margin="normal"
          />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : plans.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Nessun piano salvato. Crea e salva un nuovo piano per vederlo qui.
            </Typography>
          ) : filteredPlans.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Nessun piano corrisponde alla ricerca.
            </Typography>
          ) : (
            <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
              {filteredPlans.map((plan) => (
                <React.Fragment key={plan.id}>
                  <ListItem
                    button
                    selected={selectedPlanId === plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    sx={{ 
                      borderLeft: selectedPlanId === plan.id ? 
                        '3px solid' : '3px solid transparent', 
                      borderLeftColor: 'primary.main' 
                    }}
                  >
                    <ListItemText
                      primary={plan.name}
                      secondary={
                        <React.Fragment>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <DateIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                            <Typography variant="caption" component="span">
                              Creato il {new Date(plan.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          {plan.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                              noWrap
                            >
                              {plan.description}
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        color={deleteConfirmId === plan.id ? 'error' : 'default'} 
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
          
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          Annulla
        </Button>
        <Button 
          onClick={handleLoadPlan}
          variant="contained"
          disabled={!selectedPlanId || loading}
        >
          Carica
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadPlanDialog;