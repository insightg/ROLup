import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';

const RouteMapView = ({ routeData }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapLoaded = useRef(false);

  useEffect(() => {
    // Funzione per caricare la Google Maps API
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      // Creiamo uno script per caricare l'API di Google Maps
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    };

    // Inizializza la mappa
    const initMap = () => {
      if (!mapRef.current) return;
      
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 45.4642, lng: 9.1900 }, // Milano come default
        mapTypeControl: true,
        scrollwheel: true,
        zoomControl: true,
        fullscreenControl: true
      });
      
      mapLoaded.current = true;
      
      if (routeData?.stops) {
        renderRoute();
      }
    };

    // Renderizza il percorso sulla mappa
    const renderRoute = () => {
      if (!mapLoaded.current || !routeData?.stops) return;
      
      // Pulisci la mappa
      mapInstance.current.setCenter({ lat: 45.4642, lng: 9.1900 });
      
      const bounds = new window.google.maps.LatLngBounds();
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true
      });
      
      // Prepara waypoints
      const stops = routeData.stops.map(stop => ({
        location: new window.google.maps.LatLng(stop.lat, stop.lng),
        stopover: true
      }));
      
      // Crea markers per ogni fermata
      routeData.stops.forEach((stop, index) => {
        const position = { lat: stop.lat, lng: stop.lng };
        bounds.extend(position);
        
        // Crea marker personalizzato
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: stop.name,
          label: {
            text: `${index + 1}`,
            color: 'white'
          },
          icon: {
            url: `https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=${index + 1}|${index === 0 ? '00CC00' : 'FF0000'}|FFFFFF`,
            labelOrigin: new window.google.maps.Point(11, 15)
          }
        });
        
        // Info window con dettagli della fermata
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div>
              <h3>${stop.name}</h3>
              <p>Arrivo: ${stop.arrivalTime}</p>
              <p>Partenza: ${stop.departureTime}</p>
              <p>Durata visita: ${stop.visitDuration} min</p>
            </div>
          `
        });
        
        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker);
        });
      });
      
      // Calcola e visualizza il percorso
      if (stops.length > 1) {
        const origin = stops.shift().location;
        const destination = routeData.returnToStart 
          ? origin 
          : stops.pop().location;
        
        directionsService.route({
          origin,
          destination,
          waypoints: stops,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (response, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(response);
          } else {
            console.error(`Directions request failed: ${status}`);
          }
        });
      }
      
      mapInstance.current.fitBounds(bounds);
    };

    loadGoogleMaps();
    
    return () => {
      // Cleanup
    };
  }, []);
  
  // Render route when route data changes
  useEffect(() => {
    if (mapLoaded.current && routeData?.stops) {
      const renderRoute = setTimeout(() => {
        if (mapRef.current && routeData?.stops) {
          // Chiamata alla funzione per renderizzare il percorso
          // /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/components/RouteMapView.jsx (continuazione)
          // Chiamata alla funzione per renderizzare il percorso
          const bounds = new window.google.maps.LatLngBounds();
          const directionsService = new window.google.maps.DirectionsService();
          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: mapInstance.current,
            suppressMarkers: true
          });
          
          // Prepara waypoints
          const waypoints = routeData.stops.slice(1, routeData.stops.length - 1).map(stop => ({
            location: new window.google.maps.LatLng(stop.lat, stop.lng),
            stopover: true
          }));
          
          // Crea markers per ogni fermata
          routeData.stops.forEach((stop, index) => {
            const position = { lat: stop.lat, lng: stop.lng };
            bounds.extend(position);
            
            const marker = new window.google.maps.Marker({
              position,
              map: mapInstance.current,
              title: stop.name,
              label: {
                text: `${index + 1}`,
                color: 'white'
              },
              icon: {
                url: `https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=${index + 1}|${index === 0 ? '00CC00' : 'FF0000'}|FFFFFF`,
                labelOrigin: new window.google.maps.Point(11, 15)
              }
            });
            
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div>
                  <h3>${stop.name}</h3>
                  <p>Arrivo: ${stop.arrivalTime}</p>
                  <p>Partenza: ${stop.departureTime}</p>
                  <p>Durata visita: ${stop.visitDuration} min</p>
                </div>
              `
            });
            
            marker.addListener('click', () => {
              infoWindow.open(mapInstance.current, marker);
            });
          });
          
          // Calcola e visualizza il percorso
          if (routeData.stops.length > 1) {
            const origin = new window.google.maps.LatLng(
              routeData.stops[0].lat, 
              routeData.stops[0].lng
            );
            
            const destination = routeData.returnToStart 
              ? origin 
              : new window.google.maps.LatLng(
                  routeData.stops[routeData.stops.length - 1].lat,
                  routeData.stops[routeData.stops.length - 1].lng
                );
            
            directionsService.route({
              origin,
              destination,
              waypoints: waypoints,
              optimizeWaypoints: false,
              travelMode: window.google.maps.TravelMode.DRIVING
            }, (response, status) => {
              if (status === 'OK') {
                directionsRenderer.setDirections(response);
              } else {
                console.error(`Directions request failed: ${status}`);
              }
            });
          }
          
          mapInstance.current.fitBounds(bounds);
        }
      }, 500);
      
      return () => clearTimeout(renderRoute);
    }
  }, [routeData]);

  return (
    <Paper sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {!routeData && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          flexDirection: 'column'
        }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Caricamento percorso...
          </Typography>
        </Box>
      )}
      <Box 
        ref={mapRef} 
        sx={{ 
          width: '100%', 
          height: '100%',
          visibility: routeData ? 'visible' : 'hidden'
        }} 
      />
    </Paper>
  );
};

export default RouteMapView;



# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/store/routeStore.jsx ======
