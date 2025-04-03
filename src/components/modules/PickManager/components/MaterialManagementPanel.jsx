import React, { useState, useEffect } from 'react';
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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchMaterials as fetchMaterialsApi, fetchSuppliers as fetchSuppliersApi, saveMaterial as saveMaterialApi, deleteMaterial as deleteMaterialApi } from '../api/pickApi';

const MaterialManagementPanel = () => {
  // State for materials list
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState({
    id: null,
    supplier_id: '',
    article_code: '',
    description: '',
    unit_of_measure: 'PZ',
    unit_price: '',
    category: '',
    subcategory: '',
    notes: '',
    active: true
  });
  
  // State for notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Load materials and suppliers on component mount
  useEffect(() => {
    fetchMaterials();
    fetchSuppliers();
  }, []);
  
  // Fetch materials from API
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchMaterialsApi();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch materials');
      }
      
      setMaterials(data.data || []);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      const data = await fetchSuppliersApi();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch suppliers');
      }
      
      setSuppliers(data.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      // Don't show notification for this, as it's a secondary operation
    }
  };
  
  // Save material (create or update)
  const saveMaterial = async () => {
    try {
      // Validate form data
      if (!currentMaterial.supplier_id || !currentMaterial.article_code || !currentMaterial.description) {
        showNotification('Supplier, article code and description are required', 'error');
        return;
      }
      
      setLoading(true);
      
      // Create a clean copy of the material data
      const materialToSave = {
        ...currentMaterial,
        // Ensure numeric fields are properly formatted
        unit_price: currentMaterial.unit_price === '' || currentMaterial.unit_price === null 
            ? null 
            : parseFloat(currentMaterial.unit_price)
      };
      
      console.log('Saving material with data:', materialToSave);
      
      // Make API call to save material using the API module
      const data = await saveMaterialApi(materialToSave);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save material');
      }
      
      // Close dialog and show success message
      setDialogOpen(false);
      showNotification(currentMaterial.id ? 'Material updated successfully' : 'Material created successfully');
      
      // Refresh materials list
      fetchMaterials();
    } catch (err) {
      console.error('Error saving material:', err);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete material
  const deleteMaterial = async () => {
    if (!currentMaterial || !currentMaterial.id) return;
    
    try {
      setLoading(true);
      
      // Make API call to delete material using the API module
      const data = await deleteMaterialApi(currentMaterial.id);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete material');
      }
      
      // Close dialog and show success message
      setDeleteDialogOpen(false);
      showNotification('Material deleted successfully');
      
      // Refresh materials list
      fetchMaterials();
    } catch (err) {
      console.error('Error deleting material:', err);
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
  const handleAddMaterial = () => {
    setCurrentMaterial({
      id: null,
      supplier_id: '',
      article_code: '',
      description: '',
      unit_of_measure: 'PZ',
      unit_price: '',
      category: '',
      subcategory: '',
      notes: '',
      active: true
    });
    setDialogOpen(true);
  };
  
  // Handle opening edit dialog
  const handleEditMaterial = (material) => {
    // Make sure we have the correct data types
    const materialToEdit = {
      ...material,
      unit_price: material.unit_price || '',
      active: material.active === 1 || material.active === true
    };
    setCurrentMaterial(materialToEdit);
    setDialogOpen(true);
  };
  
  // Handle opening delete dialog
  const handleDeleteMaterial = (material) => {
    setCurrentMaterial(material);
    setDeleteDialogOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'active') {
      setCurrentMaterial(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'unit_price') {
      // For unit price, convert empty string to null
      setCurrentMaterial(prev => ({
        ...prev,
        [name]: value === '' ? null : value
      }));
    } else if (name === 'supplier_id') {
      // For supplier_id
      setCurrentMaterial(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setCurrentMaterial(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
  
  // Find supplier name by ID
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown';
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Material Management</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchMaterials}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAddMaterial}
          >
            Add Material
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
              <TableCell>Article Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No materials found
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>{material.article_code}</TableCell>
                  <TableCell>{material.description}</TableCell>
                  <TableCell>{material.supplier_name || getSupplierName(material.supplier_id)}</TableCell>
                  <TableCell>{material.unit_of_measure}</TableCell>
                  <TableCell>
                    {material.unit_price ? `€${parseFloat(material.unit_price).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>{material.category || '-'}</TableCell>
                  <TableCell>
                    {material.active === 1 || material.active === true ? (
                      <Alert severity="success" sx={{ py: 0 }}>Active</Alert>
                    ) : (
                      <Alert severity="error" sx={{ py: 0 }}>Inactive</Alert>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEditMaterial(material)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDeleteMaterial(material)}>
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
          {currentMaterial.id ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!currentMaterial.supplier_id}>
                <InputLabel>Supplier</InputLabel>
                <Select
                  name="supplier_id"
                  value={currentMaterial.supplier_id}
                  onChange={handleInputChange}
                  label="Supplier"
                >
                  <MenuItem value="">
                    <em>Select a supplier</em>
                  </MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="article_code"
                label="Article Code"
                value={currentMaterial.article_code}
                onChange={handleInputChange}
                fullWidth
                required
                error={!currentMaterial.article_code}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={currentMaterial.description}
                onChange={handleInputChange}
                fullWidth
                required
                error={!currentMaterial.description}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Unit of Measure</InputLabel>
                <Select
                  name="unit_of_measure"
                  value={currentMaterial.unit_of_measure}
                  onChange={handleInputChange}
                  label="Unit of Measure"
                >
                  <MenuItem value="PZ">Piece (PZ)</MenuItem>
                  <MenuItem value="KG">Kilogram (KG)</MenuItem>
                  <MenuItem value="MT">Meter (MT)</MenuItem>
                  <MenuItem value="LT">Liter (LT)</MenuItem>
                  <MenuItem value="BOX">Box (BOX)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                name="unit_price"
                label="Unit Price (€)"
                value={currentMaterial.unit_price}
                onChange={handleInputChange}
                fullWidth
                type="number"
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentMaterial.active === 1 || currentMaterial.active === true}
                    onChange={handleInputChange}
                    name="active"
                  />
                }
                label="Active"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="category"
                label="Category"
                value={currentMaterial.category || ''}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="subcategory"
                label="Subcategory"
                value={currentMaterial.subcategory || ''}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                value={currentMaterial.notes || ''}
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
            onClick={saveMaterial} 
            variant="contained" 
            disabled={loading || !currentMaterial.supplier_id || !currentMaterial.article_code || !currentMaterial.description}
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
            Are you sure you want to delete material "{currentMaterial.description}" ({currentMaterial.article_code})?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={deleteMaterial} variant="contained" color="error">
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

export default MaterialManagementPanel;