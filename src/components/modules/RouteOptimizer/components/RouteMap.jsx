import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { fetchGoogleMapsApiKey, getRouteBetweenPoints } from '../api/routeOptimizerApi';

// Global variable to track Google Maps loading
window.googleMapsIsLoading = false;

const RouteMap = ({ route, selectedDay, singleDayMode = false, showConnections = false }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null); // Store map instance in a ref to ensure stability
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [routesError, setRoutesError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const theme = useTheme();
  
  // Store route data in a ref to prevent unnecessary rerenders
  const routeDataRef = useRef(route);
  
  // Update route data ref when props change
  useEffect(() => {
    routeDataRef.current = route;
  }, [route]);
  
  // Get API key
  useEffect(() => {
    const getApiKey = async () => {
      try {
        const response = await fetchGoogleMapsApiKey();
        setApiKey(response.apiKey);
      } catch (error) {
        console.error("Error fetching API key:", error);
        setError("Impossibile ottenere la chiave API di Google Maps");
        setLoading(false);
      }
    };
    
    getApiKey();
  }, []);
  
  // Initialize map using the callback approach
  const initializeMap = useCallback(() => {
    try {
      if (!mapRef.current || !window.google || !window.google.maps) {
        console.log("Can't initialize map yet");
        return;
      }
      
      console.log("Initializing map");
      const mapOptions = {
        center: { lat: 42.504, lng: 12.574 }, // Center of Italy
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: theme.palette.mode === 'dark' ? [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        ] : []
      };
      
      // Only create a new map if we don't already have one
      if (!mapInstanceRef.current) {
        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;
        console.log("Map initialized successfully");
      }
      
      setLoading(false);
      setMapReady(true);
      
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Errore nell\'inizializzazione della mappa: ' + err.message);
      setLoading(false);
    }
  }, [theme.palette.mode]);
  
  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;
    
    // If Google Maps is already loaded, initialize the map
    if (window.google && window.google.maps) {
      console.log("Google Maps already loaded");
      initializeMap();
      return;
    }
    
    // Don't load again if we're already loading
    if (window.googleMapsIsLoading) {
      console.log("Google Maps is already loading");
      
      // Check every 100ms if Google Maps is loaded
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          console.log("Google Maps is now loaded");
          clearInterval(checkInterval);
          initializeMap();
        }
      }, 100);
      
      return () => clearInterval(checkInterval);
    }
    
    console.log("Starting Google Maps loading");
    window.googleMapsIsLoading = true;
    
    // Define a global callback function for Google Maps
    window.initMap = function() {
      console.log("Google Maps loaded via callback");
      window.googleMapsIsLoading = false;
      if (window.google && window.google.maps) {
        initializeMap();
      }
    };
    
    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=places,geometry&v=weekly`;
    script.async = true;
    script.defer = true;
    
    // Handle errors
    script.onerror = () => {
      console.error("Error loading Google Maps script");
      window.googleMapsIsLoading = false;
      setError("Errore nel caricamento di Google Maps");
      setLoading(false);
    };
    
    // Append script to document
    document.head.appendChild(script);
    
    // Cleanup
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey, initializeMap]);
  
  // Function to request route between points from backend using API
  const requestRouteFromBackend = useCallback(async (origin, destination) => {
    try {
      const originObj = {
        lat: origin.lat(),
        lng: origin.lng()
      };
      
      const destinationObj = {
        lat: destination.lat(),
        lng: destination.lng()
      };
      
      const result = await getRouteBetweenPoints(originObj, destinationObj);
      
      // Decode polyline if provided
      if (result.encodedPolyline) {
        return window.google.maps.geometry.encoding.decodePath(result.encodedPolyline);
      }
      
      // Otherwise return path points
      return result.path || [origin, destination];
    } catch (error) {
      console.error('Error requesting route from backend:', error);
      // Fallback to direct line
      return [origin, destination];
    }
  }, []);
  // Add this to drawRoute function to customize markers
const createMarkerWithLabel = (position, visit, dayNumber, visitIndex) => {
  // Determine if it's a special point (start or return)
  const isStartPoint = visit.location.is_start_point === true;
  const isEndPoint = visit.travelInfo && visit.travelInfo.isReturn === true;
  
  // Determine marker color based on point type and day
  const dayColorIndex = singleDayMode ? 0 : (dayNumber - 1) % dayColors.length;
  const markerColor = isStartPoint ? '#4CAF50' : isEndPoint ? '#F44336' : dayColors[dayColorIndex];
  
  // Create label text - more visible and informative
  const labelText = isStartPoint 
    ? (singleDayMode ? 'P' : `${dayNumber}P`) 
    : isEndPoint 
      ? (singleDayMode ? 'A' : `${dayNumber}A`) 
      : (singleDayMode ? (visitIndex + 1).toString() : `${dayNumber}.${visitIndex + 1}`);
  
  // Create marker with enhanced icon
  const marker = new window.google.maps.Marker({
    position,
    map,
    title: `${singleDayMode ? '' : 'Giorno ' + dayNumber + ' - '}${visit.location.name}${isStartPoint ? ' (Partenza)' : isEndPoint ? ' (Ritorno)' : ''}`,
    label: {
      text: labelText,
      color: 'white',
      fontWeight: 'bold',
      fontSize: '12px'
    },
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: markerColor,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 14
    }
  });
  
  // Prepare infowindow content with more details
  const contentString = `
    <div style="padding: 8px; max-width: 300px;">
      <h3 style="margin-top: 0; color: ${markerColor};">
        ${singleDayMode ? '' : '<strong>Giorno ' + dayNumber + '</strong> - '}
        <strong>${labelText}</strong>: ${visit.location.name}
      </h3>
      <p style="margin: 4px 0;"><strong>Indirizzo:</strong> ${visit.location.address || 'N/D'}</p>
      <p style="margin: 4px 0;"><strong>Arrivo:</strong> ${new Date(visit.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      ${!isStartPoint && !isEndPoint ? `<p style="margin: 4px 0;"><strong>Durata:</strong> ${visit.location.duration} min</p>` : ''}
      ${visit.travelInfo && visit.travelInfo.distance ? `<p style="margin: 4px 0;"><strong>Distanza da prec.:</strong> ${(visit.travelInfo.distance/1000).toFixed(1)} km</p>` : ''}
      ${visit.location.notes ? `<p style="margin: 4px 0;"><strong>Note:</strong> ${visit.location.notes}</p>` : ''}
    </div>
  `;
  
  const infoWindow = new window.google.maps.InfoWindow({
    content: contentString,
    maxWidth: 300
  });
  
  marker.addListener('click', () => {
    // Close any open info windows
    if (window.currentInfoWindow) {
      window.currentInfoWindow.close();
    }
    infoWindow.open(map, marker);
    window.currentInfoWindow = infoWindow;
  });
  
  return marker;
};
  // Draw route on map - memoize this function to prevent recreating it
 // Draw route on map - memoize this function to prevent recreating it
const drawRoute = useCallback(async (map, route, dayIndex) => {
  console.log("Drawing route for day:", dayIndex, "with map:", map ? "Available" : "Missing");
  
  if (!map) {
    console.error("No map instance available");
    return;
  }
  
  // Clean up previous routes and markers
  if (window.routePolylines) {
    console.log(`Clearing ${window.routePolylines.length} existing polylines`);
    window.routePolylines.forEach(poly => poly.setMap(null));
  }
  if (window.routeMarkers) {
    console.log(`Clearing ${window.routeMarkers.length} existing markers`);
    window.routeMarkers.forEach(marker => marker.setMap(null));
  }
  
  window.routePolylines = [];
  window.routeMarkers = [];
  
  const infoWindow = new window.google.maps.InfoWindow();
  const bounds = new window.google.maps.LatLngBounds();
  
  setRoutesError(null);
  
  // Check if route data is valid
  if (!route || !route.days || route.days.length === 0) {
    console.error("Invalid route data");
    setRoutesError("Dati del percorso non validi o incompleti.");
    return;
  }
  
  // Determine which days to show
  let daysToShow = [];
  
  if (dayIndex === 0 && !singleDayMode) {
    // Show all days in complete view
    daysToShow = route.days;
    console.log(`Global view - showing all ${route.days.length} days`);
  } else if (singleDayMode) {
    // In single day mode, show only selected day
    const dayToShow = route.days[dayIndex - 1] || route.days[0];
    daysToShow = [dayToShow];
    console.log(`Single day mode - showing day ${dayIndex}`);
  } else {
    // In other cases (specific day)
    const dayToShow = route.days[dayIndex - 1];
    if (dayToShow) {
      daysToShow = [dayToShow];
      console.log(`Specific day view - showing day ${dayIndex}`);
    }
  }
  
  if (daysToShow.length === 0) {
    setRoutesError("Nessun giorno valido da visualizzare.");
    return;
  }
  
  // Log total visits to be drawn
  let totalVisits = 0;
  daysToShow.forEach(day => {
    if (day.visits) totalVisits += day.visits.length;
  });
  console.log("Total visits to draw:", totalVisits);
  
  // Colors for different days
  const dayColors = [
    "#1976d2", "#2e7d32", "#c62828", "#7b1fa2", "#f57c00", 
    "#0097a7", "#d81b60", "#00695c", "#e65100", "#283593",
    "#4a148c", "#827717"  
  ];
  
  // Process each day
  for (let i = 0; i < daysToShow.length; i++) {
    const day = daysToShow[i];
    const dayColorIndex = singleDayMode ? 0 : i % dayColors.length;
    const dayColor = dayColors[dayColorIndex];
    
    if (!day.visits || day.visits.length === 0) {
      console.log(`Day ${i+1} has no visits, skipping`);
      continue;
    }
    
    const dayNumber = singleDayMode ? 1 : (route.days.indexOf(day) + 1);
    console.log(`Processing day ${dayNumber} with ${day.visits.length} visits`);
    
    // Filter and map visits with valid coordinates (excluding lunch breaks)
    const dayVisits = day.visits
      .filter(visit => {
        const isValid = visit.location && 
                      visit.location.lat && 
                      visit.location.lng && 
                      !visit.location.is_lunch_break;
        if (!isValid) {
          console.log("Skipping invalid visit:", visit);
        }
        return isValid;
      })
      .map((visit, visitIndex) => {
        try {
          const lat = parseFloat(visit.location.lat);
          const lng = parseFloat(visit.location.lng);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.error("Invalid coordinates for visit:", visit);
            return null;
          }
          
          const position = new window.google.maps.LatLng(lat, lng);
          bounds.extend(position);
          
          // Determine if it's a special point (start or return)
          const isStartPoint = visit.location.is_start_point === true;
          const isEndPoint = visit.travelInfo && visit.travelInfo.isReturn === true;
          
          // Create marker with appropriate icon and label
          const labelText = isStartPoint 
            ? (singleDayMode ? 'P' : `${dayNumber}P`) 
            : isEndPoint 
              ? (singleDayMode ? 'A' : `${dayNumber}A`) 
              : (singleDayMode ? (visitIndex + 1).toString() : `${dayNumber}.${visitIndex + 1}`);
            
          const markerColor = isStartPoint ? '#4CAF50' : isEndPoint ? '#F44336' : dayColor;
          
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: `${singleDayMode ? '' : 'Giorno ' + dayNumber + ' - '}${visit.location.name}${isStartPoint ? ' (Partenza)' : isEndPoint ? ' (Ritorno)' : ''}`,
            label: {
              text: labelText,
              color: 'white',
              fontWeight: 'bold'
            },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: markerColor,
              fillOpacity: 1,
              strokeWeight: isStartPoint || isEndPoint ? 2 : 0,
              strokeColor: '#FFFFFF',
              scale: 14
            }
          });
          
          if (!window.routeMarkers) window.routeMarkers = [];
          window.routeMarkers.push(marker);
          
          // Create infowindow with details
          const contentString = `
            <div style="padding: 8px; max-width: 300px;">
              <h3 style="margin-top: 0; color: ${markerColor};">
                ${singleDayMode ? '' : '<strong>Giorno ' + dayNumber + '</strong> - '}
                <strong>${labelText}</strong>: ${visit.location.name}
              </h3>
              <p style="margin: 4px 0;"><strong>Indirizzo:</strong> ${visit.location.address || 'N/D'}</p>
              <p style="margin: 4px 0;"><strong>Arrivo:</strong> ${new Date(visit.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              ${!isStartPoint && !isEndPoint ? `<p style="margin: 4px 0;"><strong>Durata:</strong> ${visit.location.duration} min</p>` : ''}
              ${visit.travelInfo && visit.travelInfo.distance ? `<p style="margin: 4px 0;"><strong>Distanza da prec.:</strong> ${(visit.travelInfo.distance/1000).toFixed(1)} km</p>` : ''}
              ${visit.location.notes ? `<p style="margin: 4px 0;"><strong>Note:</strong> ${visit.location.notes}</p>` : ''}
            </div>
          `;
          
          marker.addListener('click', () => {
            // Close any open info windows
            if (window.currentInfoWindow) {
              window.currentInfoWindow.close();
            }
            
            const infoWindow = new window.google.maps.InfoWindow({
              content: contentString,
              maxWidth: 300
            });
            
            infoWindow.open(map, marker);
            window.currentInfoWindow = infoWindow;
          });
          
          return { position, visit };
        } catch (err) {
          console.error("Error creating marker for visit:", err, visit);
          return null;
        }
      })
      .filter(item => item !== null); // Remove any null items from errors
    
    if (dayVisits.length === 0) {
      console.log(`No valid visits for day ${dayNumber}, skipping`);
      continue;
    }
    
    console.log(`Drawing ${dayVisits.length} valid visits for day ${dayNumber}`);
    
    // Draw route segments between points
    for (let j = 0; j < dayVisits.length - 1; j++) {
      const origin = dayVisits[j].position;
      const destination = dayVisits[j + 1].position;
      
      console.log(`Drawing segment ${j} for day ${dayNumber}: ${origin.lat().toFixed(4)},${origin.lng().toFixed(4)} -> ${destination.lat().toFixed(4)},${destination.lng().toFixed(4)}`);
      
      // Draw a direct line first as a fallback
      const directLine = new window.google.maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: dayColor,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: map
      });
      
      if (!window.routePolylines) window.routePolylines = [];
      window.routePolylines.push(directLine);
      
      // Then try to get the detailed route from backend
      try {
        const path = await requestRouteFromBackend(origin, destination);
        
        if (path && path.length > 1) {
          // Remove the direct line
          directLine.setMap(null);
          window.routePolylines = window.routePolylines.filter(p => p !== directLine);
          
          // Create a new polyline with the detailed path
          const polyline = new window.google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: dayColor,
            strokeOpacity: 0.8,
            strokeWeight: 4,
            map: map
          });
          
          window.routePolylines.push(polyline);
          console.log(`Created detailed polyline for segment ${j} with ${path.length} points`);
        } else {
          console.log(`Using direct line for segment ${j} (no detailed path available)`);
        }
      } catch (error) {
        console.error(`Error getting detailed route for segment ${j}:`, error);
        // Keep the direct line as fallback
      }
    }
  }
  
  // Add connections between days if needed
  if (showConnections && daysToShow.length > 1) {
    console.log("Adding connections between days");
    for (let i = 0; i < daysToShow.length - 1; i++) {
      const currentDay = daysToShow[i];
      const nextDay = daysToShow[i + 1];
      
      if (!currentDay.visits || !nextDay.visits || 
          currentDay.visits.length === 0 || nextDay.visits.length === 0) {
        continue;
      }
      
      // Find last valid visit of current day
      let lastVisit = null;
      for (let j = currentDay.visits.length - 1; j >= 0; j--) {
        if (!currentDay.visits[j].location.is_lunch_break) {
          lastVisit = currentDay.visits[j];
          break;
        }
      }
      
      // Find first valid visit of next day
      let firstVisit = null;
      for (let j = 0; j < nextDay.visits.length; j++) {
        if (!nextDay.visits[j].location.is_lunch_break) {
          firstVisit = nextDay.visits[j];
          break;
        }
      }
      
      if (!lastVisit || !firstVisit || 
          !lastVisit.location.lat || !firstVisit.location.lat) {
        continue;
      }
      
      const lastPosition = new window.google.maps.LatLng(
        parseFloat(lastVisit.location.lat),
        parseFloat(lastVisit.location.lng)
      );
      
      const firstPosition = new window.google.maps.LatLng(
        parseFloat(firstVisit.location.lat),
        parseFloat(firstVisit.location.lng)
      );
      
      // Add dashed line
      const connectionLine = new window.google.maps.Polyline({
        path: [lastPosition, firstPosition],
        geodesic: true,
        strokeColor: '#9E9E9E', // Gray for connections
        strokeOpacity: 0.6,
        strokeWeight: 2,
        strokePattern: [10, 5], // Dashed line
        map: map
      });
      
      if (!window.routePolylines) window.routePolylines = [];
      window.routePolylines.push(connectionLine);
      console.log(`Added connection line between day ${i+1} and day ${i+2}`);
    }
  }
  
  // Fit map to show all markers
  if (!bounds.isEmpty()) {
    console.log("Fitting map to bounds");
    map.fitBounds(bounds);
    
    // Set appropriate zoom level
    window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      if (map.getZoom() > 15) {
        map.setZoom(15);
      }
    });
  } else {
    console.warn("No valid bounds - map may not display correctly");
  }
}, [requestRouteFromBackend, singleDayMode]);
  
  // Draw route when map is ready and route data changes
  useEffect(() => {
    if (mapReady && mapInstanceRef.current && routeDataRef.current && routeDataRef.current.days) {
      console.log("Drawing route with updated props", selectedDay);
      drawRoute(mapInstanceRef.current, routeDataRef.current, selectedDay);
    }
  }, [mapReady, selectedDay, showConnections, drawRoute]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.routePolylines) {
        window.routePolylines.forEach(poly => poly.setMap(null));
        window.routePolylines = [];
      }
      if (window.routeMarkers) {
        window.routeMarkers.forEach(marker => marker.setMap(null));
        window.routeMarkers = [];
      }
    };
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {routesError && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {routesError}
        </Alert>
      )}
      
      <Paper 
        sx={{ 
          flexGrow: 1, 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative'
        }} 
        elevation={0} 
        variant="outlined"
      >
        {loading && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Caricamento della mappa...
            </Typography>
          </Box>
        )}
        
        {error && (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Ricarica Pagina
            </Button>
          </Box>
        )}
        
        <Box
          ref={mapRef}
          sx={{
            width: '100%',
            height: '100%',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.3s',
            visibility: error ? 'hidden' : 'visible'
          }}
        />
      </Paper>
    </Box>
  );
};

export default RouteMap;