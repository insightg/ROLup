// src/components/modules/PickManager/components/POSConfigDialog.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  ShoppingBag as ShoppingBagIcon
} from '@mui/icons-material';
import { usePickStore } from '../stores/pickStore';
import {
  fetchPOSOrderDetails,
  fetchPOSModules,
  fetchPOSCustomMaterials,
  savePOSModule,
  savePOSCustomMaterial,
  deletePOSModule,
  deletePOSCustomMaterial
} from '../api/pickApi';

// TabPanel component to render tab content
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const POSConfigDialog = ({ open, onClose, orderId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [posModules, setPOSModules] = useState([]);
  const [customMaterials, setCustomMaterials] = useState([]);
  
  // New module form state
  const [newModule, setNewModule] = useState({
    module_id: '',
    quantity: 1,
    installation_type: 'FLOOR',
    position: '',
    notes: ''
  });
  
  // New custom material form state
  const [newMaterial, setNewMaterial] = useState({
    supplier_id: '',
    article_code: '',
    description: '',
    quantity: 1,
    unit_of_measure: 'PZ',
    unit_price: '',
    notes: ''
  });
  
  // Edit states
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  
  const { modules, materials, suppliers, loadModules, loadMaterials, loadSuppliers } = usePickStore();

  // Load data when dialog opens with an order ID
  useEffect(() => {
    if (open && orderId) {
      loadData();
    }
  }, [open, orderId]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setTabValue(0);
      setError(null);
      setOrderDetails(null);
      setPOSModules([]);
      setCustomMaterials([]);
      setEditingModuleId(null);
      setEditingMaterialId(null);
      resetForms();
    }
  }, [open]);

  // Load all necessary data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load reference data if not already loaded
      if (modules.length === 0) {
        await loadModules();
      }
      
      if (materials.length === 0) {
        await loadMaterials();
      }
      
      if (suppliers.length === 0) {
        await loadSuppliers();
      }
      
      // Load order-specific data
      const [orderDetailsResponse, posModulesResponse, customMaterialsResponse] = await Promise.all([
        fetchPOSOrderDetails(orderId),
        fetchPOSModules(orderId),
        fetchPOSCustomMaterials(orderId)
      ]);
      
      if (orderDetailsResponse.success) {
        setOrderDetails(orderDetailsResponse.data);
      } else {
        setError(orderDetailsResponse.error || 'Error loading order details');
      }
      
      if (posModulesResponse.success) {
        setPOSModules(posModulesResponse.data);
      } else {
        setError(posModulesResponse.error || 'Error loading POS modules');
      }
      
      if (customMaterialsResponse.success) {
        setCustomMaterials(customMaterialsResponse.data);
      } else {
        setError(customMaterialsResponse.error || 'Error loading custom materials');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error in communication with server');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form states
  const resetForms = () => {
    setNewModule({
      module_id: '',
      quantity: 1,
      installation_type: 'FLOOR',
      position: '',
      notes: ''
    });
    
    setNewMaterial({
      supplier_id: '',
      article_code: '',
      description: '',
      quantity: 1,
      unit_of_measure: 'PZ',
      unit_price: '',
      notes: ''
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle module form changes
  const handleModuleChange = (e) => {
    const { name, value } = e.target;
    setNewModule(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle custom material form changes
  const handleMaterialChange = (e) => {
    const { name, value } = e.target;
    setNewMaterial(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save module
  const handleSaveModule = async () => {
    if (!newModule.module_id) {
      setError('Please select a module');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const moduleData = {
        ...newModule,
        pos_order_id: orderId
      };
      
      if (editingModuleId) {
        moduleData.id = editingModuleId;
      }
      
      const response = await savePOSModule(moduleData);
      
      if (response.success) {
        // Reload modules
        const modulesResponse = await fetchPOSModules(orderId);
        if (modulesResponse.success) {
          setPOSModules(modulesResponse.data);
        }
        
        // Reset form
        resetForms();
        setEditingModuleId(null);
      } else {
        setError(response.error || 'Error saving module');
      }
    } catch (error) {
      console.error('Error saving module:', error);
      setError('Error in communication with server');
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom material
  const handleSaveMaterial = async () => {
    if (!newMaterial.description) {
      setError('Description is required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const materialData = {
        ...newMaterial,
        pos_order_id: orderId
      };
      
      if (editingMaterialId) {
        materialData.id = editingMaterialId;
      }
      
      const response = await savePOSCustomMaterial(materialData);
      
      if (response.success) {
        // Reload materials
        const materialsResponse = await fetchPOSCustomMaterials(orderId);
        if (materialsResponse.success) {
          setCustomMaterials(materialsResponse.data);
        }
        
        // Reset form
        resetForms();
        setEditingMaterialId(null);
      } else {
        setError(response.error || 'Error saving material');
      }
    } catch (error) {
      console.error('Error saving material:', error);
      setError('Error in communication with server');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete module
  const handleDeleteModule = async (id) => {
    try {
      setIsLoading(true);
      
      const response = await deletePOSModule(id);
      
      if (response.success) {
        // Reload modules
        const modulesResponse = await fetchPOSModules(orderId);
        if (modulesResponse.success) {
          setPOSModules(modulesResponse.data);
        }
      } else {
        setError(response.error || 'Error deleting module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      setError('Error in communication with server');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete custom material
  const handleDeleteMaterial = async (id) => {
    try {
      setIsLoading(true);
      
      const response = await deletePOSCustomMaterial(id);
      
      if (response.success) {
        // Reload materials
        const materialsResponse = await fetchPOSCustomMaterials(orderId);
        if (materialsResponse.success) {
          setCustomMaterials(materialsResponse.data);
        }
      } else {
        setError(response.error || 'Error deleting material');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      setError('Error in communication with server');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit module
  const handleEditModule = (module) => {
    setEditingModuleId(module.id);
    setNewModule({
      module_id: module.module_id,
      quantity: module.quantity,
      installation_type: module.installation_type,
      position: module.position || '',
      notes: module.notes || ''
    });
    setTabValue(0);
  };

  // Edit custom material
  const handleEditMaterial = (material) => {
    setEditingMaterialId(material.id);
    setNewMaterial({
      supplier_id: material.supplier_id || '',
      article_code: material.article_code || '',
      description: material.description,
      quantity: material.quantity,
      unit_of_measure: material.unit_of_measure,
      unit_price: material.unit_price || '',
      notes: material.notes || ''
    });
    setTabValue(1);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    resetForms();
    setEditingModuleId(null);
    setEditingMaterialId(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="pos-config-dialog-title"
    >
      <DialogTitle id="pos-config-dialog-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Configure POS Modules
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {/* Order details header */}
            {orderDetails && (
              <Box sx={{ mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {orderDetails.pos_name}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Order ID: <strong>{orderDetails.id}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Activity: <strong>{orderDetails.tipo_attivita_desc}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Territory: <strong>{orderDetails.sf_territory}</strong>
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={8}>
                      <Typography variant="body2" color="text.secondary">
                        Address: <strong>{orderDetails.indirizzo_spedizioni}, {orderDetails.citt_spedizioni}, {orderDetails.cap_spedizioni}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Segment: <strong>{orderDetails.rrp_segment}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        PM: <strong>{orderDetails.pm_full_name || 'Not assigned'}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
            
            {/* Configuration tabs */}
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="configuration tabs">
                  <Tab label="Modules" id="config-tab-0" />
                  <Tab label="Custom Materials" id="config-tab-1" />
                </Tabs>
              </Box>
              
              {/* Modules tab */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  {/* Module list */}
                  <Grid item xs={12} md={7}>
                    <Typography variant="h6" gutterBottom>
                      Configured Modules
                    </Typography>
                    
                    {posModules.length === 0 ? (
                      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                        <ShoppingBagIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">
                          No modules configured yet. Add a module using the form on the right.
                        </Typography>
                      </Paper>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Module</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell align="center">Qty</TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {posModules.map((module) => (
                            <TableRow key={module.id}>
                              <TableCell>
                                <Typography variant="body2">{module.module_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {module.width}×{module.height}×{module.depth} mm
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={module.installation_type} 
                                  size="small"
                                  color={module.installation_type === 'FLOOR' ? 'primary' : 'secondary'}
                                />
                              </TableCell>
                              <TableCell align="center">{module.quantity}</TableCell>
                              <TableCell>{module.position}</TableCell>
                              <TableCell>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditModule(module)}
                                  color="primary"
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeleteModule(module.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Grid>
                  
                  {/* Module form */}
                  <Grid item xs={12} md={5}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {editingModuleId ? 'Edit Module' : 'Add Module'}
                      </Typography>
                      
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="module-select-label">Module Type</InputLabel>
                        <Select
                          labelId="module-select-label"
                          id="module-select"
                          name="module_id"
                          value={newModule.module_id}
                          label="Module Type"
                          onChange={handleModuleChange}
                        >
                          <MenuItem value="">
                            <em>Select a module</em>
                          </MenuItem>
                          {modules.map((module) => (
                            <MenuItem key={module.id} value={module.id}>
                              {module.name} ({module.width}×{module.height} mm)
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="installation-type-label">Installation Type</InputLabel>
                        <Select
                          labelId="installation-type-label"
                          id="installation-type"
                          name="installation_type"
                          value={newModule.installation_type}
                          label="Installation Type"
                          onChange={handleModuleChange}
                        >
                          <MenuItem value="FLOOR">FLOOR</MenuItem>
                          <MenuItem value="WALL">WALL</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="quantity"
                        name="quantity"
                        label="Quantity"
                        type="number"
                        value={newModule.quantity}
                        onChange={handleModuleChange}
                        InputProps={{ inputProps: { min: 1 } }}
                      />
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="position"
                        name="position"
                        label="Position (optional)"
                        value={newModule.position}
                        onChange={handleModuleChange}
                      />
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="notes"
                        name="notes"
                        label="Notes (optional)"
                        multiline
                        rows={2}
                        value={newModule.notes}
                        onChange={handleModuleChange}
                      />
                      
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        {editingModuleId && (
                          <Button
                            variant="outlined"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={editingModuleId ? <SaveIcon /> : <AddIcon />}
                          onClick={handleSaveModule}
                          disabled={!newModule.module_id}
                        >
                          {editingModuleId ? 'Update Module' : 'Add Module'}
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>
              
              {/* Custom Materials tab */}
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  {/* Materials list */}
                  <Grid item xs={12} md={7}>
                    <Typography variant="h6" gutterBottom>
                      Custom Materials
                    </Typography>
                    
                    {customMaterials.length === 0 ? (
                      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                        <ShoppingBagIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">
                          No custom materials added yet. Add materials using the form on the right.
                        </Typography>
                      </Paper>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell>Supplier</TableCell>
                            <TableCell align="center">Qty</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customMaterials.map((material) => (
                            <TableRow key={material.id}>
                              <TableCell>
                                <Typography variant="body2">{material.description}</Typography>
                                {material.article_code && (
                                  <Typography variant="caption" color="text.secondary">
                                    Code: {material.article_code}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>{material.supplier_name || 'N/A'}</TableCell>
                              <TableCell align="center">
                                {material.quantity} {material.unit_of_measure}
                              </TableCell>
                              <TableCell>
                                {material.unit_price ? 
                                  new Intl.NumberFormat('it-IT', { 
                                    style: 'currency', 
                                    currency: 'EUR' 
                                  }).format(material.unit_price) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditMaterial(material)}
                                  color="primary"
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeleteMaterial(material.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Grid>
                  
                  {/* Material form */}
                  <Grid item xs={12} md={5}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {editingMaterialId ? 'Edit Custom Material' : 'Add Custom Material'}
                      </Typography>
                      
                      <TextField
                        fullWidth
                        required
                        margin="normal"
                        id="description"
                        name="description"
                        label="Description"
                        value={newMaterial.description}
                        onChange={handleMaterialChange}
                      />
                      
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="supplier-select-label">Supplier (optional)</InputLabel>
                        <Select
                          labelId="supplier-select-label"
                          id="supplier-select"
                          name="supplier_id"
                          value={newMaterial.supplier_id}
                          label="Supplier (optional)"
                          onChange={handleMaterialChange}
                        >
                          <MenuItem value="">
                            <em>No supplier</em>
                          </MenuItem>
                          {suppliers.map((supplier) => (
                            <MenuItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="article_code"
                        name="article_code"
                        label="Article Code (optional)"
                        value={newMaterial.article_code}
                        onChange={handleMaterialChange}
                      />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            margin="normal"
                            id="quantity"
                            name="quantity"
                            label="Quantity"
                            type="number"
                            value={newMaterial.quantity}
                            onChange={handleMaterialChange}
                            InputProps={{ inputProps: { min: 0.01, step: 0.01 } }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth margin="normal">
                            <InputLabel id="uom-label">Unit</InputLabel>
                            <Select
                              labelId="uom-label"
                              id="unit_of_measure"
                              name="unit_of_measure"
                              value={newMaterial.unit_of_measure}
                              label="Unit"
                              onChange={handleMaterialChange}
                            >
                              <MenuItem value="PZ">PZ</MenuItem>
                              <MenuItem value="M">M</MenuItem>
                              <MenuItem value="KG">KG</MenuItem>
                              <MenuItem value="L">L</MenuItem>
                              <MenuItem value="SET">SET</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="unit_price"
                        name="unit_price"
                        label="Unit Price (optional)"
                        type="number"
                        value={newMaterial.unit_price}
                        onChange={handleMaterialChange}
                        InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                      />
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="notes"
                        name="notes"
                        label="Notes (optional)"
                        multiline
                        rows={2}
                        value={newMaterial.notes}
                        onChange={handleMaterialChange}
                      />
                      
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        {editingMaterialId && (
                          <Button
                            variant="outlined"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={editingMaterialId ? <SaveIcon /> : <AddIcon />}
                          onClick={handleSaveMaterial}
                          disabled={!newMaterial.description}
                        >
                          {editingMaterialId ? 'Update Material' : 'Add Material'}
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default POSConfigDialog;