// src/services/GoogleMapsService.js

export const loadGoogleMapsScript = (apiKey) => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };
  
  export const geocodeAddress = (address) => {
    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          resolve({ lat: lat(), lng: lng() });
        } else {
          reject(`Geocoding non riuscito: ${status}`);
        }
      });
    });
  };
  
  export const getOptimizedRoute = (origin, destination, waypoints, returnToStart = false) => {
    return new Promise((resolve, reject) => {
      const directionsService = new window.google.maps.DirectionsService();
      const request = {
        origin,
        destination: returnToStart ? origin : destination,
        waypoints: waypoints.map(wp => ({ location: wp, stopover: true })),
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING
      };
      directionsService.route(request, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          resolve(result);
        } else {
          reject(`Directions request failed: ${status}`);
        }
      });
    });
  };
  