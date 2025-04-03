import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  Place as PlaceIcon,
  Today as DateIcon
} from '@mui/icons-material';

const OptimizationResults = ({ stats }) => {
  if (!stats) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Nessuna statistica disponibile
        </Typography>
      </Box>
    );
  }

  // Formatta la durata in ore e minuti (arrotondata al minuto)
  const formatDuration = (minutes) => {
    // Arrotondiamo al minuto intero
    minutes = Math.round(minutes);
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours} h`;
    } else {
      return `${hours} h ${mins} min`;
    }
  };

  return (
    <Box>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Typography variant="h6">
            Riepilogo Ottimizzazione
          </Typography>
        </Grid>
        
        <Grid item xs={6} md={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DateIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Durata</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {stats.totalDays} {stats.totalDays === 1 ? 'giorno' : 'giorni'}
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6} md={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PlaceIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Punti</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {stats.totalLocations} POS
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6} md={2}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Tempo Visite</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {formatDuration(stats.totalVisitDuration)}
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6} md={2}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CarIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Tempo Viaggio</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {formatDuration(stats.totalTravelDuration)}
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CarIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Distanza</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {Math.round(stats.totalDistance / 100) / 10} km
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 1.5 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography variant="subtitle2">Priorità:</Typography>
        <Chip 
          size="small" 
          label={`${stats.highPriorityCount || 0} alta priorità`} 
          color="error" 
          variant="outlined" 
        />
        <Chip 
          size="small" 
          label={`${stats.normalPriorityCount || 0} normale`} 
          color="primary" 
          variant="outlined" 
        />
        <Chip 
          size="small" 
          label={`${stats.lowPriorityCount || 0} bassa priorità`} 
          color="default" 
          variant="outlined" 
        />
      </Box>
    </Box>
  );
};

export default OptimizationResults;