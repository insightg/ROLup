// src/components/layout/AppContainer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography, 
  Divider,
  Paper,
  Button,
  useMediaQuery,
  Backdrop,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon as MenuItemIcon
 

} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Home as HomeIcon,
  PersonOutline,
  Logout as LogoutIcon,
  ContactsOutlined as ContactsIcon,
  Forum as ForumIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// Importiamo il ModuleLoader
import ModuleLoader from '../modules/ModuleLoader';
import UserProfile from '../auth/UserProfile';

// Stili CSS globali da applicare - importante per il layout
const layoutStyles = `
  /* Assicura che il layout occupi tutto lo spazio disponibile */
  html, body, #root {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* Imposta z-index appropriati per gli elementi */
  .app-container {
    z-index: 1;
  }
  
  .top-bar {
    z-index: 1200;
  }
  
  .bottom-bar {
    z-index: 1100;
  }
  
  .module-container {
    z-index: 1000;
  }
  
  /* Disabilita posizionamento assoluto/fixed nei moduli */
  .module-container > div {
    position: relative !important;
    height: 100% !important;
    width: 100% !important;
  }
`;

// Componente Home (schermata iniziale senza moduli)
const HomeScreen = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      p: 3
    }}
  >
    <Typography variant="h4" gutterBottom>
      Benvenuto nel Sistema di Gestione Integrato
    </Typography>
    <Typography variant="body1" align="center" sx={{ maxWidth: 600, mb: 4 }}>
      Seleziona un modulo dal menu per iniziare a lavorare.
    </Typography>
  </Box>
);


// Larghezza del drawer
const drawerWidth = 280;

// Drawer header personalizzato
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// Componente per visualizzare l'ora corrente
const Clock = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, []);
  






  // Formatta l'ora: HH:MM:SS
  const formattedTime = time.toLocaleTimeString();
  
  return (
    <Typography variant="body2">
      {formattedTime}
    </Typography>
  );
};

// Componente che preserva lo stato dei moduli caricati
const PersistentModuleContainer = ({ modules, currentModule }) => {
  // Traccia i moduli che sono stati caricati almeno una volta
  const [loadedModules, setLoadedModules] = useState({
    home: true  // La home è sempre caricata all'inizio
  });
  
  // Quando un nuovo modulo viene selezionato, lo aggiungiamo ai moduli caricati
  useEffect(() => {
    if (currentModule && !loadedModules[currentModule]) {
      setLoadedModules(prev => ({
        ...prev,
        [currentModule]: true
      }));
    }
  }, [currentModule, loadedModules]);
  
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Home screen */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          display: currentModule === null ? 'block' : 'none'
        }}
      >
        <HomeScreen />
      </Box>
      
      {/* Moduli persistenti che mantengono il loro stato */}
      {Object.entries(modules).map(([id, moduleConfig]) => {
        // Renderizza il modulo solo se è stato caricato almeno una volta
        if (!loadedModules[id]) return null;
        
        return (
          <Box 
            key={id}
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              visibility: currentModule === id ? 'visible' : 'hidden',
              display: currentModule === id ? 'block' : 'none'
            }}
          >
            {moduleConfig.type === 'internal' ? (
              <ModuleLoader moduleName={moduleConfig.id} />
            ) : (
              moduleConfig.component
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const AppContainer = ({ initialModule = null }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState(initialModule);
  const mainContentRef = useRef(null);
  
  // Stato per il menu dell'avatar
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  
  // Gestisci la visualizzazione del profilo utente
  const [showProfile, setShowProfile] = useState(false);

  // Inietta gli stili globali una sola volta all'avvio
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = layoutStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Controlla il percorso attuale per decidere se mostrare il profilo
  useEffect(() => {
    if (location.pathname === '/profile') {
      setShowProfile(true);
      setCurrentModule('profile');
    } else {
      setShowProfile(false);
    }
  }, [location.pathname]);

  // Gestione chiusura del menu su dimensione mobile
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
    }, [isMobile]);

// In AppContainer.jsx, aggiungi questo effect dopo gli altri useEffect
useEffect(() => {
  const handleModuleChange = (event) => {
    const moduleName = event.detail.moduleName;
    console.log('Cambio modulo richiesto:', moduleName);
    
    if (moduleName && moduleMapping[moduleName]) {
      setCurrentModule(moduleName);
      setShowProfile(false);
    }
  };
  
  document.addEventListener('changeModule', handleModuleChange);
  
  return () => {
    document.removeEventListener('changeModule', handleModuleChange);
  };
}, []);




  // Chiude il menu quando si fa clic all'esterno
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        open && 
        mainContentRef.current && 
        !event.target.closest('.MuiDrawer-paper') &&
        !event.target.closest('.menu-button')
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleMenuItemClick = (moduleId) => {
    setCurrentModule(moduleId);
    setOpen(false);
    
    // Resetta lo stato del profilo quando si cambia modulo
    if (moduleId !== 'profile') {
      setShowProfile(false);
    }
  };
  
  // Ottieni l'iniziale del nome per l'avatar
  const getInitials = (name) => {
    if (!name) return 'GG';
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };
  
  // Gestione menu avatar
  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Gestione logout
  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };
  
  // Gestione navigazione al profilo
  const handleProfile = () => {
    handleMenuClose();
    setCurrentModule('profile');
    setShowProfile(true);
    
    // Aggiorna l'URL senza ricaricare la pagina
    window.history.pushState(null, 'Profile', '/profile');
  };// Module mapping
  const moduleMapping = {
    anagrafica: { type: 'internal', id: 'anagrafica', label: 'Anagrafica' },
    chatbot: { type: 'internal', id: 'chatbot', label: 'ChatBot' },
    'dashboard-pm': { type: 'internal', id: 'dashboard-pm', label: 'Dashboard PM' },
    'task-templates': { type: 'internal', id: 'task-templates', label: 'TaskTemplates' },
    'route-optimizer': { type: 'internal', id: 'route-optimizer', label: 'Ottimizzazione Percorsi' },
    'pick-manager': { type: 'internal', id: 'pick-manager', label: 'Pick Manager' }
  };
  
  // Menu items array
  const menuItems = [
    { id: null, text: 'Home', icon: <HomeIcon /> },
    { id: 'anagrafica', text: 'Anagrafica', icon: <ContactsIcon /> },
    { id: 'chatbot', text: 'ChatBot', icon: <ForumIcon /> },
    { id: 'dashboard-pm', text: 'Dashboard PM', icon: <AssignmentIcon /> },
    { id: 'task-templates', text: 'Template Task', icon: <AssignmentIcon /> },
    { id: 'route-optimizer', text: 'Ottimizzazione Percorsi', icon: <AssignmentIcon /> },
    { id: 'pick-manager', text: 'Pick Manager', icon: <ShoppingCartIcon /> }
  ];
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        width: '100vw',
        overflow: 'hidden' 
      }}
      className="app-container"
    >
      <CssBaseline />
      
      {/* Top Bar (fissa) */}
      <AppBar 
        position="static" 
        sx={{ 
          flexShrink: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1 
        }}
        className="top-bar"
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            className="menu-button"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Sistema di Gestione Integrato
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={handleAvatarClick}
            aria-controls={isMenuOpen ? 'avatar-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={isMenuOpen ? 'true' : undefined}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
              {user ? getInitials(user.full_name) : 'GG'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Menu Avatar */}
      <Menu
        id="avatar-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'avatar-button',
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            minWidth: 200,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            }
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfile}>
          <MenuItemIcon>
            <PersonIcon fontSize="small" />
          </MenuItemIcon>
          Profilo
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <MenuItemIcon>
            <LogoutIcon fontSize="small" />
          </MenuItemIcon>
          Logout
        </MenuItem>
      </Menu>
      
      {/* Contenitore principale */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden'
        }}
        className="main-content-wrapper"
      >
        {/* Backdrop per schermi mobile */}
        {open && (
          <Backdrop
            sx={{ 
              zIndex: (theme) => theme.zIndex.drawer - 1,
              position: 'absolute'
            }}
            open={open}
            onClick={() => setOpen(false)}
          />
        )}
        
        {/* Menu Laterale */}
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            position: 'absolute',
            height: '100%',
            zIndex: (theme) => theme.zIndex.drawer,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              position: 'absolute',
              height: '100%'
            },
          }}
          variant="temporary"
          anchor="left"
          open={open}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true,
          }}
        >
          <DrawerHeader>
            <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
              Menu
            </Typography>
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </DrawerHeader>
          <Divider />
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.id || 'home'} disablePadding>
                <ListItemButton 
                  selected={currentModule === item.id}
                  onClick={() => handleMenuItemClick(item.id)}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </Drawer>
        
        {/* Area contenuto principale con persistenza dello stato */}
        <Box
          ref={mainContentRef}
          sx={{
            flexGrow: 1,
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            position: 'relative' 
          }}
          className="module-container"
        >
          {showProfile ? (
            <UserProfile />
          ) : (
            <PersistentModuleContainer 
              modules={moduleMapping} 
              currentModule={currentModule} 
            />
          )}
        </Box>
      </Box>
      
      {/* Bottom Bar */}
      <Paper
        elevation={3}
        sx={{
          padding: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 1
        }}
        className="bottom-bar"
      >
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          © 2025 Sistema Gestione - Versione 1.0.0
        </Typography>
        <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button size="small" color="primary">
            Supporto
          </Button>
          <Clock />
        </Box>
      </Paper>
    </Box>
  );
};

export default AppContainer;
