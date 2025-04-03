import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowRightAlt as ArrowIcon,
  LocalOffer as TagIcon,
  NavigateBefore as BeforeIcon,
  NavigateNext as NextIcon,
  AccessTime as TimeIcon,
  DirectionsCar as CarIcon
} from '@mui/icons-material';

const RouteScheduleTable = ({ routeData }) => {
  if (!routeData || !routeData.stops) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Nessun percorso disponibile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Piano Visite ({routeData.stops.length} punti)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            <TimeIcon fontSize="small" sx={{ mr: 0.5 }} />
            Tempo totale: {Math.round(routeData.totalTimeMinutes)} min
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            <CarIcon fontSize="small" sx={{ mr: 0.5 }} />
            Distanza: {Math.round(routeData.totalDistanceKm)} km
          </Typography>
        </Box>
      </Box>
    
      <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
        <Table stickyHeader aria-label="route schedule table">
          <TableHead>
            <TableRow>
              <TableCell width="5%">#</TableCell>
              <TableCell width="25%">Punto vendita</TableCell>
              <TableCell width="25%">Indirizzo</TableCell>
              <TableCell width="10%" align="center">Arrivo</TableCell>
              <TableCell width="10%" align="center">Visita</TableCell>
              <TableCell width="10%" align="center">Partenza</TableCell>
              <TableCell width="15%" align="center">Tragitto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routeData.stops.map((stop, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <Chip 
                    label={index + 1} 
                    color={index === 0 ? "success" : "primary"} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {stop.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stop.territory}
                    </Typography>
                    {stop.priority === 'high' && (
                      <Chip 
                        icon={<TagIcon />} 
                        label="Priorità alta" 
                        color="error" 
                        size="small" 
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{stop.address}</TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {stop.arrivalTime}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={`${stop.visitDuration} min`} 
                    color="default" 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {stop.departureTime}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {index < routeData.stops.length - 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowIcon />
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="body2">
                          {Math.round(stop.nextLegDuration)} min
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(stop.nextLegDistance)} km
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RouteScheduleTable;


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/components/RouteMapView.jsx ======
