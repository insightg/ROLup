import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Box, 
  Typography, 
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Pending as PendingIcon,
  DoNotDisturb as BlockedIcon,
  CheckCircle as CompletedIcon,
  PlayArrow as InProgressIcon,
  DoNotTouch as StandbyIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import { fetchStatiAvanzamento } from '../api/pmApi';

const StatsPanel = ({ stats, isManager = false }) => {
  const [availableStates, setAvailableStates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Carica stati disponibili all'avvio
  useEffect(() => {
    const loadStatiAvanzamento = async () => {
      setIsLoading(true);
      try {
        const result = await fetchStatiAvanzamento();
        
        if (result.success) {
          // Filtra solo gli stati per gli ordini
          const orderStates = result.data.filter(stato => 
            stato.tipo === 'ordine' && stato.attivo
          );
          setAvailableStates(orderStates);
        }
      } catch (error) {
        console.error('Error fetching stati avanzamento:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStatiAvanzamento();
  }, []);
  
  // Ottiene l'icona per lo stato
  const getStateIcon = (statusCode) => {
    const stateConfig = availableStates.find(s => s.codice === statusCode);
    
    if (!stateConfig) {
      return <AssignmentIcon />;
    }
    
    const iconMapping = {
      'assignment': <AssignmentIcon />,
      'pending': <PendingIcon />,
      'check_circle': <CompletedIcon />,
      'play_arrow': <InProgressIcon />,
      'do_not_touch': <StandbyIcon />,
      'block': <BlockedIcon />
    };
    
    return iconMapping[stateConfig.icona] || <AssignmentIcon />;
  };
  
  // Ottiene il colore per lo stato
  const getStateColor = (statusCode) => {
    const stateConfig = availableStates.find(s => s.codice === statusCode);
    
    if (!stateConfig) {
      return 'primary';
    }
    
    const colorMap = {
      'blue': 'primary',
      'green': 'success',
      'red': 'error',
      'orange': 'warning',
      'cyan': 'info',
      'gray': 'default'
    };
    
    return colorMap[stateConfig.colore] || 'primary';
  };

  // Calcola le percentuali
  const totalOrders = stats?.total || 0;
  const completionRate = totalOrders > 0 
    ? ((stats?.completati || 0) / totalOrders * 100).toFixed(1) 
    : 0;
  const problematicRate = totalOrders > 0 
    ? (((stats?.standby || 0) + (stats?.non_lavorabili || 0)) / totalOrders * 100).toFixed(1) 
    : 0;

  // Mappa stati per statistiche
  const getStatCards = () => {
    if (!stats || isLoading || availableStates.length === 0) {
      return (
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        </Grid>
      );
    }
    
    // Prepara i dati per le card
    const statCards = [
      {
        title: 'Totali',
        value: stats.total || 0,
        icon: <AssignmentIcon color="primary" />,
        color: 'primary'
      }
    ];
    
    // Aggiungi card per ogni stato presente nei dati
    availableStates.forEach(state => {
      const stateCode = state.codice;
      const stateValue = stats[stateCode] || 0;
      
      if (stateCode !== 'totale') {
        statCards.push({
          title: state.descrizione,
          value: stateValue,
          icon: getStateIcon(stateCode),
          color: getStateColor(stateCode)
        });
      }
    });
    
    return statCards.map((card, index) => (
      <Grid item xs={4} sm={2} md={1} key={index}>
        <Paper elevation={1} sx={{ p: 1, height: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {React.cloneElement(card.icon, { 
              color: card.color, 
              sx: { fontSize: 20, mb: 0.5 } 
            })}
            <Typography variant="h6" fontSize={18} align="center">{card.value}</Typography>
            <Typography variant="caption" color="text.secondary" align="center">
              {card.title}
            </Typography>
          </Box>
        </Paper>
      </Grid>
    ));
  };

  return (
    <Box sx={{ mb: 1 }}>
      {/* Header stats in versione compatta */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium">Panoramica</Typography>
          
          {/* Badge che mostra se le statistiche sono globali */}
          {isManager && (
            <Tooltip title="Dati aggregati di tutti i PM">
              <Chip 
                icon={<InsightsIcon fontSize="small" />} 
                label="Statistiche Globali" 
                color="info" 
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            icon={<CompletedIcon fontSize="small" />} 
            label={`${completionRate}% completati`}
            color="success"
            size="small"
            variant="outlined"
          />
          
          <Chip 
            icon={<BlockedIcon fontSize="small" />} 
            label={`${problematicRate}% problematici`}
            color="warning"
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>
      
      {/* Stats cards in versione più compatta */}
      <Grid container spacing={1}>
        {getStatCards()}
      </Grid>
    </Box>
  );
};

export default StatsPanel;