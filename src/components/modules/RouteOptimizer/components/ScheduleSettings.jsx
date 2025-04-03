import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  InputAdornment,
  Tooltip,
  IconButton,
  Divider,
  Paper,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  DirectionsCar as CarIcon,
  DirectionsWalk as WalkIcon,
  DirectionsBike as BikeIcon,
  DirectionsTransit as TransitIcon,
  Restaurant as LunchIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  Home as HomeIcon,
  MyLocation as LocationIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  CompareArrows as OptimizeIcon,
  Calculate as CalculateIcon,
  Loop as LoopIcon
} from '@mui/icons-material';
import { useRouteOptimizerStore } from '../stores/routeOptimizerStore';
import { geocodeAddress } from '../api/routeOptimizerApi';

const ScheduleSettings = () => {
  const { scheduleSettings, updateScheduleSettings, locations } = useRouteOptimizerStore();
  const [customStartAddress, setCustomStartAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  
  // Tutti i pannelli aperti di default
  const [expandedPanel, setExpandedPanel] = useState(['startLocation', 'workHours', 'planning', 'travelOptions', 'advancedOptions']);

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(prev => {
      if (isExpanded) {
        return [...prev, panel];
      } else {
        return prev.filter(p => p !== panel);
      }
    });
  };

  const handleChange = (field, value) => {
    const updatedSettings = { ...scheduleSettings };
    updatedSettings[field] = value;
    
    // Controlla le dipendenze tra i campi
    if (field === 'workStartTime' && new Date(`2000-01-01T${value}`) >= new Date(`2000-01-01T${updatedSettings.workEndTime}`)) {
      updatedSettings.workEndTime = addMinutes(value, 480); // +8 ore
    }
    
    if (field === 'lunchBreakStart') {
      // Assicurati che la pausa pranzo sia all'interno dell'orario di lavoro
      const lunchStart = new Date(`2000-01-01T${value}`);
      const workStart = new Date(`2000-01-01T${updatedSettings.workStartTime}`);
      const workEnd = new Date(`2000-01-01T${updatedSettings.workEndTime}`);
      
      if (lunchStart < workStart || lunchStart > workEnd) {
        // Imposta la pausa pranzo a mezzogiorno o metà della giornata lavorativa
        const midday = new Date(`2000-01-01T12:00`);
        if (midday >= workStart && midday <= workEnd) {
          updatedSettings.lunchBreakStart = '12:00';
        } else {
          const workDuration = (workEnd - workStart) / (1000 * 60 * 60);
          const middlePoint = new Date(workStart.getTime() + workDuration * 1000 * 60 * 30);
          updatedSettings.lunchBreakStart = middlePoint.toTimeString().slice(0, 5);
        }
      }
    }
    
    updateScheduleSettings(updatedSettings);
  };

  // Funzione di utilità per aggiungere minuti a un orario formato "HH:MM"
  const addMinutes = (timeString, minutes) => {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0);
    return date.toTimeString().slice(0, 5);
  };

  const handleStartLocationTypeChange = (e) => {
    const type = e.target.value;
    handleChange('startLocationType', type);
    
    // Resetta l'indirizzo personalizzato se si seleziona "firstLocation"
    if (type === 'firstLocation') {
      handleChange('startLocation', null);
      setCustomStartAddress('');
    }
  };

  const handleSetCustomStartLocation = async () => {
    if (!customStartAddress.trim()) {
      setAddressError('Inserisci un indirizzo di partenza');
      return;
    }

    setGeocoding(true);
    setAddressError('');

    try {
      const result = await geocodeAddress(customStartAddress);
      
      if (result && result.lat && result.lng) {
        handleChange('startLocation', {
          address: customStartAddress,
          lat: result.lat,
          lng: result.lng
        });
        setAddressError('');
      } else {
        setAddressError('Impossibile geocodificare questo indirizzo');
      }
    } catch (error) {
      setAddressError('Errore nella geocodifica: ' + error.message);
    } finally {
      setGeocoding(false);
    }
  };

  const getTravelModeIcon = (mode) => {
    switch (mode) {
      case 'driving':
        return <CarIcon />;
      case 'walking':
        return <WalkIcon />;
      case 'bicycling':
        return <BikeIcon />;
      case 'transit':
        return <TransitIcon />;
      default:
        return <CarIcon />;
    }
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      startLocationType: 'firstLocation',
      startLocation: null,
      returnToStart: false,
      workStartTime: '08:00',
      workEndTime: '18:00',
      lunchBreakStart: '13:00',
      lunchBreakDuration: 60,
      maxDays: 7,
      travelMode: 'driving',
      considerTraffic: true,
      avoidTolls: false,
      avoidHighways: false,
      useHubForDailyStart: false,
      optimizationMethod: 'global',
    };
    
    updateScheduleSettings(defaultSettings);
    setCustomStartAddress('');
    setAddressError('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Parametri Pianificazione
        </Typography>
        
        <Button 
          size="small" 
          onClick={resetToDefaults}
          variant="outlined"
        >
          Ripristina Predefiniti
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Sezioni in accordion per migliorare la navigabilità */}
      <Accordion 
        expanded={expandedPanel.includes('startLocation')} 
        onChange={handlePanelChange('startLocation')}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <HomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Punto di Partenza
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tipo di partenza</InputLabel>
            <Select
              value={scheduleSettings.startLocationType || 'firstLocation'}
              onChange={handleStartLocationTypeChange}
              label="Tipo di partenza"
              size="small"
            >
              <MenuItem value="firstLocation">Usa primo POS come partenza</MenuItem>
              <MenuItem value="custom">Indirizzo personalizzato</MenuItem>
            </Select>
          </FormControl>
          
          {scheduleSettings.startLocationType === 'custom' && (
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Indirizzo di partenza"
                fullWidth
                value={customStartAddress}
                onChange={(e) => setCustomStartAddress(e.target.value)}
                error={!!addressError}
                helperText={addressError}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HomeIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        onClick={handleSetCustomStartLocation}
                        disabled={geocoding || !customStartAddress.trim()}
                        size="small"
                      >
                        <LocationIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1 }}
              />
              
              {scheduleSettings.startLocation && (
                <Paper variant="outlined" sx={{ p: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" display="block">
                    Indirizzo impostato come punto di partenza:
                  </Typography>
                  <Typography variant="body2">
                    {scheduleSettings.startLocation.address}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
          
          <FormControlLabel
            control={
              <Checkbox
                checked={scheduleSettings.returnToStart || false}
                onChange={(e) => handleChange('returnToStart', e.target.checked)}
                size="small"
              />
            }
            label="Ritorna al punto di partenza come ultima tappa"
          />

          {/* Nuovo controllo per l'utilizzo dell'HUB */}
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={scheduleSettings.useHubForDailyStart || false}
                  onChange={(e) => handleChange('useHubForDailyStart', e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>Usa punto di partenza come HUB per ogni giorno</Typography>
                  <Tooltip title="Se selezionato, ogni giorno inizierà dal punto di partenza specificato (HUB). Altrimenti, i giorni successivi inizieranno dall'ultimo punto visitato del giorno precedente.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion 
        expanded={expandedPanel.includes('workHours')} 
        onChange={handlePanelChange('workHours')}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <TimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Orari di Lavoro e Pause
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Orario Giornaliero
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Orario Inizio"
                type="time"
                value={scheduleSettings.workStartTime}
                onChange={(e) => handleChange('workStartTime', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                size="small"
                inputProps={{
                  step: 300, // 5 min
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Orario Fine"
                type="time"
                value={scheduleSettings.workEndTime}
                onChange={(e) => handleChange('workEndTime', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                size="small"
                inputProps={{
                  step: 300, // 5 min
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                Pausa Pranzo
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Orario Inizio"
                type="time"
                value={scheduleSettings.lunchBreakStart}
                onChange={(e) => handleChange('lunchBreakStart', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LunchIcon />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                size="small"
                inputProps={{
                  step: 300, // 5 min
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Durata (minuti)"
                type="number"
                value={scheduleSettings.lunchBreakDuration}
                onChange={(e) => handleChange('lunchBreakDuration', parseInt(e.target.value) || 60)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                size="small"
                inputProps={{
                  min: 0,
                  max: 120,
                  step: 5
                }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion 
        expanded={expandedPanel.includes('planning')} 
        onChange={handlePanelChange('planning')}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Pianificazione
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Massimi Giorni"
                type="number"
                value={scheduleSettings.maxDays}
                onChange={(e) => handleChange('maxDays', parseInt(e.target.value) || 1)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                size="small"
                inputProps={{
                  min: 1,
                  max: 14
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Modalità Viaggio</InputLabel>
                <Select
                  value={scheduleSettings.travelMode}
                  onChange={(e) => handleChange('travelMode', e.target.value)}
                  label="Modalità Viaggio"
                  startAdornment={
                    <InputAdornment position="start">
                      {getTravelModeIcon(scheduleSettings.travelMode)}
                    </InputAdornment>
                  }
                >
                  <MenuItem value="driving">Auto</MenuItem>
                  <MenuItem value="walking">A piedi</MenuItem>
                  <MenuItem value="bicycling">Bicicletta</MenuItem>
                  <MenuItem value="transit">Trasporto pubblico</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion 
        expanded={expandedPanel.includes('travelOptions')} 
        onChange={handlePanelChange('travelOptions')}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <CarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Opzioni di Viaggio
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={scheduleSettings.considerTraffic}
                    onChange={(e) => handleChange('considerTraffic', e.target.checked)}
                    size="small"
                  />
                }
                label="Considera traffico"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={scheduleSettings.avoidTolls}
                    onChange={(e) => handleChange('avoidTolls', e.target.checked)}
                    size="small"
                  />
                }
                label="Evita pedaggi"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={scheduleSettings.avoidHighways}
                    onChange={(e) => handleChange('avoidHighways', e.target.checked)}
                    size="small"
                  />
                }
                label="Evita autostrade"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Nuova sezione per impostazioni avanzate (metodo di ottimizzazione) */}
      <Accordion 
        expanded={expandedPanel.includes('advancedOptions')} 
        onChange={handlePanelChange('advancedOptions')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Opzioni Avanzate
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Metodo di Ottimizzazione
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Metodo di Ottimizzazione</InputLabel>
                <Select
                  value={scheduleSettings.optimizationMethod || 'global'}
                  onChange={(e) => handleChange('optimizationMethod', e.target.value)}
                  label="Metodo di Ottimizzazione"
                  startAdornment={
                    <InputAdornment position="start">
                      <OptimizeIcon />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="global">Ottimizzazione Globale</MenuItem>
                  <MenuItem value="daily">Ottimizzazione Giornaliera</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                <InfoIcon fontSize="small" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />
                L'ottimizzazione globale considera tutti i punti insieme prima di dividerli in giorni,
                mentre l'ottimizzazione giornaliera ottimizza ogni giorno separatamente.
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ScheduleSettings;