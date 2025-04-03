// src/components/modules/UserManagement/components/GroupFormDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useUserManagementStore } from '../stores/userManagementStore';

const GroupFormDialog = ({ open, onClose, group = null, onGroupSaved, editMode = false }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  // Validation state
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Store actions
  const { createGroup, updateGroup } = useUserManagementStore();
  
  // Initialize form data when group is provided (edit mode)
  useEffect(() => {
    if (editMode && group) {
      setFormData({
        name: group.name || '',
        description: group.description || ''
      });
    } else {
      // Reset form for new group
      setFormData({
        name: '',
        description: ''
      });
    }
    
    // Reset errors
    setErrors({});
    setSubmitError('');
  }, [group, editMode, open]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      const groupData = {
        name: formData.name,
        description: formData.description
      };
      
      let result;
      
      if (editMode && group) {
        // Update existing group
        result = await updateGroup(group.id, groupData);
      } else {
        // Create new group
        result = await createGroup(groupData);
      }
      
      if (result.success) {
        // Notify parent component
        if (onGroupSaved) {
          onGroupSaved(result.data);
        }
        
        // Close dialog
        onClose();
      } else {
        setSubmitError(result.error || 'Errore durante il salvataggio del gruppo');
      }
    } catch (error) {
      console.error('Error saving group:', error);
      setSubmitError('Errore di comunicazione con il server');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name) {
      errors.name = 'Nome gruppo obbligatorio';
    } else if (formData.name.length < 2) {
      errors.name = 'Nome gruppo troppo corto (min. 2 caratteri)';
    }
    
    return errors;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {editMode ? 'Modifica Gruppo' : 'Nuovo Gruppo'}
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
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              name="name"
              label="Nome gruppo"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
              disabled={isSubmitting}
              autoFocus={!editMode}
              margin="dense"
            />
            
            <TextField
              name="description"
              label="Descrizione"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              disabled={isSubmitting}
              margin="dense"
            />
          </Box>
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

export default GroupFormDialog;