// src/components/modules/UserManagement/components/UserGroupsDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Avatar,
  Paper
} from '@mui/material';
import {
  Group as GroupIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useUserManagementStore } from '../stores/userManagementStore';

const UserGroupsDialog = ({ open, onClose, user, groups = [], onSave }) => {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Store actions
  const { updateUserGroups } = useUserManagementStore();
  
  // Initialize selected groups when user is provided
  useEffect(() => {
    if (user && user.groups) {
      const userGroupIds = Array.isArray(user.groups) 
        ? user.groups 
        : (typeof user.groups === 'string' ? user.groups.split(',').map(Number) : []);
      
      setSelectedGroups(userGroupIds);
    } else {
      setSelectedGroups([]);
    }
    
    // Reset errors and success
    setSubmitError('');
    setSubmitSuccess(false);
  }, [user, open]);
  
  // Handle toggle group selection
  const handleToggleGroup = (groupId) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
    
    // Reset success message
    setSubmitSuccess(false);
  };
  
  // Handle select all groups
  const handleSelectAll = () => {
    setSelectedGroups(groups.map(group => group.id));
    setSubmitSuccess(false);
  };
  
  // Handle clear all selections
  const handleClearAll = () => {
    setSelectedGroups([]);
    setSubmitSuccess(false);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    
    try {
      const result = await updateUserGroups(user.id, selectedGroups);
      
      if (result.success) {
        setSubmitSuccess(true);
        
        // Notify parent component
        if (onSave) {
          onSave();
        }
      } else {
        setSubmitError(result.error || 'Errore durante l\'aggiornamento dei gruppi');
      }
    } catch (error) {
      console.error('Error updating user groups:', error);
      setSubmitError('Errore di comunicazione con il server');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get initials for avatar
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ mr: 1 }} color="primary" />
          <Typography variant="h6">Gestione Gruppi Utente</Typography>
        </Box>
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
      
      <DialogContent dividers>
        {user && (
          <Box sx={{ mb: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: '1.5rem' }}>
                  {getInitials(user.full_name || user.username)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {user.full_name || user.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.username} • {user.email}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
        
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        
        {submitSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Gruppi aggiornati con successo!
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1">
            Seleziona i gruppi per questo utente
          </Typography>
          
          <Box>
            <Button size="small" onClick={handleSelectAll} sx={{ mr: 1 }}>
              Seleziona Tutti
            </Button>
            <Button size="small" onClick={handleClearAll}>
              Deseleziona Tutti
            </Button>
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Un utente può appartenere a più gruppi e otterrà tutti i permessi di ciascun gruppo. Se un utente non appartiene ad alcun gruppo, avrà accesso limitato.
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        <List>
          {groups.length > 0 ? (
            groups.map((group) => (
              <ListItem 
                key={group.id}
                button 
                onClick={() => handleToggleGroup(group.id)}
                divider
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedGroups.includes(group.id)}
                    tabIndex={-1}
                    disableRipple
                    color="primary"
                  />
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {group.name}
                      </Typography>
                      {selectedGroups.includes(group.id) && (
                        <Chip
                          label="Selezionato"
                          size="small"
                          color="primary"
                          variant="outlined"
                          icon={<CheckIcon />}
                        />
                      )}
                    </Box>
                  }
                  secondary={group.description}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="Nessun gruppo disponibile"
                secondary="Crea prima dei gruppi per poterli assegnare agli utenti"
              />
            </ListItem>
          )}
        </List>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Annulla
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Salva Gruppi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserGroupsDialog;