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
  TablePagination,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../auth/AuthContext';

// Helper function for creating backend API URLs
const getApiUrl = (endpoint) => `/backend/${endpoint}`;

const UserManagement = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stato per il form utente
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userFormMode, setUserFormMode] = useState('create'); // 'create' o 'edit'
  const [currentUser, setCurrentUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    is_active: true,
    groups: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Stato per il dialog di conferma eliminazione
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Carica utenti e gruppi
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl(`users.php?action=getUsers&page=${page + 1}&limit=${rowsPerPage}&search=${searchTerm}`), {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
        setTotalUsers(data.pagination.total);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
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
        console.error('Failed to load groups:', data.error);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  // Carica i dati all'avvio e quando cambiano i parametri
  useEffect(() => {
    loadUsers();
    loadGroups();
  }, [page, rowsPerPage, searchTerm]);

  // Gestione paginazione
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Gestione ricerca
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  // Gestione form utente
  const handleOpenUserForm = (mode, user = null) => {
    setUserFormMode(mode);
    
    if (mode === 'edit' && user) {
      // Per la modifica, carichiamo i dati dell'utente
      setCurrentUser(user);
      setUserForm({
        username: user.username,
        password: '', // Password vuota in modalità edit
        email: user.email,
        full_name: user.full_name,
        is_active: user.is_active === 1,
        groups: user.groups.map(g => g.id)
      });
    } else {
      // Per la creazione, reset del form
      setCurrentUser(null);
      setUserForm({
        username: '',
        password: '',
        email: '',
        full_name: '',
        is_active: true,
        groups: []
      });
    }
    
    setFormErrors({});
    setOpenUserDialog(true);
  };

  const handleCloseUserForm = () => {
    setOpenUserDialog(false);
  };

  const handleUserFormChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'is_active') {
      setUserForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setUserForm(prev => ({ ...prev, [name]: value }));
    }
    
    // Reset errore per il campo modificato
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleGroupsChange = (event) => {
    const { value } = event.target;
    setUserForm(prev => ({ ...prev, groups: value }));
  };

  // Validazione form
  const validateForm = () => {
    const errors = {};
    
    if (!userForm.username.trim()) {
      errors.username = 'Username è richiesto';
    }
    
    if (userFormMode === 'create' && !userForm.password.trim()) {
      errors.password = 'Password è richiesta per i nuovi utenti';
    }
    
    if (!userForm.email.trim()) {
      errors.email = 'Email è richiesta';
    } else if (!/\S+@\S+\.\S+/.test(userForm.email)) {
      errors.email = 'Email non valida';
    }
    
    if (!userForm.full_name.trim()) {
      errors.full_name = 'Nome completo è richiesto';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Salvataggio utente
  const handleSaveUser = async () => {
    if (!validateForm()) return;
    
    setFormSubmitting(true);
    
    try {
      const endpoint = userFormMode === 'create' 
        ? getApiUrl('users.php?action=createUser')
        : getApiUrl(`users.php?action=updateUser&id=${currentUser.id}`);
      
      const formData = { ...userForm };
      
      // Se la password è vuota in modalità edit, la rimuoviamo
      if (userFormMode === 'edit' && !formData.password) {
        delete formData.password;
      }
      
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
        // Ricarica la lista degli utenti
        loadUsers();
        handleCloseUserForm();
      } else {
        setFormErrors(prev => ({
          ...prev,
          submit: data.error || 'Error saving user'
        }));
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setFormErrors(prev => ({
        ...prev,
        submit: 'Error saving user'
      }));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Gestione eliminazione utente
  const handleOpenDeleteConfirm = (user) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const response = await fetch(getApiUrl(`users.php?action=deleteUser&id=${userToDelete.id}`), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        // Ricarica la lista degli utenti
        loadUsers();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  // Rendering
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestione Utenti
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
     <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <TextField
              placeholder="Cerca utenti..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ mr: 2, width: 300 }}
            />
            <IconButton onClick={() => loadUsers()} aria-label="ricarica">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          {hasPermission('users', 'edit') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenUserForm('create')}
            >
              Nuovo Utente
            </Button>
          )}
        </Box>
        
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Gruppi</TableCell>
                <TableCell>Stato</TableCell>
                <TableCell>Ultimo Accesso</TableCell>
                {hasPermission('users', 'edit') && (
                  <TableCell align="right">Azioni</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={hasPermission('users', 'edit') ? 7 : 6} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasPermission('users', 'edit') ? 7 : 6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm ? 'Nessun utente corrisponde alla ricerca' : 'Nessun utente trovato'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {user.groups.map(group => (
                          <Chip 
                            key={group.id} 
                            label={group.name} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        ))}
                        {user.groups.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Nessun gruppo
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.is_active === 1 ? 'Attivo' : 'Inattivo'} 
                        color={user.is_active === 1 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.last_login ? (
                        format(new Date(user.last_login), 'dd MMM yyyy HH:mm', { locale: it })
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Mai
                        </Typography>
                      )}
                    </TableCell>
                    {hasPermission('users', 'edit') && (
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenUserForm('edit', user)}
                          aria-label="modifica"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error"
                          onClick={() => handleOpenDeleteConfirm(user)}
                          aria-label="elimina"
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
        
        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Righe per pagina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
      
      {/* Dialog Form Utente */}
      <Dialog
        open={openUserDialog}
        onClose={handleCloseUserForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {userFormMode === 'create' ? 'Nuovo Utente' : 'Modifica Utente'}
        </DialogTitle>
        <DialogContent>
          {formErrors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.submit}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            name="username"
            label="Username"
            fullWidth
            variant="outlined"
            value={userForm.username}
            onChange={handleUserFormChange}
            error={!!formErrors.username}
            helperText={formErrors.username}
            required
            disabled={formSubmitting}
          />
          
          <TextField
            margin="dense"
            name="password"
            label={userFormMode === 'create' ? 'Password' : 'Nuova Password (lasciare vuoto per mantenere)'}
            type="password"
            fullWidth
            variant="outlined"
            value={userForm.password}
            onChange={handleUserFormChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
            required={userFormMode === 'create'}
            disabled={formSubmitting}
          />
          
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={userForm.email}
            onChange={handleUserFormChange}
            error={!!formErrors.email}
            helperText={formErrors.email}
            required
            disabled={formSubmitting}
          />
          
          <TextField
            margin="dense"
            name="full_name"
            label="Nome Completo"
            fullWidth
            variant="outlined"
            value={userForm.full_name}
            onChange={handleUserFormChange}
            error={!!formErrors.full_name}
            helperText={formErrors.full_name}
            required
            disabled={formSubmitting}
          />
          
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel id="groups-label">Gruppi</InputLabel>
            <Select
              labelId="groups-label"
              multiple
              name="groups"
              value={userForm.groups}
              onChange={handleGroupsChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const group = groups.find(g => g.id === value);
                    return (
                      <Chip 
                        key={value} 
                        label={group ? group.name : value} 
                        size="small" 
                      />
                    );
                  })}
                </Box>
              )}
              disabled={formSubmitting}
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={userForm.is_active}
                onChange={handleUserFormChange}
                name="is_active"
                disabled={formSubmitting}
              />
            }
            label="Utente attivo"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserForm} disabled={formSubmitting}>
            Annulla
          </Button>
          <Button 
            onClick={handleSaveUser} 
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
            Sei sicuro di voler eliminare l'utente <strong>{userToDelete?.username}</strong>?
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
            onClick={handleDeleteUser} 
            variant="contained" 
            color="error"
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement; 
