/**
 * Updated route-optimizer-service.js to work with Google Routes API
 * This service handles route optimization on the frontend
 */

// Function to load the Google Maps API with Routes library support
export const loadGoogleMapsAPI = (apiKey) => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      
      // Flag to track if we're already waiting for loading
      if (window._googleMapsLoading) {
        // If already waiting, wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkLoaded);
            resolve();
          }
        }, 100);
        return;
      }
      
      window._googleMapsLoading = true;
      
      // Callback function
      const callbackName = 'googleMapsCallback_' + Math.round(Math.random() * 1000000);
      window[callbackName] = () => {
        window._googleMapsLoading = false;
        delete window[callbackName];
        resolve();
      };
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&v=weekly&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        window._googleMapsLoading = false;
        delete window[callbackName];
        reject(new Error('Google Maps API failed to load'));
      };
      
      // Timeout for cases where the API doesn't respond
      const timeout = setTimeout(() => {
        if (!window.google || !window.google.maps) {
          window._googleMapsLoading = false;
          delete window[callbackName];
          reject(new Error('Google Maps API loading timeout'));
        }
      }, 10000); // 10 second timeout
      
      // Modify the callback function to clear the timeout
      const originalCallback = window[callbackName];
      window[callbackName] = () => {
        clearTimeout(timeout);
        originalCallback();
      };
      
      document.head.appendChild(script);
    });
  };
  
  // Format a date object to HH:MM format
  export const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Calculate Haversine distance between two points (fallback)
  export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  };
  
  // New function to request route optimization using Google Routes API directly from the frontend
  // This is an alternative if you want to make the API call client-side
  export const calculateRouteWithGoogleRoutesAPI = async (locations, apiKey, options = {}) => {
    try {
      // Make sure Google Maps API is loaded
      await loadGoogleMapsAPI(apiKey);
      
      // Create waypoints array
      const waypoints = locations.map(location => ({
        location: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        },
        stopDuration: (location.visitDuration || 30) * 60, // Convert minutes to seconds
        title: location.name || ""
      }));
      
      // Prepare the request body
      const requestBody = {
        origin: waypoints[0],
        destination: options.returnToStart ? waypoints[0] : waypoints[waypoints.length - 1],
        intermediates: waypoints.slice(1, options.returnToStart ? undefined : -1),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false
        },
        languageCode: "it-IT",
        units: "METRIC"
      };
      
      // Make the API request
      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs.steps,routes.legs.distanceMeters,routes.legs.duration,routes.legs.polyline.encodedPolyline"
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Google Routes API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.routes || data.routes.length === 0) {
        throw new Error("No routes returned from Google Routes API");
      }
      
      // Process the route data
      const route = data.routes[0];
      
      // Total distance in kilometers
      const totalDistanceKm = route.distanceMeters / 1000;
      
      // Total duration in minutes
      const totalDurationMin = route.duration / 60;
      
      // Process legs (segments between waypoints)
      const legs = route.legs;
      
      // Build the route result
      const result = [];
      
      // Start time
      let currentTime = new Date();
      
      // Add the start point
      result.push({
        ...locations[0],
        arrivalTime: formatTime(currentTime),
        departureTime: formatTime(currentTime),
        visitDuration: 0
      });
      
      // Extract polylines
      const polylines = legs.map(leg => leg.polyline?.encodedPolyline).filter(Boolean);
      
      // Process each leg and waypoint
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        
        // Update the time based on travel duration
        const travelDurationMin = leg.duration / 60;
        currentTime = new Date(currentTime.getTime() + travelDurationMin * 60 * 1000);
        const arrivalTime = new Date(currentTime.getTime());
        
        // Get the corresponding location
        const locationIndex = i + 1;
        if (locationIndex < locations.length) {
          const location = locations[locationIndex];
          
          // Add visit duration
          const visitDuration = location.visitDuration || 30;
          currentTime = new Date(currentTime.getTime() + visitDuration * 60 * 1000);
          
          result.push({
            ...location,
            arrivalTime: formatTime(arrivalTime),
            departureTime: formatTime(currentTime),
            visitDuration,
            nextLegDistance: (i < legs.length - 1) ? (legs[i + 1].distanceMeters / 1000) : 0,
            nextLegDuration: (i < legs.length - 1) ? (legs[i + 1].duration / 60) : 0
          });
        }
      }
      
      return {
        stops: result,
        totalDistanceKm: totalDistanceKm.toFixed(1),
        totalTimeMinutes: Math.round(totalDurationMin),
        polylines,
        returnToStart: options.returnToStart || false
      };
      
    } catch (error) {
      console.error('Error calculating route with Google Routes API:', error);
      throw error;
    }
  };
  
  // Main function to optimize a route - this calls the backend which now uses Google Routes API
  export const optimizeRoute = async (selectedPOS, settings) => {
    try {
      // Prepare the request data
      const requestData = {
        action: 'optimizeRoute',
        data: {
          startingPoint: settings.startingPoint || 'current',
          customStartAddress: settings.customStartAddress || '',
          returnToStart: settings.returnToStart !== undefined ? settings.returnToStart : true,
          optimizationMethod: settings.optimizationMethod || 'distance',
          selectedPosIds: selectedPOS.map(pos => ({
            id: pos.id,
            visitDuration: pos.visitDuration || 30,
            priority: pos.priority || 'normal'
          }))
        }
      };
      
      // Import apiUtils
      const apiUtils = await import('../../../../utils/apiUtils');
      
      // Make the API call to the backend using apiUtils
      const result = await apiUtils.default.post('r_route_optimizer.php', requestData);
      
      // The result already contains the parsed response
      if (!result.success) {
        throw new Error(result.error || 'Error optimizing route');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw error;
    }
  };
  
  export default {
    loadGoogleMapsAPI,
    formatTime,
    calculateHaversineDistance,
    calculateRouteWithGoogleRoutesAPI,
    optimizeRoute
  };