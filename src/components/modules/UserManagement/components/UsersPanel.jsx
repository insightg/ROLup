// src/components/modules/UserManagement/components/UsersPanel.jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Divider,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useUserManagementStore } from '../stores/userManagementStore';
import UserFormDialog from './UserFormDialog';
import UserGroupsDialog from './UserGroupsDialog';

const UsersPanel = ({ users = [], groups = [], onUserUpdated }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState(users);
  
  // Stato per il menu azioni
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Stati per i dialoghi
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false);
  
  // Accedi alle azioni dello store
  const { deleteUser, updateUser } = useUserManagementStore();

  // Filtra gli utenti in base alla ricerca
  React.useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(lowercasedSearch) ||
      user.email.toLowerCase().includes(lowercasedSearch) ||
      (user.full_name && user.full_name.toLowerCase().includes(lowercasedSearch))
    );
    
    setFilteredUsers(filtered);
    setPage(0); // Torna alla prima pagina dopo il filtro
  }, [searchTerm, users]);

  // Gestione paginazione
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Gestore menu azioni
  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Gestori per i dialoghi
  const handleEditUser = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };
  
  const handleDeleteUser = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  const handleManageGroups = () => {
    setGroupsDialogOpen(true);
    handleMenuClose();
  };
  
  // Gestione toggle stato utente attivo/inattivo
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const result = await updateUser(userId, { is_active: !currentStatus });
      if (result.success) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };
  
  // Funzione per confermare eliminazione utente
  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const result = await deleteUser(selectedUser.id);
      if (result.success) {
        setDeleteDialogOpen(false);
        onUserUpdated();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };
  
  // Funzione per ottenere i gruppi dell'utente
  const getUserGroups = (user) => {
    if (!user || !user.groups || !groups.length) return [];
    
    const userGroupIds = Array.isArray(user.groups) 
      ? user.groups 
      : (typeof user.groups === 'string' ? user.groups.split(',').map(Number) : []);
    
    return groups.filter(group => userGroupIds.includes(group.id));
  };
  
  // Iniziali per avatar
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase();
  };

  // Calcolo delle righe da mostrare nella pagina corrente
  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2 }}>
        <TextField
          placeholder="Cerca utenti..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>
      
      <Paper sx={{ width: '100%', height: 'calc(100% - 48px)', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100% - 52px)' }}>
          <Table stickyHeader aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>Utente</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Stato</TableCell>
                <TableCell>Gruppi</TableCell>
                <TableCell>Ultimo login</TableCell>
                <TableCell align="center">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getInitials(user.full_name || user.username)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {user.username}
                          </Typography>
                          {user.full_name && (
                            <Typography variant="body2" color="text.secondary">
                              {user.full_name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.is_active ? "Attivo" : "Inattivo"} 
                        color={user.is_active ? "success" : "default"}
                        size="small"
                        icon={user.is_active ? <CheckIcon /> : <ClearIcon />}
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      {getUserGroups(user).length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {getUserGroups(user).map(group => (
                            <Chip 
                              key={group.id}
                              label={group.name}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Nessun gruppo
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.last_login ? (
                        new Date(user.last_login).toLocaleString('it-IT')
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Mai
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => handleMenuClick(e, user)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nessun utente trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Righe per pagina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
        />
      </Paper>

      {/* Menu Azioni */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditUser}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Modifica
        </MenuItem>
        <MenuItem onClick={handleManageGroups}>
          <GroupIcon fontSize="small" sx={{ mr: 1 }} />
          Gestisci Gruppi
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteUser} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Elimina
        </MenuItem>
      </Menu>

      {/* Dialog di modifica utente */}
      {selectedUser && (
        <UserFormDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          user={selectedUser}
          groups={groups}
          onUserSaved={onUserUpdated}
          editMode={true}
        />
      )}

      {/* Dialog di conferma eliminazione */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Questa operazione non può essere annullata!
              </Alert>
              <Typography variant="body1">
                Sei sicuro di voler eliminare l&apos;utente <strong>{selectedUser.username}</strong>?
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annulla</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={confirmDeleteUser}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog per gestire i gruppi dell'utente */}
      {selectedUser && (
        <UserGroupsDialog
          open={groupsDialogOpen}
          onClose={() => setGroupsDialogOpen(false)}
          user={selectedUser}
          groups={groups}
          onSave={onUserUpdated}
        />
      )}
    </>
  );
};

export default UsersPanel;