import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

const ProtectedRoute = ({ 
  children, 
  requiredPermission = null,
  requiredGroup = null 
}) => {
  const { user, loading, hasPermission, hasGroup, isAuthenticated } = useAuth();
  const location = useLocation();
 console.log('ProtectedRoute.jsx - Controllo accesso a:', location.pathname);
  console.log('ProtectedRoute.jsx - Stato autenticazione:', { isAuthenticated, loading });
 
  // Mostra spinner durante il caricamento
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }} variant="h6">
          Verifica autenticazione...
        </Typography>
      </Box>
    );
  }

  // Verifica autenticazione
  if (!isAuthenticated) {
    // Reindirizza al login e salva il percorso originale
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica permessi specifici di pagina se richiesti
  if (requiredPermission) {
    const [page, permission] = requiredPermission.split(':');
    
    if (!hasPermission(page, permission || 'view')) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Verifica gruppo se richiesto
  if (requiredGroup && !hasGroup(requiredGroup)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Se tutto è ok, mostra il contenuto
  return children;
};

export default ProtectedRoute;
