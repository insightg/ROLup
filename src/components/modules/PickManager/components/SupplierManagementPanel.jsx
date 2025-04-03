import React, { useState, useEffect } from 'react';

// Helper function for creating backend API URLs
const getApiUrl = (endpoint) => `/backend/${endpoint}`;
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Switch,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const SupplierManagementPanel = () => {
  // State for suppliers list
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState({
    id: null,
    name: '',
    code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    active: true
  });
  
  // State for notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make API call to get suppliers
      const response = await fetch(getApiUrl('r_tsis_pick.php?action=getSuppliers'));
      
      // Debug response
      console.log('Fetch suppliers API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Debug response text
      console.log('API response text:', text);
      
      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch suppliers');
      }
      
      setSuppliers(data.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Save supplier (create or update)
  const saveSupplier = async () => {
    try {
      // Validate form data
      if (!currentSupplier.name || !currentSupplier.code) {
        showNotification('Name and code are required', 'error');
        return;
      }
      
      setLoading(true);
      
      // Prepare request data
      const requestData = {
        action: 'saveSupplier',
        ...currentSupplier
      };
      
      // Log request data for debugging
      console.log('Saving supplier with data:', requestData);
      
      // Make API call to save supplier
      const response = await fetch(getApiUrl('r_tsis_pick.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(requestData)
      });
      
      // Debug response
      console.log('Save supplier API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Debug response text
      console.log('API response text:', text);
      
      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save supplier');
      }
      
      // Close dialog and show success message
      setDialogOpen(false);
      showNotification(currentSupplier.id ? 'Supplier updated successfully' : 'Supplier created successfully');
      
      // Refresh suppliers list
      fetchSuppliers();
    } catch (err) {
      console.error('Error saving supplier:', err);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete supplier
  const deleteSupplier = async () => {
    if (!currentSupplier || !currentSupplier.id) return;
    
    try {
      setLoading(true);
      
      // Prepare request data
      const requestData = {
        action: 'deleteSupplier',
        id: currentSupplier.id
      };
      
      // Log request data for debugging
      console.log('Deleting supplier with data:', requestData);
      
      // Make API call to delete supplier
      const response = await fetch(getApiUrl('r_tsis_pick.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(requestData)
      });
      
      // Debug response
      console.log('Delete supplier API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Debug response text
      console.log('API response text:', text);
      
      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete supplier');
      }
      
      // Close dialog and show success message
      setDeleteDialogOpen(false);
      showNotification('Supplier deleted successfully');
      
      // Refresh suppliers list
      fetchSuppliers();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle dialog close
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDeleteDialogOpen(false);
  };
  
  // Handle opening add dialog
  const handleAddSupplier = () => {
    setCurrentSupplier({
      id: null,
      name: '',
      code: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      active: true
    });
    setDialogOpen(true);
  };
  
  // Handle opening edit dialog
  const handleEditSupplier = (supplier) => {
    setCurrentSupplier({ ...supplier });
    setDialogOpen(true);
  };
  
  // Handle opening delete dialog
  const handleDeleteSupplier = (supplier) => {
    setCurrentSupplier(supplier);
    setDeleteDialogOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setCurrentSupplier(prev => ({
      ...prev,
      [name]: name === 'active' ? checked : value
    }));
  };
  
  // Show notification
  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Supplier Management</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchSuppliers}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAddSupplier}
          >
            Add Supplier
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <TableContainer component={Paper} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No suppliers found
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.code}</TableCell>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_person || '-'}</TableCell>
                  <TableCell>{supplier.email || '-'}</TableCell>
                  <TableCell>{supplier.phone || '-'}</TableCell>
                  <TableCell>
                    {supplier.active === 1 || supplier.active === true ? (
                      <Alert severity="success" sx={{ py: 0 }}>Active</Alert>
                    ) : (
                      <Alert severity="error" sx={{ py: 0 }}>Inactive</Alert>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEditSupplier(supplier)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDeleteSupplier(supplier)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Supplier Name"
                value={currentSupplier.name}
                onChange={handleInputChange}
                fullWidth
                required
                error={!currentSupplier.name}
                helperText={!currentSupplier.name ? 'Name is required' : ''}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="code"
                label="Supplier Code"
                value={currentSupplier.code}
                onChange={handleInputChange}
                fullWidth
                required
                error={!currentSupplier.code}
                helperText={!currentSupplier.code ? 'Code is required' : ''}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="contact_person"
                label="Contact Person"
                value={currentSupplier.contact_person || ''}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="Email"
                value={currentSupplier.email || ''}
                onChange={handleInputChange}
                fullWidth
                type="email"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="phone"
                label="Phone"
                value={currentSupplier.phone || ''}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentSupplier.active === 1 || currentSupplier.active === true}
                    onChange={handleInputChange}
                    name="active"
                  />
                }
                label="Active"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Address"
                value={currentSupplier.address || ''}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={saveSupplier} 
            variant="contained" 
            disabled={loading || !currentSupplier.name || !currentSupplier.code}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete supplier "{currentSupplier.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={deleteSupplier} variant="contained" color="error">
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplierManagementPanel;