// src/components/modules/UserManagement/components/PermissionsPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControlLabel,
  Checkbox,
  Button,
  Chip,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  MenuOpen as MenuOpenIcon,
  Settings as SettingsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useUserManagementStore } from '../stores/userManagementStore';

// Componente per il tipo di menu item
const MenuItemType = ({ type }) => {
  let color = 'default';
  let label = type;
  
  switch (type) {
    case 'main':
      color = 'primary';
      label = 'Principale';
      break;
    case 'sidebar':
      color = 'secondary';
      label = 'Laterale';
      break;
    case 'config':
      color = 'info';
      label = 'Configurazione';
      break;
    default:
      break;
  }
  
  return (
    <Chip 
      label={label} 
      color={color} 
      size="small" 
      variant="outlined" 
    />
  );
};

const PermissionsPanel = ({ permissions = [], groups = [], onPermissionUpdated }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupPermissions, setGroupPermissions] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Accedi allo store
  const { updatePermission, fetchPermissions, menuItems: allMenuItems } = useUserManagementStore();
  
  // Filtra i menu items localmente
  useEffect(() => {
    if (!searchTerm) {
      setFilteredMenuItems(menuItems);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = menuItems.filter(item => 
      item.name.toLowerCase().includes(lowercasedSearch) ||
      item.page_url?.toLowerCase().includes(lowercasedSearch)
    );
    
    setFilteredMenuItems(filtered);
  }, [searchTerm, menuItems]);
  
  // Carica i permessi per il gruppo selezionato
  useEffect(() => {
    if (selectedGroup && permissions.length > 0 && allMenuItems.length > 0) {
      // Filtra i permessi per il gruppo selezionato
      const groupPerms = permissions.filter(p => p.group_id === parseInt(selectedGroup));
      setGroupPermissions(groupPerms);
      
      // Prepara la lista completa di menuItems con i permessi correnti
      const menuItemsWithPermissions = allMenuItems.map(item => {
        const permission = groupPerms.find(p => p.menu_id === item.id);
        
        return {
          ...item,
          can_view: permission ? permission.can_view : false,
          can_edit: permission ? permission.can_edit : false,
          permission_id: permission ? permission.id : null
        };
      });
      
      setMenuItems(menuItemsWithPermissions);
      setFilteredMenuItems(menuItemsWithPermissions);
    } else {
      setGroupPermissions([]);
      setMenuItems([]);
      setFilteredMenuItems([]);
    }
  }, [selectedGroup, permissions, allMenuItems]);
  
  // Gestisce il cambio del gruppo selezionato
  const handleGroupChange = (event) => {
    setSelectedGroup(event.target.value);
    setSaveSuccess(false);
  };
  
  // Gestisce il cambio di un permesso
  const handlePermissionChange = (menuId, field, value) => {
    // Aggiorna lo stato locale
    const updatedMenuItems = menuItems.map(item => {
      if (item.id === menuId) {
        // Se togliamo la visualizzazione, togliamo anche la modifica
        if (field === 'can_view' && !value) {
          return { ...item, can_view: false, can_edit: false };
        }
        // Se aggiungiamo la modifica, aggiungiamo anche la visualizzazione
        if (field === 'can_edit' && value) {
          return { ...item, can_view: true, can_edit: true };
        }
        
        return { ...item, [field]: value };
      }
      return item;
    });
    
    setMenuItems(updatedMenuItems);
    
    // Aggiorna anche i filteredMenuItems
    const updatedFilteredItems = filteredMenuItems.map(item => {
      if (item.id === menuId) {
        if (field === 'can_view' && !value) {
          return { ...item, can_view: false, can_edit: false };
        }
        if (field === 'can_edit' && value) {
          return { ...item, can_view: true, can_edit: true };
        }
        
        return { ...item, [field]: value };
      }
      return item;
    });
    
    setFilteredMenuItems(updatedFilteredItems);
    setSaveSuccess(false);
  };
  
  // Salva tutti i permessi
  const handleSavePermissions = async () => {
    if (!selectedGroup) return;
    
    try {
      setSaving(true);
      
      // Prepara i dati per l'aggiornamento
      const permissionsToUpdate = menuItems.map(item => ({
        group_id: parseInt(selectedGroup),
        menu_id: item.id,
        can_view: item.can_view ? 1 : 0,
        can_edit: item.can_edit ? 1 : 0,
        permission_id: item.permission_id
      }));
      
      // Chiama l'API per aggiornare i permessi
      const result = await updatePermission({
        group_id: parseInt(selectedGroup),
        permissions: permissionsToUpdate
      });
      
      if (result.success) {
        setSaveSuccess(true);
        // Aggiorna i dati
        await fetchPermissions();
        onPermissionUpdated();
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // Ottieni il nome del gruppo selezionato
  const getSelectedGroupName = () => {
    if (!selectedGroup) return '';
    const group = groups.find(g => g.id === parseInt(selectedGroup));
    return group ? group.name : '';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="group-select-label">Seleziona Gruppo</InputLabel>
              <Select
                labelId="group-select-label"
                value={selectedGroup}
                label="Seleziona Gruppo"
                onChange={handleGroupChange}
              >
                <MenuItem value="">
                  <em>Seleziona un gruppo</em>
                </MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={5}>
            {selectedGroup && (
              <TextField
                placeholder="Cerca voci di menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          </Grid>
          
          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {selectedGroup && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSavePermissions}
                disabled={saving || !selectedGroup}
              >
                {saving ? <CircularProgress size={24} /> : 'Salva Permessi'}
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Permessi salvati con successo!
        </Alert>
      )}
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {!selectedGroup ? (
          <Paper sx={{ p: 4, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" color="text.secondary" align="center">
              Seleziona un gruppo per gestire i permessi
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                Permessi per il gruppo: <strong>{getSelectedGroupName()}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configura quali voci di menu il gruppo può visualizzare e modificare
              </Typography>
            </Box>
            
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell align="center">Visualizzazione</TableCell>
                    <TableCell align="center">Modifica</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMenuItems.length > 0 ? (
                    filteredMenuItems.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {item.icon ? (
                              <MenuOpenIcon color="primary" fontSize="small" />
                            ) : (
                              <SettingsIcon color="action" fontSize="small" />
                            )}
                            <Typography variant="body2">
                              {item.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <MenuItemType type={item.menu_type} />
                        </TableCell>
                        <TableCell>
                          {item.page_url ? (
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {item.page_url}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={item.can_view}
                            onChange={(e) => handlePermissionChange(item.id, 'can_view', e.target.checked)}
                            color="primary"
                            icon={<ViewIcon color="disabled" />}
                            checkedIcon={<ViewIcon color="primary" />}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={item.can_edit}
                            onChange={(e) => handlePermissionChange(item.id, 'can_edit', e.target.checked)}
                            color="primary"
                            icon={<EditIcon color="disabled" />}
                            checkedIcon={<EditIcon color="primary" />}
                            disabled={!item.can_view} // Non si può modificare se non si può visualizzare
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        {searchTerm ? (
                          <Typography>Nessun risultato per la ricerca</Typography>
                        ) : (
                          <Typography>Nessuna voce di menu disponibile</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="info" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  La modifica implica la visualizzazione
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSavePermissions}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : 'Salva Permessi'}
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default PermissionsPanel;