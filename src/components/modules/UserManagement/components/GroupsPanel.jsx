// src/components/modules/UserManagement/components/GroupsPanel.jsx
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
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Alert,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useUserManagementStore } from '../stores/userManagementStore';
import GroupFormDialog from './GroupFormDialog';

const GroupsPanel = ({ groups = [], onGroupUpdated }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGroups, setFilteredGroups] = useState(groups);
  
  // Stato per il menu azioni
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Stati per i dialoghi
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupDetailDialogOpen, setGroupDetailDialogOpen] = useState(false);
  
  // Accedi alle azioni dello store
  const { deleteGroup } = useUserManagementStore();

  // Filtra i gruppi in base alla ricerca
  React.useEffect(() => {
    if (!searchTerm) {
      setFilteredGroups(groups);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = groups.filter(group => 
      group.name.toLowerCase().includes(lowercasedSearch) ||
      (group.description && group.description.toLowerCase().includes(lowercasedSearch))
    );
    
    setFilteredGroups(filtered);
    setPage(0); // Torna alla prima pagina dopo il filtro
  }, [searchTerm, groups]);

  // Gestione paginazione
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Gestore menu azioni
  const handleMenuClick = (event, group) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Gestori per i dialoghi
  const handleEditGroup = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };
  
  const handleDeleteGroup = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  const handleViewGroupDetail = () => {
    setGroupDetailDialogOpen(true);
    handleMenuClose();
  };
  
  // Funzione per confermare eliminazione gruppo
  const confirmDeleteGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      const result = await deleteGroup(selectedGroup.id);
      if (result.success) {
        setDeleteDialogOpen(false);
        onGroupUpdated();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  // Calcolo delle righe da mostrare nella pagina corrente
  const paginatedGroups = filteredGroups.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2 }}>
        <TextField
          placeholder="Cerca gruppi..."
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
          <Table stickyHeader aria-label="groups table">
            <TableHead>
              <TableRow>
                <TableCell>Nome Gruppo</TableCell>
                <TableCell>Descrizione</TableCell>
                <TableCell>Data Creazione</TableCell>
                <TableCell align="center">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedGroups.length > 0 ? (
                paginatedGroups.map((group) => (
                  <TableRow key={group.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <GroupIcon color="primary" />
                        <Typography variant="body1" fontWeight="medium">
                          {group.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {group.description ? (
                        <Typography variant="body2" sx={{ maxWidth: 300, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {group.description}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Nessuna descrizione
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {group.created_at ? (
                        new Date(group.created_at).toLocaleString('it-IT')
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          N/D
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => handleMenuClick(e, group)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Nessun gruppo trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredGroups.length}
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
        <MenuItem onClick={handleEditGroup}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Modifica
        </MenuItem>
        <MenuItem onClick={handleViewGroupDetail}>
          <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
          Dettagli Gruppo
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteGroup} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Elimina
        </MenuItem>
      </Menu>

      {/* Dialog di modifica gruppo */}
      {selectedGroup && (
        <GroupFormDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          group={selectedGroup}
          onGroupSaved={onGroupUpdated}
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
          {selectedGroup && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Questa operazione non può essere annullata!
              </Alert>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Sei sicuro di voler eliminare il gruppo <strong>{selectedGroup.name}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                L&apos;eliminazione di questo gruppo rimuoverà anche tutti i permessi associati ad esso e rimuoverà gli utenti dal gruppo.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annulla</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={confirmDeleteGroup}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog di dettaglio gruppo */}
      <Dialog
        open={groupDetailDialogOpen}
        onClose={() => setGroupDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedGroup && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon color="primary" />
                <Typography variant="h6">Dettagli Gruppo: {selectedGroup.name}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                    Informazioni Gruppo
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Nome:</Typography>
                      <Typography variant="body1">{selectedGroup.name}</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Descrizione:</Typography>
                      <Typography variant="body1">
                        {selectedGroup.description || 'Nessuna descrizione'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">Data creazione:</Typography>
                      <Typography variant="body1">
                        {selectedGroup.created_at ? new Date(selectedGroup.created_at).toLocaleString('it-IT') : 'N/D'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                    Permessi Associati
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Questa vista è di sola lettura. Per modificare i permessi, utilizza la sezione &quot;Permessi&quot; nella barra di navigazione.
                  </Typography>
                  
                  {/* Qui si potrebbero elencare i permessi, ma per ora lasciamo un messaggio */}
                  <Typography variant="body1" align="center" sx={{ py: 2 }}>
                    Per visualizzare e modificare i permessi di questo gruppo, utilizza la scheda &quot;Permessi&quot;
                  </Typography>
                </CardContent>
              </Card>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setGroupDetailDialogOpen(false)}>Chiudi</Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => {
                  setGroupDetailDialogOpen(false);
                  setEditDialogOpen(true);
                }}
              >
                Modifica Gruppo
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default GroupsPanel;