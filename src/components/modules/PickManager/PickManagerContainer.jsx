// src/components/modules/PickManager/PickManagerContainer.jsx

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button, 
  Paper,
  Tabs,
  Tab,
  Chip,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ViewList as ListIcon,
  Assignment as OrdersIcon,
  Error as ErrorIcon,
  ShoppingCart as CartIcon,
  Settings as SettingsIcon,
  Build as BuildIcon,
  LocalShipping as LocalShippingIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { usePickStore } from './stores/pickStore';
import OrdersPanel from './components/OrdersPanel';
import PickListTable from './components/PickListTable';
import SupplierManagementPanel from './components/SupplierManagementPanel';
import MaterialManagementPanel from './components/MaterialManagementPanel';
import ModuleManagementPanel from './components/ModuleManagementPanel';

// TabPanel component to render tab content
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pick-tabpanel-${index}`}
      aria-labelledby={`pick-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// ConfigTabPanel component for the nested configuration tabs
function ConfigTabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PickManagerContainer = () => {
  // Main tabs
  const [tabValue, setTabValue] = useState(0);
  // Config tabs (nested)
  const [configTabValue, setConfigTabValue] = useState(0);
  const [authError, setAuthError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dataInitialized, setDataInitialized] = useState(false);
  
  const { 
    isLoading,
    error,
    userRole,
    selectedOrders,
    refreshData,
    clearOrderSelection,
    posOrders,
    pickLists
  } = usePickStore();

  // Initial data loading - ONCE ONLY
  useEffect(() => {
    console.log("PickManagerContainer mounted - Initial data load");
    
    const initializeData = async () => {
      if (dataInitialized) return;
      
      try {
        setDataInitialized(true);
        const result = await refreshData();
        
        // Check for auth errors
        if (result && result.authError) {
          console.error("Authentication error detected");
          setAuthError(true);
          setSnackbarMessage("Authentication error: Please log in again");
          setSnackbarOpen(true);
        } else if (error && error.includes('Authentication')) {
          console.error("Authentication error in message:", error);
          setAuthError(true);
          setSnackbarMessage("Authentication error: Please log in again");
          setSnackbarOpen(true);
        }
      } catch (e) {
        console.error("Error during data initialization:", e);
        setSnackbarMessage(`Error: ${e.message}`);
        setSnackbarOpen(true);
      }
    };
    
    initializeData();
  }, []);

  // Handle main tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    clearOrderSelection();
  };

  // Handle config tab change
  const handleConfigTabChange = (event, newValue) => {
    setConfigTabValue(newValue);
  };

  // Handle retry after authentication error
  const handleRetry = () => {
    console.log("Retry button clicked, resetting state");
    setAuthError(false);
    setSnackbarMessage("Retrying connection...");
    setSnackbarOpen(true);
    refreshData();
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Show authentication error message
  if (authError) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <ErrorIcon color="error" sx={{ fontSize: 64 }} />
        <Typography variant="h5" color="error">Authentication Error</Typography>
        <Typography variant="body1" align="center" sx={{ maxWidth: 500, mb: 2 }}>
          Unable to authenticate with the server. You may need to log in again or your session may have expired.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleRetry}
          startIcon={<RefreshIcon />}
        >
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with title and actions */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">Picking List Manager</Typography>
          
          {/* Badge that shows if the user is a manager */}
          {userRole === 'manager' && (
            <Chip 
              label="Supervisor Mode" 
              color="primary" 
              size="small"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            disabled={isLoading}
          >
            Refresh
          </Button>
          
          {tabValue === 0 && selectedOrders.length > 0 && (
            <Button
              variant="contained"
              startIcon={<CartIcon />}
              color="success"
              onClick={() => {/* Handle create pick list */}}
            >
              Create Pick List ({selectedOrders.length})
            </Button>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && !authError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button 
            size="small" 
            color="inherit" 
            sx={{ ml: 2 }} 
            onClick={handleRetry}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Tab navigation */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab 
            label="POS Orders" 
            icon={<OrdersIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Pick List History" 
            icon={<ListIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Configuration" 
            icon={<SettingsIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Main content with tab panels */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {isLoading && !dataInitialized ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading data...
            </Typography>
          </Box>
        ) : (
          <>
            {/* POS Orders Tab */}
            <TabPanel value={tabValue} index={0}>
              <OrdersPanel key="orders-panel" onSelectTab={() => setTabValue(1)} />
            </TabPanel>
            
            {/* Pick Lists Tab */}
            <TabPanel value={tabValue} index={1}>
              <PickListTable key="picklist-table" />
            </TabPanel>
            
            {/* Configuration Tab - with nested tabs */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs 
                  value={configTabValue} 
                  onChange={handleConfigTabChange}
                  aria-label="configuration tabs"
                >
                  <Tab 
                    label="Suppliers" 
                    icon={<LocalShippingIcon />}
                    iconPosition="start"
                    id="config-tab-0"
                  />
                  <Tab 
                    label="Materials" 
                    icon={<CategoryIcon />}
                    iconPosition="start"
                    id="config-tab-1"
                  />
                  <Tab 
                    label="Modules" 
                    icon={<BuildIcon />}
                    iconPosition="start"
                    id="config-tab-2"
                  />
                </Tabs>
              </Box>

              {/* Supplier Management Tab */}
              <ConfigTabPanel value={configTabValue} index={0}>
                <SupplierManagementPanel key="supplier-panel" />
              </ConfigTabPanel>
              
              {/* Material Management Tab */}
              <ConfigTabPanel value={configTabValue} index={1}>
                <MaterialManagementPanel key="material-panel" />
              </ConfigTabPanel>
              
              {/* Module Management Tab */}
              <ConfigTabPanel value={configTabValue} index={2}>
                <ModuleManagementPanel key="module-panel" />
              </ConfigTabPanel>
            </TabPanel>
          </>
        )}
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default PickManagerContainer;
