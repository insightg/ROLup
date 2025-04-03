import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  Flag as FlagIcon,
  AccessTime as TimeIcon,
  DirectionsCar as CarIcon,
  Navigation as NavigationIcon,
  Place as PlaceIcon,
  Today as DateIcon
} from '@mui/icons-material';

// Componente riga espandibile per i dettagli della singola visita
const VisitRow = ({ visit, index, dayNumber }) => {
  const [open, setOpen] = useState(false);
  
  // Formatta l'ora nel formato HH:MM
  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Formatta la data nel formato GG/MM/AAAA
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Colore per la priorità
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'normal':
        return 'primary';
      case 'low':
        return 'default';
      default:
        return 'primary';
    }
  };
  
  // Crea un chip per la priorità
  const getPriorityChip = (priority) => {
    const label = {
      high: 'Alta',
      normal: 'Normale',
      low: 'Bassa'
    }[priority] || 'Normale';
    
    return (
      <Chip 
        size="small" 
        icon={<FlagIcon />} 
        label={label} 
        color={getPriorityColor(priority)} 
        variant="outlined" 
      />
    );
  };

  return (
    <>
      <TableRow 
        sx={{ 
          '&:hover': { bgcolor: 'action.hover' },
          bgcolor: index % 2 === 0 ? 'inherit' : 'action.hover'
        }}
      >
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DateIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2">
              Giorno {dayNumber + 1} - {formatDate(visit.arrivalTime)}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PlaceIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Box>
              <Typography variant="body2">{visit.location.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {visit.location.sf_territory || ''}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell align="center">
          {formatTime(visit.arrivalTime)}
        </TableCell>
        <TableCell align="center">
          {formatTime(visit.departureTime)}
        </TableCell>
        <TableCell align="center">
          <Chip 
            size="small" 
            icon={<TimeIcon />} 
            label={`${visit.location.duration} min`} 
            color="primary" 
            variant="outlined" 
          />
        </TableCell>
        <TableCell>
          {getPriorityChip(visit.location.priority)}
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom component="div">
                Dettagli Visita
              </Typography>
              <Divider sx={{ mb: 1 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Indirizzo:</strong> {visit.location.address}
                </Typography>
                
                {visit.location.notes && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Note:</strong> {visit.location.notes}
                  </Typography>
                )}
              </Box>
              
              {visit.travelInfo && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Info Viaggio {index > 0 ? 'dalla posizione precedente' : 'dall\'inizio'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      size="small" 
                      icon={<CarIcon />} 
                      label={`${Math.round(visit.travelInfo.distance / 1000)} km`} 
                      color="info" 
                      variant="outlined" 
                    />
                    <Chip 
                      size="small" 
                      icon={<TimeIcon />} 
                      label={`${Math.round(visit.travelInfo.duration / 60)} min`} 
                      color="info" 
                      variant="outlined" 
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Componente principale tabella percorso
const RouteTable = ({ route }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  if (!route || !route.days || route.days.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Nessun percorso ottimizzato disponibile.
        </Typography>
      </Paper>
    );
  }
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Se abbiamo più giorni, mostriamo tabs
  const multipleDay = route.days.length > 1;
  
  return (
    <Box>
      {multipleDay && (
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          <Tab icon={<DateIcon />} label="Tutti i giorni" />
          {route.days.map((day, index) => (
            <Tab key={index} icon={<DateIcon />} label={`Giorno ${index + 1}`} />
          ))}
        </Tabs>
      )}
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="4%"></TableCell>
              <TableCell width="15%">Giorno</TableCell>
              <TableCell width="25%">Luogo</TableCell>
              <TableCell width="12%" align="center">Arrivo</TableCell>
              <TableCell width="12%" align="center">Partenza</TableCell>
              <TableCell width="12%" align="center">Durata</TableCell>
              <TableCell width="20%">Priorità</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeTab === 0 ? (
              // Mostra tutti i giorni
              route.days.flatMap((day, dayIndex) => 
                day.visits.map((visit, visitIndex) => (
                  <VisitRow 
                    key={`${dayIndex}-${visitIndex}`} 
                    visit={visit} 
                    index={visitIndex} 
                    dayNumber={dayIndex} 
                  />
                ))
              )
            ) : (
              // Mostra solo il giorno selezionato
              route.days[activeTab - 1].visits.map((visit, index) => (
                <VisitRow 
                  key={index} 
                  visit={visit} 
                  index={index} 
                  dayNumber={activeTab - 1} 
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RouteTable;