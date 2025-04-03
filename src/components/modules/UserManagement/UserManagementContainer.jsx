// src/components/modules/UserManagement/UserManagementContainer.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useUserManagementStore } from './stores/userManagementStore';

// Importa i componenti specifici
import UsersPanel from './components/UsersPanel';
import GroupsPanel from './components/GroupsPanel';
import PermissionsPanel from './components/PermissionsPanel';
import UserFormDialog from './components/UserFormDialog';
import GroupFormDialog from './components/GroupFormDialog';

const UserManagementContainer = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Accedi allo store
  const { 
    users, 
    groups, 
    permissions,
    isLoading, 
    error, 
    fetchUsers, 
    fetchGroups, 
    fetchPermissions,
    refreshData
  } = useUserManagementStore();

  // Carica i dati all'avvio del componente
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Carica utenti e gruppi
        await fetchUsers();
        await fetchGroups();
        await fetchPermissions();
      } catch (error) {
        console.error('Error loading initial data:', error);
        setSnackbar({
          open: true,
          message: 'Errore nel caricamento dei dati',
          severity: 'error'
        });
      }
    };
    
    loadInitialData();
  }, [fetchUsers, fetchGroups, fetchPermissions]);

  // Gestore cambio tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handlers per i dialog
  const handleOpenUserDialog = () => {
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
  };

  const handleOpenGroupDialog = () => {
    setOpenGroupDialog(true);
  };

  const handleCloseGroupDialog = () => {
    setOpenGroupDialog(false);
  };

  // Handler per il refresh dei dati
  const handleRefresh = () => {
    refreshData();
    setSnackbar({
      open: true,
      message: 'Dati aggiornati con successo',
      severity: 'success'
    });
  };

  // Gestore snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header con titolo e azioni */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2
      }}>
        <Typography variant="h5">Gestione Utenti e Permessi</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Aggiorna
          </Button>
          
          {activeTab === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenUserDialog}
              disabled={isLoading}
            >
              Nuovo Utente
            </Button>
          )}
          
          {activeTab === 1 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenGroupDialog}
              disabled={isLoading}
            >
              Nuovo Gruppo
            </Button>
          )}
        </Box>
      </Box>

      {/* Mostra eventuali errori */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs di navigazione */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="user management tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<PersonIcon />} 
            label="Utenti" 
            id="tab-0" 
            aria-controls="tabpanel-0" 
          />
          <Tab 
            icon={<GroupIcon />} 
            label="Gruppi" 
            id="tab-1" 
            aria-controls="tabpanel-1" 
          />
          <Tab 
            icon={<SecurityIcon />} 
            label="Permessi" 
            id="tab-2" 
            aria-controls="tabpanel-2" 
          />
        </Tabs>
      </Paper>

      {/* Contenuto principale */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={activeTab} index={0}>
              <UsersPanel 
                users={users} 
                groups={groups} 
                onUserUpdated={refreshData} 
              />
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <GroupsPanel 
                groups={groups} 
                onGroupUpdated={refreshData} 
              />
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <PermissionsPanel 
                permissions={permissions}
                groups={groups} 
                onPermissionUpdated={refreshData} 
              />
            </TabPanel>
          </>
        )}
      </Box>

      {/* Dialogs */}
      <UserFormDialog 
        open={openUserDialog} 
        onClose={handleCloseUserDialog} 
        groups={groups}
        onUserSaved={() => {
          fetchUsers();
          setSnackbar({
            open: true,
            message: 'Utente salvato con successo',
            severity: 'success'
          });
        }}
      />
      
      <GroupFormDialog 
        open={openGroupDialog} 
        onClose={handleCloseGroupDialog}
        onGroupSaved={() => {
          fetchGroups();
          setSnackbar({
            open: true,
            message: 'Gruppo salvato con successo',
            severity: 'success'
          });
        }} 
      />

      {/* Snackbar per feedback */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Componente TabPanel
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default UserManagementContainer;