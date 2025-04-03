import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuthStatus, login as apiLogin, logout as apiLogout, changePassword as apiChangePassword, getProfile as apiGetProfile } from './authApi';

// Crea il contesto di autenticazione
const AuthContext = createContext(null);

// Hook personalizzato per utilizzare il contesto
export const useAuth = () => useContext(AuthContext);

// Provider del contesto di autenticazione
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Verifica lo stato di autenticazione all'avvio
  useEffect(() => {
    console.log('AuthContext.jsx - Controllo stato autenticazione');
    
    const verifyAuthStatus = async () => {
      try {
        const data = await checkAuthStatus();
        console.log('AuthContext.jsx - Dati checkAuth:', data);
        
        if (data.success && data.user) {
          console.log('AuthContext.jsx - Utente autenticato:', data.user.username);
          setUser(data.user);
        } else {
          console.log('AuthContext.jsx - Utente non autenticato');
          setUser(null);
        }
      } catch (err) {
        console.error('AuthContext.jsx - Errore checkAuth:', err);
        setError("Failed to verify authentication status");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuthStatus();
  }, []);

  // Funzione di login
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiLogin(username, password);
      
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.error || 'Login failed');
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError("Login request failed");
      return { success: false, error: "Login request failed" };
    } finally {
      setLoading(false);
    }
  };

  // Funzione di logout
  const logout = async () => {
    setLoading(true);
    
    try {
      await apiLogout();
      
      setUser(null);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
      setError("Logout request failed");
    } finally {
      setLoading(false);
    }
  };

  // Funzione per cambiare password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const data = await apiChangePassword(currentPassword, newPassword);
      return data;
    } catch (err) {
      console.error('Password change failed:', err);
      return { 
        success: false, 
        error: "Password change request failed" 
      };
    }
  };

  // Funzione per ottenere il profilo utente
  const getProfile = async () => {
    try {
      const data = await apiGetProfile();
      return data;
    } catch (err) {
      console.error('Profile fetch failed:', err);
      return { 
        success: false, 
        error: "Failed to fetch profile" 
      };
    }
  };

  // Funzione per verificare i permessi
  const hasPermission = (pageUrl, permission = 'view') => {
    if (!user || !user.permissions) return false;
    
    // Cerca il permesso nei menu
    for (const type in user.permissions) {
      const found = user.permissions[type].find(item => 
        item.page_url === pageUrl
      );
      
      if (found) {
        return permission === 'edit' ? found.can_edit === 1 : found.can_view === 1;
      }
    }
    
    return false;
  };

  // Funzione per verificare se l'utente appartiene a un gruppo
  const hasGroup = (groupName) => {
    if (!user || !user.groups) return false;
    return user.groups.some(group => group.name === groupName);
  };

  // Valore fornito dal contesto
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    changePassword,
    getProfile,
    hasPermission,
    hasGroup,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext;
