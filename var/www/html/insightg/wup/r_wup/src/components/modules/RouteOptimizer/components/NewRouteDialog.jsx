import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import { useRouteStore } from '../store/routeStore';

const NewRouteDialog = ({ open, onClose }) => {
  const { loadPosFromTerritory, loadSavedRoute, clearRoute } = useRouteStore();
  
  const [routeSource, setRouteSource] = useState('territory');
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [selectedSavedRoute, setSelectedSavedRoute] = useState('');
  const [availableTerritories, setAvailableTerritories] = useState([
    'Nord-Ovest', 'Nord-Est', 'Centro', 'Sud', 'Isole'
  ]);
  const [availableSavedRoutes, setAvailableSavedRoutes] = useState([
    { id: '1', name: 'Rotta Milano Nord' },
    { id: '2', name: 'Rotta Roma Centro' },
    { id: '3', name: 'Toscana settimanale' }
  ]);

  const handleRouteSourceChange = (event) => {
    setRouteSource(event.target.value);
  };

  const handleTerritoryChange = (event) => {
    setSelectedTerritory(event.target.value);
  };

  const handleSavedRouteChange = (event) => {
    setSelectedSavedRoute(event.target.value);
  };

  const handleCreate = () => {
    clearRoute();
    
    if (routeSource === 'territory' && selectedTerritory) {
      loadPosFromTerritory(selectedTerritory);
    } else if (routeSource === 'saved' && selectedSavedRoute) {
      loadSavedRoute(selectedSavedRoute);
    }
    
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crea Nuovo Percorso</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Seleziona come vuoi iniziare il nuovo percorso:
        </DialogContentText>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo di percorso</InputLabel>
          <Select
            value={routeSource}
            onChange={handleRouteSourceChange}
            label="Tipo di percorso"
          >
            <MenuItem value="territory">Seleziona da territorio</MenuItem>
            <MenuItem value="saved">Carica percorso salvato</MenuItem>
            <MenuItem value="empty">Inizia da zero</MenuItem>
          </Select>
        </FormControl>
        
        {routeSource === 'territory' && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Territorio</InputLabel>
            <Select
              value={selectedTerritory}
              onChange={handleTerritoryChange}
              label="Territorio"
            >
              <MenuItem value="">
                <em>Seleziona territorio</em>
              </MenuItem>
              {availableTerritories.map(territory => (
                <MenuItem key={territory} value={territory}>
                  {territory}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        
        {routeSource === 'saved' && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Percorso salvato</InputLabel>
            <Select
              value={selectedSavedRoute}
              onChange={handleSavedRouteChange}
              label="Percorso salvato"
            >
              <MenuItem value="">
                <em>Seleziona percorso</em>
              </MenuItem>
              {availableSavedRoutes.map(route => (
                <MenuItem key={route.id} value={route.id}>
                  {route.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button 
          onClick={handleCreate} 
          variant="contained"
          disabled={
            (routeSource === 'territory' && !selectedTerritory) ||
            (routeSource === 'saved' && !selectedSavedRoute)
          }
        >
          Crea
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewRouteDialog;


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/components/OptimizationPanel.jsx ======
