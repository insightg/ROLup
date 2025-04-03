import React from 'react';
import {
  Box,
  Typography,
  Chip,
  useTheme,
  Divider,
  Paper
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  DirectionsCar as CarIcon,
  Place as PlaceIcon,
  Home as HomeIcon,
  LocalCafe as CoffeeIcon,
  ArrowBack as ReturnIcon,
  ArrowForward as ForwardIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

// New component for consistent visit markers
const VisitMarker = ({ dayNumber, visitIndex, visit }) => {
  // Determine if it's a special point (start or return)
  const isStartPoint = visit.location.is_start_point === true;
  const isEndPoint = visit.travelInfo && visit.travelInfo.isReturn === true;
  
  // Calculate marker index
  const marker = isStartPoint ? 'P' : 
                 isEndPoint ? 'A' : 
                 visitIndex;
  
  // Determine color (matching map colors)
  const dayColors = [
    "#1976d2", "#2e7d32", "#c62828", "#7b1fa2", "#f57c00", 
    "#0097a7", "#d81b60", "#00695c", "#e65100", "#283593",
    "#4a148c", "#827717"  
  ];
  
  const color = isStartPoint ? '#4CAF50' : 
                isEndPoint ? '#F44336' : 
                dayColors[(dayNumber - 1) % dayColors.length];
                
  return (
    <Box 
      sx={{ 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: color,
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
        marginRight: 1
      }}
    >
      {marker}
    </Box>
  );
};

const TimelineView = ({ route, selectedDay, singleDayMode = false, showDayConnections = false }) => {
  const theme = useTheme();
  
  if (!route || !route.days || route.days.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Nessun piano temporale disponibile.
        </Typography>
      </Box>
    );
  }
  
  // Determina quali giorni mostrare
  const daysToShow = selectedDay === 0 || !singleDayMode
    ? route.days  // Mostra tutti i giorni
    : [route.days[selectedDay - 1]];  // Mostra solo il giorno selezionato
  
  // Colori per i diversi giorni
  const dayColors = [
    "#1976d2", // Blu
    "#2e7d32", // Verde
    "#c62828", // Rosso
    "#7b1fa2", // Viola
    "#f57c00", // Arancione
    "#0097a7", // Ciano
    "#d81b60", // Rosa
    "#00695c", // Verde acqua
    "#e65100", // Arancione scuro
    "#283593", // Blu scuro
    "#4a148c", // Viola scuro
    "#827717"  // Olivastro
  ];
  
  // Formatta orario nel formato HH:MM
  const formatTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Formatta la data nel formato GG/MM/AAAA
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Formatta la durata in minuti o ore
  const formatDuration = (seconds) => {
    if (!seconds) return "N/D";
    
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0 
      ? `${hours} h ${remainingMinutes} min`
      : `${hours} h`;
  };
  
  // Formatta la distanza in km
  const formatDistance = (meters) => {
    if (!meters) return "N/D";
    return `${(meters / 1000).toFixed(1)} km`;
  };
  
  // Calcola distanza e tempo di viaggio tra due giorni
  const calculateDayConnection = (day1, day2) => {
    if (!day1 || !day2 || 
        !day1.visits || !day2.visits || 
        day1.visits.length === 0 || day2.visits.length === 0) {
      return null;
    }
    
    // Trova l'ultima visita del giorno 1 (escludendo la pausa pranzo)
    let lastVisit = null;
    for (let i = day1.visits.length - 1; i >= 0; i--) {
      if (!day1.visits[i].location.is_lunch_break) {
        lastVisit = day1.visits[i];
        break;
      }
    }
    
    // Trova la prima visita del giorno 2 (escludendo la pausa pranzo)
    let firstVisit = null;
    for (let i = 0; i < day2.visits.length; i++) {
      if (!day2.visits[i].location.is_lunch_break) {
        firstVisit = day2.visits[i];
        break;
      }
    }
    
    if (!lastVisit || !firstVisit) {
      return null;
    }
    
    // Calcolo della distanza approssimativa (formula di Haversine)
    const R = 6371; // raggio terrestre in km
    const lat1 = parseFloat(lastVisit.location.lat);
    const lon1 = parseFloat(lastVisit.location.lng);
    const lat2 = parseFloat(firstVisit.location.lat);
    const lon2 = parseFloat(firstVisit.location.lng);
    
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return null;
    }
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distanza in km
    
    // Tempo di viaggio stimato (50 km/h -> 0.8 km/min)
    const estimatedTime = distance / 0.8; // minuti
    
    return {
      from: lastVisit,
      to: firstVisit,
      distance: distance * 1000, // converti in metri per compatibilità
      duration: estimatedTime * 60, // converti in secondi per compatibilità
      isSameLocation: distance < 0.1 // se la distanza è < 100m considera lo stesso punto
    };
  };
  
  return (
    <Box sx={{ mb: 3 }}>
      {daysToShow.map((day, dayIndex) => {
        const actualDayIndex = singleDayMode ? 0 : dayIndex;
        const dayColorIndex = actualDayIndex % dayColors.length;
        const dayColor = dayColors[dayColorIndex];
        
        return (
          <Box key={dayIndex} sx={{ mb: 5 }}>
            {/* Intestazione del giorno */}
            <Box sx={{ 
              bgcolor: dayColor, 
              color: 'white', 
              p: 2, 
              borderRadius: 1, 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CalendarIcon />
              <Typography variant="h6">
                Giorno {singleDayMode ? selectedDay : actualDayIndex + 1} - {formatDate(day.date)}
              </Typography>
            </Box>
            
            <Box sx={{ p: 1 }}>
              {day.visits.length === 0 ? (
                <Typography color="text.secondary" align="center">
                  Nessuna visita pianificata per questo giorno.
                </Typography>
              ) : (
                <Box sx={{ position: 'relative' }}>
                  {/* Linea temporale verticale */}
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      left: '110px', 
                      top: 0, 
                      bottom: 0, 
                      width: '3px', 
                      bgcolor: dayColor,
                      opacity: 0.6,
                      zIndex: 0
                    }}
                  />
                  
                  {day.visits.map((visit, visitIndex) => (
                    <Box key={visitIndex}>
                      {/* Visualizzazione del viaggio solo se non è la prima visita */}
                      {visitIndex > 0 && visit.travelInfo && visit.travelInfo.fromPrevious && (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            py: 1,
                            position: 'relative',
                            zIndex: 1
                          }}
                        >
                          <Box sx={{ width: '100px', textAlign: 'right', pr: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                            </Typography>
                          </Box>
                          
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              bgcolor: 'background.paper',
                              borderRadius: 1,
                              p: 1,
                              border: '1px dashed',
                              borderColor: visit.travelInfo.isReturn ? dayColor : 'divider'
                            }}
                          >
                            <CarIcon sx={{ color: dayColor, mr: 1 }} />
                            <Typography variant="body2">
                              {formatDuration(visit.travelInfo.duration)} - {formatDistance(visit.travelInfo.distance)}
                              {visit.travelInfo.isReturn && (
                                <Typography 
                                  component="span" 
                                  variant="body2" 
                                  color="primary" 
                                  sx={{ ml: 1, fontWeight: 'bold' }}
                                >
                                  (Ritorno)
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      
                      {/* Visualizzazione della visita */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          py: 1,
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        <Box sx={{ width: '100px', textAlign: 'right', pr: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {formatTime(visit.arrivalTime)}
                          </Typography>
                        </Box>
                        
                        <Box 
                          sx={{ 
                            position: 'relative',
                            zIndex: 2,
                            display: 'flex', 
                            alignItems: 'flex-start',
                            bgcolor: 'background.paper', 
                            p: 1.5,
                            border: '1px solid',
                            borderColor: visit.location.is_lunch_break 
                              ? 'warning.main'
                              : visit.location.is_start_point || visit.travelInfo?.isReturn 
                                ? dayColor 
                                : visit.location.priority === 'high' 
                                  ? 'error.main'
                                  : dayColor,
                            borderRadius: 1,
                            width: 'calc(100% - 120px)',
                            boxShadow: 1
                          }}
                        >
                          {/* Add marker for each visit */}
                          {!visit.location.is_lunch_break && (
                            <VisitMarker 
                              dayNumber={singleDayMode ? selectedDay : actualDayIndex + 1}
                              visitIndex={visitIndex + 1}
                              visit={visit}
                            />
                          )}
                          
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle1">
                                {visit.location.name}
                                {visit.location.is_start_point && (
                                  <Typography 
                                    component="span" 
                                    variant="body2" 
                                    sx={{ ml: 1, fontWeight: 'bold', color: dayColor }}
                                  >
                                    (Partenza)
                                  </Typography>
                                )}
                                {visit.travelInfo?.isReturn && (
                                  <Typography 
                                    component="span" 
                                    variant="body2" 
                                    sx={{ ml: 1, fontWeight: 'bold', color: dayColor }}
                                  >
                                    (Arrivo)
                                  </Typography>
                                )}
                                {visit.visitPart === 'before_lunch' && (
                                  <Typography 
                                    component="span" 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ ml: 1 }}
                                  >
                                    (Prima parte)
                                  </Typography>
                                )}
                                {visit.visitPart === 'after_lunch' && (
                                  <Typography 
                                    component="span" 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ ml: 1 }}
                                  >
                                    (Continuazione)
                                  </Typography>
                                )}
                              </Typography>
                              
                              {/* Show duration tag for all visit types (including start point) */}
                              {(visit.location.is_start_point || (!visit.location.is_start_point && !visit.travelInfo?.isReturn && !visit.location.is_lunch_break && !visit.visitPart)) && (
                                <Chip 
                                  size="small" 
                                  label={`${visit.location.visit_duration || visit.location.duration} min`} 
                                  icon={<TimeIcon />} 
                                  color="primary" 
                                  variant="outlined" 
                                />
                              )}
                              
                              {/* Mostra la durata parziale per le visite divise */}
                              {(visit.visitPart === 'before_lunch' || visit.visitPart === 'after_lunch') && visit.location.partial_duration && (
                                <Chip 
                                  size="small" 
                                  label={`${Math.round(visit.location.partial_duration)} min`} 
                                  icon={<TimeIcon />} 
                                  color="info" 
                                  variant="outlined" 
                                />
                              )}
                              
                              {/* Chip specifico per la pausa pranzo */}
                              {visit.location.is_lunch_break && (
                                <Chip 
                                  size="small" 
                                  label={`${visit.location.duration} min`} 
                                  icon={<CoffeeIcon />} 
                                  color="warning" 
                                  variant="outlined" 
                                />
                              )}
                            </Box>
                            
                            {/* Mostra dettagli per pausa pranzo */}
                            {visit.location.is_lunch_break && (
                              <Typography variant="body2" color="text.secondary">
                                {visit.location.start_time} - {visit.location.end_time}
                              </Typography>
                            )}
                            
                            {/* Mostra indirizzo per tutti tranne pausa pranzo */}
                            {!visit.location.is_lunch_break && (
                              <Typography variant="body2" color="text.secondary">
                                {visit.location.address}
                              </Typography>
                            )}
                            
                            {/* Mostra note se presenti */}
                            {visit.location.notes && !visit.location.is_lunch_break && (
                              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                Note: {visit.location.notes}
                              </Typography>
                            )}
                            
                            {/* Mostra priorità se presente e non è punto di partenza/arrivo o pausa pranzo */}
                            {visit.location.priority && !visit.location.is_start_point && !visit.travelInfo?.isReturn && !visit.location.is_lunch_break && (
                              <Box sx={{ mt: 1 }}>
                                
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                      
                      {/* Visualizzazione dell'orario di partenza - unified font weight, no "Partenza" text */}
                      {visitIndex < day.visits.length - 1 && 
                       !visit.location.is_lunch_break && 
                       !visit.travelInfo?.isReturn && (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            py: 0,
                            position: 'relative',
                            zIndex: 1
                          }}
                        >
                          <Box sx={{ width: '100px', textAlign: 'right', pr: 2 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {formatTime(visit.departureTime)}
                            </Typography>
                          </Box>
                          
                          {/* Removed the "Partenza" text */}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            
            {/* Connessione al giorno successivo */}
            {showDayConnections && dayIndex < daysToShow.length - 1 && (
              <Box sx={{ mt: 3, mb: 4 }}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderStyle: 'dashed', 
                    borderColor: 'grey.400',
                    bgcolor: 'grey.50'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ForwardIcon sx={{ mr: 1, color: 'grey.600' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      Connessione al Giorno {actualDayIndex + 2}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {(() => {
                    const connection = calculateDayConnection(day, daysToShow[dayIndex + 1]);
                    
                    if (!connection) {
                      return (
                        <Typography color="text.secondary">
                          Informazioni di connessione non disponibili.
                        </Typography>
                      );
                    }
                    
                    const nextDayColorIndex = (dayColorIndex + 1) % dayColors.length;
                    const nextDayColor = dayColors[nextDayColorIndex];
                    
                    return (
                      <Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            p: 1, 
                            border: `1px solid ${dayColor}`,
                            borderRadius: 1,
                            minWidth: 240
                          }}>
                            <Box sx={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: '50%', 
                              bgcolor: dayColor,
                              mr: 1
                            }} />
                            <Typography variant="body2">
                              <strong>Da:</strong> {connection.from.location.name}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            p: 1, 
                            border: `1px solid ${nextDayColor}`,
                            borderRadius: 1,
                            minWidth: 240
                          }}>
                            <Box sx={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: '50%', 
                              bgcolor: nextDayColor,
                              mr: 1
                            }} />
                            <Typography variant="body2">
                              <strong>A:</strong> {connection.to.location.name}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {connection.isSameLocation ? (
                            <Chip 
                              icon={<HomeIcon />} 
                              label="Stessa Posizione"
                              color="success"
                              variant="outlined"
                            />
                          ) : (
                            <>
                              <Chip 
                                icon={<TimeIcon />} 
                                label={`Tempo stimato: ${formatDuration(connection.duration)}`}
                                color="default"
                                variant="outlined"
                              />
                              <Chip 
                                icon={<CarIcon />} 
                                label={`Distanza: ${formatDistance(connection.distance)}`}
                                color="default"
                                variant="outlined"
                              />
                            </>
                          )}
                        </Box>
                      </Box>
                    );
                  })()}
                </Paper>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default TimelineView;