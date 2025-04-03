import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';

// Helper function for creating backend API URLs
const getApiUrl = (endpoint) => `/backend/${endpoint}`;

const GroupManagement = () => {
  const { hasPermission } = useAuth();
  const [groups, setGroups] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stato per il form gruppo
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [groupFormMode, setGroupFormMode] = useState('create'); // 'create' o 'edit'
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Stato per il dialog di conferma eliminazione
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  
  // Stato per visualizzazione utenti del gruppo
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [groupUsers, setGroupUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Carica gruppi e voci di menu
  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl('users.php?action=getGroups'), {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setGroups(data.groups);
      } else {
        setError(data.error || 'Failed to load groups');
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const response = await fetch(getApiUrl('users.php?action=getMenuItems'), {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMenuItems(data.menuItems);
      } else {
        console.error('Failed to load menu items:', data.error);
      }
    } catch (err) {
      console.error('Error loading menu items:', err);
    }
  };

  // Carica i dati all'avvio
  useEffect(() => {
    loadGroups();
    loadMenuItems();
  }, []);

  // Carica i dettagli di un gruppo specifico
  const loadGroupDetails = async (groupId) => {
    try {
      const response = await fetch(getApiUrl(`users.php?action=getGroup&id=${groupId}`), {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.group;
      } else {
        console.error('Failed to load group details:', data.error);
        return null;
      }
    } catch (err) {
      console.error('Error loading group details:', err);
      return null;
    }
  };

  // Gestione form gruppo
  const handleOpenGroupForm = async (mode, group = null) => {
    setGroupFormMode(mode);
    
    if (mode === 'edit' && group) {
      // Per la modifica, carichiamo i dati dettagliati del gruppo
      setFormSubmitting(true);
      const groupDetails = await loadGroupDetails(group.id);
      setFormSubmitting(false);
      
      if (groupDetails) {
        setCurrentGroup(groupDetails);
        setGroupForm({
          name: groupDetails.name,
          description: groupDetails.description || '',
          permissions: groupDetails.permissions.map(p => ({
            menu_id: p.menu_id,
            can_view: p.can_view === 1,
            can_edit: p.can_edit === 1
          }))
        });
      } else {
        // Fallback se non riusciamo a caricare i dettagli
        setCurrentGroup(group);
        setGroupForm({
          name: group.name,
          description: group.description || '',
          permissions: []
        });
      }
    } else {
      // Per la creazione, reset del form
      setCurrentGroup(null);
      setGroupForm({
        name: '',
        description: '',
        permissions: []
      });
    }
    
    setFormErrors({});
    setOpenGroupDialog(true);
  };

  const handleCloseGroupForm = () => {
    setOpenGroupDialog(false);
  };

  const handleGroupFormChange = (e) => {
    const { name, value } = e.target;
    
    setGroupForm(prev => ({ ...prev, [name]: value }));
    
    // Reset errore per il campo modificato
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionChange = (menuId, permission, checked) => {
    setGroupForm(prev => {
      const permissions = [...prev.permissions];
      const existingIndex = permissions.findIndex(p => p.menu_id === menuId);
      
      if (existingIndex >= 0) {
        permissions[existingIndex] = {
          ...permissions[existingIndex],
          [permission]: checked
        };
      } else {
        permissions.push({
          menu_id: menuId,
          can_view: permission === 'can_view' ? checked : false,
          can_edit: permission === 'can_edit' ? checked : false
        });
      }
      
      return { ...prev, permissions };
    });
  };

  // Validazione form
  const validateForm = () => {
    const errors = {};
    
    if (!groupForm.name.trim()) {
      errors.name = 'Nome gruppo è richiesto';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Salvataggio gruppo
  const handleSaveGroup = async () => {
    if (!validateForm()) return;
    
    setFormSubmitting(true);
    
    try {
      const endpoint = groupFormMode === 'create' 
        ? getApiUrl('users.php?action=createGroup')
        : getApiUrl(`users.php?action=updateGroup&id=${currentGroup.id}`);
      
      // Trasforma le permissions per il formato richiesto dall'API
      const formattedPermissions = groupForm.permissions.map(p => ({
        menu_id: p.menu_id,
        can_view: p.can_view ? 1 : 0,
        can_edit: p.can_edit ? 1 : 0
      }));
      
      const formData = {
        ...groupForm,
        permissions: formattedPermissions
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        // Ricarica la lista dei gruppi
        loadGroups();
        handleCloseGroupForm();
      } else {
        setFormErrors(prev => ({
          ...prev,
          submit: data.error || 'Error saving group'
        }));
      }
    } catch (err) {
      console.error('Error saving group:', err);
      setFormErrors(prev => ({
        ...prev,
        submit: 'Error saving group'
      }));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Gestione eliminazione gruppo
  const handleOpenDeleteConfirm = (group) => {
    setGroupToDelete(group);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setGroupToDelete(null);
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    
    try {
      const response = await fetch(getApiUrl(`users.php?action=deleteGroup&id=${groupToDelete.id}`), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        // Ricarica la lista dei gruppi
        loadGroups();
      } else {
        setError(data.error || 'Failed to delete group');
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete group');
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  // Visualizzazione utenti del gruppo
  const handleOpenUsersDialog = async (group) => {
    setSelectedGroup(group);
    setGroupUsers([]);
    setUsersDialogOpen(true);
    
    try {
      const groupDetails = await loadGroupDetails(group.id);
      if (groupDetails && groupDetails.users) {
        setGroupUsers(groupDetails.users);
      }
    } catch (err) {
      console.error('Error loading group users:', err);
    }
  };

  const handleCloseUsersDialog = () => {
    setUsersDialogOpen(false);
    setSelectedGroup(null);
    setGroupUsers([]);
  };

  // Rendering
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestione Gruppi
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <IconButton onClick={() => loadGroups()} aria-label="ricarica">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          {hasPermission('groups', 'edit') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenGroupForm('create')}
            >
              Nuovo Gruppo
            </Button>
          )}
        </Box>
        
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrizione</TableCell>
                <TableCell>Utenti</TableCell>
                {hasPermission('groups', 'edit') && (
                  <TableCell align="right">Azioni</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={hasPermission('groups', 'edit') ? 4 : 3} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasPermission('groups', 'edit') ? 4 : 3} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      Nessun gruppo trovato
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id} hover>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.description || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          icon={<PeopleIcon />}
                          label={`${group.user_count} utenti`}
                          color={group.user_count > 0 ? 'primary' : 'default'}
                          variant="outlined"
                          clickable={group.user_count > 0}
                          onClick={group.user_count > 0 ? () => handleOpenUsersDialog(group) : undefined}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    {hasPermission('groups', 'edit') && (
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenGroupForm('edit', group)}
                          aria-label="modifica"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error"
                          onClick={() => handleOpenDeleteConfirm(group)}
                          aria-label="elimina"
                          disabled={group.user_count > 0}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Dialog Form Gruppo */}
      <Dialog
        open={openGroupDialog}
        onClose={handleCloseGroupForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {groupFormMode === 'create' ? 'Nuovo Gruppo' : 'Modifica Gruppo'}
        </DialogTitle>
        <DialogContent>
          {formErrors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.submit}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            name="name"
            label="Nome Gruppo"
            fullWidth
            variant="outlined"
            value={groupForm.name}
            onChange={handleGroupFormChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
            required
            disabled={formSubmitting}
          />
          
          <TextField
            margin="dense"
            name="description"
            label="Descrizione"
            fullWidth
            variant="outlined"
            value={groupForm.description}
            onChange={handleGroupFormChange}
            multiline
            rows={2}
            disabled={formSubmitting}
          />
          
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Permessi
          </Typography>
          
          {formSubmitting ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {menuItems.length > 0 ? (
                ['main', 'sidebar', 'config'].map(menuType => {
                  const typeItems = menuItems.filter(item => item.menu_type === menuType);
                  if (typeItems.length === 0) return null;
                  
                  return (
                    <Accordion key={menuType} defaultExpanded={menuType === 'main'}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight="bold">
                          {menuType === 'main' ? 'Menu Principale' : 
                           menuType === 'sidebar' ? 'Menu Laterale' : 
                           'Configurazione'}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Voce Menu</TableCell>
                                <TableCell align="center">Visualizza</TableCell>
                                <TableCell align="center">Modifica</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {typeItems.map(item => {
                                const permission = groupForm.permissions.find(p => p.menu_id === item.id) || {
                                  can_view: false,
                                  can_edit: false
                                };
                                
                                return (
                                  <TableRow key={item.id} hover>
                                    <TableCell>
                                      {item.name}
                                      {item.page_url && (
                                        <Typography variant="caption" display="block" color="text.secondary">
                                          {item.page_url}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Checkbox
                                        checked={permission.can_view}
                                        onChange={(e) => handlePermissionChange(item.id, 'can_view', e.target.checked)}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Checkbox
                                        checked={permission.can_edit}
                                        onChange={(e) => handlePermissionChange(item.id, 'can_edit', e.target.checked)}
                                        disabled={!permission.can_view}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  Nessuna voce di menu disponibile
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupForm} disabled={formSubmitting}>
            Annulla
          </Button>
          <Button 
            onClick={handleSaveGroup} 
            variant="contained" 
            disabled={formSubmitting}
          >
            {formSubmitting ? (
              <CircularProgress size={24} />
            ) : (
              'Salva'
            )}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Conferma Eliminazione */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
      >
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare il gruppo <strong>{groupToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Questa azione non può essere annullata.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>
            Annulla
          </Button>
          <Button 
            onClick={handleDeleteGroup} 
            variant="contained" 
            color="error"
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Utenti del Gruppo */}
      <Dialog
        open={usersDialogOpen}
        onClose={handleCloseUsersDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Utenti del gruppo: {selectedGroup?.name}
        </DialogTitle>
        <DialogContent>
	  {groupUsers.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {groupUsers.map(user => (
                <ListItem key={user.id}>
                  <ListItemText
                    primary={user.full_name}
                    secondary={user.username}
                  />
                  <ListItemSecondaryAction>
                    <Chip label={user.email} size="small" variant="outlined" />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUsersDialog}>
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GroupManagement;
