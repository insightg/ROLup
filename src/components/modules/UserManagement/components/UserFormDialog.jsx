// src/components/modules/UserManagement/components/UserFormDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Divider,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useUserManagementStore } from '../stores/userManagementStore';

const UserFormDialog = ({ open, onClose, user = null, groups = [], onUserSaved, editMode = false }) => {
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    is_active: true,
    groups: []
  });
  
  // Validation state
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Store actions
  const { createUser, updateUser } = useUserManagementStore();
  
  // Initialize form data when user is provided (edit mode)
  useEffect(() => {
    if (editMode && user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        confirm_password: '',
        full_name: user.full_name || '',
        is_active: user.is_active ?? true,
        groups: Array.isArray(user.groups) 
          ? user.groups 
          : (typeof user.groups === 'string' ? user.groups.split(',').map(Number) : [])
      });
    } else {
      // Reset form for new user
      setFormData({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        full_name: '',
        is_active: true,
        groups: []
      });
    }
    
    // Reset errors
    setErrors({});
    setSubmitError('');
  }, [user, editMode, open]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Prepare data for submission
      const userData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        is_active: formData.is_active ? 1 : 0,
        groups: formData.groups
      };
      
      // Add password only if provided
      if (formData.password) {
        userData.password = formData.password;
      }
      
      let result;
      
      if (editMode && user) {
        // Update existing user
        result = await updateUser(user.id, userData);
      } else {
        // Create new user
        result = await createUser(userData);
      }
      
      if (result.success) {
        // Notify parent component
        if (onUserSaved) {
          onUserSaved(result.data);
        }
        
        // Close dialog
        onClose();
      } else {
        setSubmitError(result.error || 'Errore durante il salvataggio dell\'utente');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setSubmitError('Errore di comunicazione con il server');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.username) {
      errors.username = 'Nome utente obbligatorio';
    } else if (formData.username.length < 3) {
      errors.username = 'Nome utente troppo corto (min. 3 caratteri)';
    }
    
    if (!formData.email) {
      errors.email = 'Email obbligatoria';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email non valida';
    }
    
    // Password validation only for new users or if password is provided
    if (!editMode || formData.password) {
      if (!editMode && !formData.password) {
        errors.password = 'Password obbligatoria';
      } else if (formData.password && formData.password.length < 6) {
        errors.password = 'Password troppo corta (min. 6 caratteri)';
      }
      
      if (formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Le password non corrispondono';
      }
    }
    
    return errors;
  };
  
  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {editMode ? 'Modifica Utente' : 'Nuovo Utente'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                name="username"
                label="Nome utente"
                value={formData.username}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.username}
                helperText={errors.username}
                disabled={isSubmitting || (editMode && user?.username)}
                autoFocus={!editMode}
                margin="dense"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.email}
                helperText={errors.email}
                disabled={isSubmitting}
                margin="dense"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="password"
                label={editMode ? "Nuova password (lasciare vuoto per non modificare)" : "Password"}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                fullWidth
                required={!editMode}
                error={!!errors.password}
                helperText={errors.password}
                disabled={isSubmitting}
                margin="dense"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="confirm_password"
                label="Conferma password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={handleChange}
                fullWidth
                required={!editMode || !!formData.password}
                error={!!errors.confirm_password}
                helperText={errors.confirm_password}
                disabled={isSubmitting}
                margin="dense"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleToggleConfirmPasswordVisibility}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="full_name"
                label="Nome completo"
                value={formData.full_name}
                onChange={handleChange}
                fullWidth
                disabled={isSubmitting}
                margin="dense"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    color="primary"
                    disabled={isSubmitting}
                  />
                }
                label="Utente attivo"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <GroupIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Gruppi</Typography>
              </Box>
              
              <FormControl fullWidth margin="dense">
                <InputLabel id="groups-select-label">Assegna a gruppi</InputLabel>
                <Select
                  labelId="groups-select-label"
                  name="groups"
                  multiple
                  value={formData.groups}
                  onChange={handleChange}
                  label="Assegna a gruppi"
                  disabled={isSubmitting}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((groupId) => {
                        const group = groups.find(g => g.id === groupId);
                        return group ? (
                          <Tooltip title={group.description} key={groupId}>
                            <Typography variant="body2" component="span" sx={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'medium',
                              border: '1px solid',
                              borderColor: 'primary.main',
                              backgroundColor: 'primary.lightest',
                              color: 'primary.dark',
                              mr: 0.5
                            }}>
                              {group.name}
                            </Typography>
                          </Tooltip>
                        ) : null;
                      })}
                    </Box>
                  )}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      <Box
                        component="span"
                        sx={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        {group.name}
                        {group.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            {group.description.length > 30
                              ? `${group.description.slice(0, 30)}...`
                              : group.description}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={isSubmitting}
          >
            {editMode ? 'Aggiorna' : 'Crea'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserFormDialog;