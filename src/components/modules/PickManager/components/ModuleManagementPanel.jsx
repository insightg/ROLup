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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  Collapse,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Assignment as MaterialsIcon,
  ViewArray as ModuleIcon,
  WrapText as DimensionsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

// Module Materials Management component
const ModuleMaterialsPanel = ({ moduleId, moduleName, onMaterialsUpdated }) => {
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState({
    id: null,
    module_id: moduleId,
    material_id: '',
    quantity: 1,
    mandatory: true,
    installation_type: 'BOTH',
    notes: ''
  });
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch module materials when moduleId changes
  useEffect(() => {
    if (moduleId) {
      fetchModuleMaterials();
      fetchAvailableMaterials();
    }
  }, [moduleId]);

  // Fetch module materials
  const fetchModuleMaterials = async () => {
    if (!moduleId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl(`r_tsis_pick.php?action=getModuleMaterials&module_id=${moduleId}`));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch module materials');
      }
      
      setMaterials(data.data || []);
    } catch (err) {
      console.error('Error fetching module materials:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available materials
  const fetchAvailableMaterials = async () => {
    try {
      const response = await fetch(getApiUrl('r_tsis_pick.php?action=getMaterials'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch available materials');
      }
      
      setAvailableMaterials(data.data || []);
    } catch (err) {
      console.error('Error fetching available materials:', err);
    }
  };

  // Save module material assignment
  const saveModuleMaterial = async () => {
    try {
      if (!currentMaterial.material_id || !currentMaterial.quantity) {
        showNotification('Material and quantity are required', 'error');
        return;
      }
      
      setLoading(true);
      
      // Prepare the material with correct module_id
      const materialData = {
        ...currentMaterial,
        module_id: moduleId
      };
      
      // Make API call to save module material
      const response = await fetch(getApiUrl('r_tsis_pick.php?action=saveModuleMaterial'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(materialData)
      });
      
      console.log('Save module material API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('API response text:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save module material');
      }
      
      // Close dialog and show success message
      setDialogOpen(false);
      showNotification(currentMaterial.id ? 'Material assignment updated successfully' : 'Material assignment added successfully');
      
      // Refresh materials list
      fetchModuleMaterials();
      if (onMaterialsUpdated) onMaterialsUpdated();
    } catch (err) {
      console.error('Error saving module material:', err);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete module material assignment
  const deleteModuleMaterial = async (materialId) => {
    try {
      setLoading(true);
      
      // Make API call to delete module material
      const response = await fetch(getApiUrl('r_tsis_pick.php?action=deleteModuleMaterial'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ id: materialId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete module material');
      }
      
      // Show success message
      showNotification('Material assignment removed successfully');
      
      // Refresh materials list
      fetchModuleMaterials();
      if (onMaterialsUpdated) onMaterialsUpdated();
    } catch (err) {
      console.error('Error deleting module material:', err);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    
    setCurrentMaterial(prev => ({
      ...prev,
      [name]: name === 'mandatory' ? checked : value
    }));
  };

  // Open add dialog
  const handleAddMaterial = () => {
    setCurrentMaterial({
      id: null,
      module_id: moduleId,
      material_id: '',
      quantity: 1,
      mandatory: true,
      installation_type: 'BOTH',
      notes: ''
    });
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEditMaterial = (material) => {
    setCurrentMaterial({
      ...material,
      mandatory: material.mandatory === 1 || material.mandatory === true
    });
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setDialogOpen(false);
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

  // Get material details by ID
  const getMaterialDetails = (materialId) => {
    return availableMaterials.find(m => m.id === materialId) || {};
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          <MaterialsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Materials for Module: <strong>{moduleName}</strong>
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchModuleMaterials}
            sx={{ mr: 1 }}
            size="small"
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAddMaterial}
            size="small"
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
      
      <TableContainer component={Paper} sx={{ maxHeight: '40vh', overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell>Installation Type</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Mandatory</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No materials assigned to this module
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>
                    <Typography variant="body2">
                      {material.material_description || getMaterialDetails(material.material_id).description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {material.material_code || getMaterialDetails(material.material_id).article_code} - {material.supplier_name || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      label={material.installation_type || 'BOTH'} 
                      color={
                        material.installation_type === 'WALL' ? 'primary' :
                        material.installation_type === 'FLOOR' ? 'secondary' :
                        'default'
                      } 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>{material.quantity}</TableCell>
                  <TableCell>
                    {material.mandatory === 1 || material.mandatory === true ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEditMaterial(material)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => deleteModuleMaterial(material.id)}>
                        <DeleteIcon fontSize="small" />
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentMaterial.id ? 'Edit Material Assignment' : 'Add Material to Module'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required error={!currentMaterial.material_id}>
                <InputLabel>Material</InputLabel>
                <Select
                  name="material_id"
                  value={currentMaterial.material_id}
                  onChange={handleInputChange}
                  label="Material"
                >
                  <MenuItem value="">
                    <em>Select a material</em>
                  </MenuItem>
                  {availableMaterials.map((material) => (
                    <MenuItem key={material.id} value={material.id}>
                      {material.article_code} - {material.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="quantity"
                label="Quantity"
                value={currentMaterial.quantity}
                onChange={handleInputChange}
                fullWidth
                required
                type="number"
                inputProps={{ min: 1 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Installation Type</InputLabel>
                <Select
                  name="installation_type"
                  value={currentMaterial.installation_type}
                  onChange={handleInputChange}
                  label="Installation Type"
                >
                  <MenuItem value="BOTH">Both (Wall & Floor)</MenuItem>
                  <MenuItem value="WALL">Wall Only</MenuItem>
                  <MenuItem value="FLOOR">Floor Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentMaterial.mandatory === 1 || currentMaterial.mandatory === true}
                    onChange={handleInputChange}
                    name="mandatory"
                  />
                }
                label="Mandatory material (required for installation)"
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
            onClick={saveModuleMaterial} 
            variant="contained" 
            disabled={loading || !currentMaterial.material_id || !currentMaterial.quantity}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
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

// Main Module Management Panel
const ModuleManagementPanel = () => {
    // State for modules list
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // State for dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [currentModule, setCurrentModule] = useState({
      id: null,
      code: '',
      name: '',
      width: 0,
      height: 0,
      depth: 0,
      installation_type: 'BOTH',
      description: '',
      active: true
    });
    
    // State for notification
    const [notification, setNotification] = useState({
      open: false,
      message: '',
      severity: 'success'
    });
    
    // State for tracking expanded modules for materials
    const [expandedModuleId, setExpandedModuleId] = useState(null);
    
    // Load modules on component mount
    useEffect(() => {
      fetchModules();
    }, []);
    
    // Fetch modules from API
    const fetchModules = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Make API call to get modules
        const response = await fetch(getApiUrl('r_tsis_pick.php?action=getModules'));
        
        // Debug response
        console.log('Fetch modules API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        
        // Debug response text
        console.log('API response text length:', text.length);
        
        // Try to parse JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('JSON parse error:', e);
          throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch modules');
        }
        
        setModules(data.data || []);
      } catch (err) {
        console.error('Error fetching modules:', err);
        setError(err.message);
        showNotification(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    // Save module (create or update)
    const saveModule = async () => {
      try {
        // Validate form data
        if (!currentModule.code || !currentModule.name || 
            !currentModule.width || !currentModule.height) {
          showNotification('Code, name, width and height are required', 'error');
          return;
        }
        
        setLoading(true);
        
        // Make API call to save module
        const response = await fetch(getApiUrl('r_tsis_pick.php?action=saveModule'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(currentModule)
        });
        
        // Debug response
        console.log('Save module API response status:', response.status);
        
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
          throw new Error(data.error || 'Failed to save module');
        }
        
        // Close dialog and show success message
        setDialogOpen(false);
        showNotification(currentModule.id ? 'Module updated successfully' : 'Module created successfully');
        
        // Refresh modules list
        fetchModules();
        
        // If this was a new module, expand it after creation to show materials
        if (!currentModule.id && data.id) {
          setExpandedModuleId(data.id);
        }
      } catch (err) {
        console.error('Error saving module:', err);
        showNotification(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    // Delete module
    const deleteModule = async () => {
      if (!currentModule || !currentModule.id) return;
      
      try {
        setLoading(true);
        
        // Make API call to delete module
        const response = await fetch(getApiUrl('r_tsis_pick.php?action=deleteModule'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ id: currentModule.id })
        });
        
        // Debug response
        console.log('Delete module API response status:', response.status);
        
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
          throw new Error(data.error || 'Failed to delete module');
        }
        
        // Close dialog and show success message
        setDeleteDialogOpen(false);
        showNotification('Module deleted successfully');
        
        // Refresh modules list
        fetchModules();
        
        // If we deleted the currently expanded module, collapse it
        if (expandedModuleId === currentModule.id) {
          setExpandedModuleId(null);
        }
      } catch (err) {
        console.error('Error deleting module:', err);
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
    const handleAddModule = () => {
      setCurrentModule({
        id: null,
        code: '',
        name: '',
        width: 0,
        height: 0,
        depth: 0,
        installation_type: 'BOTH',
        description: '',
        active: true
      });
      setDialogOpen(true);
    };
    
    // Handle opening edit dialog
    const handleEditModule = (e, module) => {
      e.stopPropagation(); // Prevent row click from toggling expansion
      setCurrentModule({
        ...module,
        active: module.active === 1 || module.active === true
      });
      setDialogOpen(true);
    };
    
    // Handle opening delete dialog
    const handleDeleteModule = (e, module) => {
      e.stopPropagation(); // Prevent row click from toggling expansion
      setCurrentModule(module);
      setDeleteDialogOpen(true);
    };
    
    // Handle form input changes
    const handleInputChange = (e) => {
      const { name, value, checked } = e.target;
      
      if (name === 'active') {
        setCurrentModule(prev => ({
          ...prev,
          [name]: checked
        }));
      } else if (name === 'width' || name === 'height' || name === 'depth') {
        // For numeric fields
        setCurrentModule(prev => ({
          ...prev,
          [name]: parseFloat(value) || 0
        }));
      } else {
        setCurrentModule(prev => ({
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
    
    // Toggle module expansion to show/hide materials
    const toggleModuleExpansion = (moduleId) => {
      setExpandedModuleId(expandedModuleId === moduleId ? null : moduleId);
    };
    
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Module Management</Typography>
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={fetchModules}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleAddModule}
            >
              Add Module
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
                <TableCell width="5%"></TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Dimensions</TableCell>
                <TableCell>Installation Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && modules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : modules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No modules found
                  </TableCell>
                </TableRow>
              ) : (
                modules.map((module) => (
                  <React.Fragment key={module.id}>
                    <TableRow 
                      hover 
                      onClick={() => toggleModuleExpansion(module.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleModuleExpansion(module.id);
                          }}
                        >
                          {expandedModuleId === module.id ? 
                            <ExpandLessIcon /> : 
                            <ExpandMoreIcon />
                          }
                        </IconButton>
                      </TableCell>
                      <TableCell>{module.code}</TableCell>
                      <TableCell>{module.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DimensionsIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {module.width} × {module.height} {module.depth > 0 ? `× ${module.depth}` : ''} cm
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={module.installation_type || 'BOTH'} 
                          color={
                            module.installation_type === 'WALL' ? 'primary' :
                            module.installation_type === 'FLOOR' ? 'secondary' :
                            'default'
                          } 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        {module.active === 1 || module.active === true ? (
                          <Alert severity="success" sx={{ py: 0 }}>Active</Alert>
                        ) : (
                          <Alert severity="error" sx={{ py: 0 }}>Inactive</Alert>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton onClick={(e) => handleEditModule(e, module)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton color="error" onClick={(e) => handleDeleteModule(e, module)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expandable row for materials */}
                    <TableRow>
                      <TableCell style={{ padding: 0 }} colSpan={7}>
                        <Collapse in={expandedModuleId === module.id} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 3, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                            <ModuleMaterialsPanel 
                              moduleId={module.id} 
                              moduleName={module.name}
                              onMaterialsUpdated={fetchModules} 
                            />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {currentModule.id ? 'Edit Module' : 'Add New Module'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="code"
                  label="Module Code"
                  value={currentModule.code}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!currentModule.code}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="name"
                  label="Module Name"
                  value={currentModule.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!currentModule.name}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="width"
                  label="Width (cm)"
                  value={currentModule.width}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  type="number"
                  inputProps={{ min: 0, step: 0.1 }}
                  error={!currentModule.width}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="height"
                  label="Height (cm)"
                  value={currentModule.height}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  type="number"
                  inputProps={{ min: 0, step: 0.1 }}
                  error={!currentModule.height}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="depth"
                  label="Depth (cm)"
                  value={currentModule.depth}
                  onChange={handleInputChange}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText="Optional"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Installation Type</InputLabel>
                  <Select
                    name="installation_type"
                    value={currentModule.installation_type}
                    onChange={handleInputChange}
                    label="Installation Type"
                  >
                    <MenuItem value="BOTH">Both (Wall & Floor)</MenuItem>
                    <MenuItem value="WALL">Wall Only</MenuItem>
                    <MenuItem value="FLOOR">Floor Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentModule.active === 1 || currentModule.active === true}
                      onChange={handleInputChange}
                      name="active"
                    />
                  }
                  label="Active"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  value={currentModule.description || ''}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={saveModule} 
              variant="contained" 
              disabled={loading || !currentModule.code || !currentModule.name || !currentModule.width || !currentModule.height}
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
              Are you sure you want to delete module "{currentModule.name}" ({currentModule.code})?
              This action cannot be undone and will remove all material assignments.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={deleteModule} variant="contained" color="error">
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
  
  export default ModuleManagementPanel;