import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Alert,
  CircularProgress,
  FormHelperText,
  InputAdornment
} from '@mui/material';
import { 
  AccessTime as TimeIcon,
  Route as RouteIcon,
  DirectionsCar as CarIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { parseISO, format, addHours } from 'date-fns';
import itLocale from 'date-fns/locale/it';
import { useRouteStore } from '../store/routeStore';

const OptimizationPanel = () => {
  const { 
    selectedPos,
    isOptimizing,
    optimizeRoute, 
    routeResult
  } = useRouteStore();

  const now = new Date();
  const startTime = addHours(new Date(now.setMinutes(0, 0, 0)), 1);
  
  const [params, setParams] = useState({
    startingPoint: 'current',
    customStartAddress: '',
    startTime: startTime,
    maxTravelTime: 120,
    optimizationMethod: 'distance',
    considerTraffic: true,
    returnToStart: true,
    maxVisits: null,
    algorithm: 'auto'
  });

  const handleParamChange = (event) => {
    const { name, value, checked, type } = event.target;
    setParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStartTimeChange = (newTime) => {
    setParams(prev => ({
      ...prev,
      startTime: newTime
    }));
  };

  const handleOptimize = () => {
    optimizeRoute({
      ...params,
      startTime: format(params.startTime, "yyyy-MM-dd'T'HH:mm:ss"),
      selectedPosIds: selectedPos.map(pos => ({ 
        id: pos.id, 
        duration: pos.visitDuration,
        priority: pos.priority
      }))
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={itLocale}>
      <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Parametri Ottimizzazione
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Alert severity={selectedPos.length > 0 ? "info" : "warning"}>
            {selectedPos.length > 0 
              ? `${selectedPos.length} punti vendita selezionati`
              : "Seleziona almeno un punto vendita"}
          </Alert>
        </Box>
        
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Punto di partenza</InputLabel>
            <Select
              name="startingPoint"
              value={params.startingPoint}
              onChange={handleParamChange}
              label="Punto di partenza"
            >
              <MenuItem value="current">Posizione attuale</MenuItem>
              <MenuItem value="custom">Indirizzo personalizzato</MenuItem>
              <MenuItem value="first">Primo POS della lista</MenuItem>
            </Select>
          </FormControl>
          
          {params.startingPoint === 'custom' && (
            <TextField
              fullWidth
              label="Indirizzo di partenza"
              name="customStartAddress"
              value={params.customStartAddress}
              onChange={handleParamChange}
              margin="normal"
            />
          )}
          
          <Box sx={{ mt: 2 }}>
            <InputLabel shrink>Orario di partenza</InputLabel>
            <TimePicker
              value={params.startTime}
              onChange={handleStartTimeChange}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />
          </Box>
          
          <TextField
            fullWidth
            label="Tempo massimo di viaggio"
            name="maxTravelTime"
            type="number"
            value={params.maxTravelTime}
            onChange={handleParamChange}
            margin="normal"
            InputProps={{
              endAdornment: <InputAdornment position="end">minuti</InputAdornment>,
              inputProps: { min: 15, max: 480 }
            }}
          />
          
          <Divider sx={{ my: 2 }} />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Metodo di ottimizzazione</InputLabel>
            <Select
              name="optimizationMethod"
              value={params.optimizationMethod}
              onChange={handleParamChange}
              label="Metodo di ottimizzazione"
            >
              <MenuItem value="distance">Distanza minima</MenuItem>
              <MenuItem value="time">Tempo minimo</MenuItem>
              <MenuItem value="priority">Priorità visite</MenuItem>
              <MenuItem value="balanced">Bilanciato</MenuItem>
            </Select>
            <FormHelperText>
              {params.optimizationMethod === 'distance' && "Ottimizza per percorrere meno chilometri"}
              {params.optimizationMethod === 'time' && "Ottimizza per ridurre i tempi di viaggio"}
              {params.optimizationMethod === 'priority' && "Visita prima i POS ad alta priorità"}
              {params.optimizationMethod === 'balanced' && "Bilancia distanza, tempo e priorità"}
            </FormHelperText>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Algoritmo</InputLabel>
            <Select
              name="algorithm"
              value={params.algorithm}
              onChange={handleParamChange}
              label="Algoritmo"
            >
              <MenuItem value="auto">Automatico</MenuItem>
              <MenuItem value="nearest_neighbor">Nearest Neighbor</MenuItem>
              <MenuItem value="clarke_wright">Clarke-Wright</MenuItem>
              <MenuItem value="ai">Intelligenza Artificiale</MenuItem>
            </Select>
            <FormHelperText>
              {params.algorithm === 'auto' && "Selezione automatica in base alla complessità"}
              {params.algorithm === 'nearest_neighbor' && "Veloce ma meno preciso"}
              {params.algorithm === 'clarke_wright' && "Bilanciato per problemi fino a 20 punti"}
              {params.algorithm === 'ai' && "Ottimizzazione avanzata per problemi complessi"}
            </FormHelperText>
          </FormControl>
          
          <TextField
            fullWidth
            label="Numero massimo di visite"
            name="maxVisits"
            type="number"
            value={params.maxVisits || ''}
            onChange={handleParamChange}
            margin="normal"
            helperText="Lascia vuoto per includere tutti i POS selezionati"
            InputProps={{
              inputProps: { min: 1 }
            }}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={params.considerTraffic}
                onChange={handleParamChange}
                name="considerTraffic"
              />
            }
            label="Considera traffico"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={params.returnToStart}
                onChange={handleParamChange}
                name="returnToStart"
              />
            }
            label="Ritorna al punto di partenza"
          />
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleOptimize}
            disabled={selectedPos.length === 0 || isOptimizing}
            startIcon={isOptimizing ? <CircularProgress size={20} /> : <RouteIcon />}
          >
            {isOptimizing ? 'Ottimizzazione in corso...' : 'Ottimizza Percorso'}
          </Button>
        </Box>
        
        {routeResult && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Statistiche percorso
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                <TimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Tempo totale: {Math.round(routeResult.totalTimeMinutes)} min
              </Typography>
              <Typography variant="body2">
                <CarIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Distanza: {Math.round(routeResult.totalDistanceKm)} km
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
};

export default OptimizationPanel;


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/components/POSSelectionTable.jsx ======
