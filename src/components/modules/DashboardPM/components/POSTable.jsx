// /var/www/html/insightg/wup/r_wup/src/components/modules/DashboardPM/components/POSTable.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TableSortLabel,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Tooltip,
  Checkbox,
  Button,
  FormControl,
  InputLabel,
  Select,
  Popover,
  Typography,
  Badge,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Assignment as TasksIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  SupervisorAccount as ManagerIcon,
  FilterList as FilterListIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  CheckBox as CheckBoxIcon,
  Save as SaveIcon,
  People as PeopleIcon,
  Route as RouteIcon
} from '@mui/icons-material';
import { usePMStore } from '../stores/pmStore';
import OrderDetailPanel from './OrderDetailPanel';
import StatusPanel from './StatusPanel';
import DocumentsPanel from './DocumentsPanel';
import AssignPMPanel from './AssignPMPanel';
import RouteOptimizerDialog from './RouteOptimizerDialog';
import { useNavigate } from 'react-router-dom';
import { 
  fetchStatiAvanzamento, 
  fetchAvailablePMs, 
  batchAssignPMToOrders, 
  batchUpdatePOSStatus 
} from '../api/pmApi';

// Componente per il filtro colonna
const ColumnFilter = ({ column, onFilter, filterValue, availableValues }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [value, setValue] = useState(filterValue || '');

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    onFilter(column, value);
    handleClose();
  };

  const handleClear = () => {
    setValue('');
    onFilter(column, '');
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton 
        size="small" 
        onClick={handleClick}
        color={filterValue ? 'primary' : 'default'}
      >
        <Badge color="primary" variant="dot" invisible={!filterValue}>
          <FilterListIcon fontSize="small" />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box sx={{ p: 2, width: 250 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filtra per {column}
          </Typography>
          
          {availableValues ? (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <Select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Tutti</em>
                </MenuItem>
                {availableValues.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              size="small"
              fullWidth
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Filtra..."
              sx={{ mb: 2 }}
            />
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              size="small" 
              startIcon={<ClearIcon />} 
              onClick={handleClear}
            >
              Cancella
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              onClick={handleApply}
            >
              Applica
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

// Dialogo per assegnare PM in batch
const BatchAssignPMDialog = ({ open, onClose, onAssign, selectedRows, pmList }) => {
  const [selectedPM, setSelectedPM] = useState('');

  const handleAssign = () => {
    onAssign(selectedPM);
    setSelectedPM('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assegna PM ai record selezionati</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Stai per assegnare un PM a {selectedRows.length} record.
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Seleziona PM</InputLabel>
            <Select
              value={selectedPM}
              onChange={(e) => setSelectedPM(e.target.value)}
              label="Seleziona PM"
            >
              <MenuItem value="">
                <em>Seleziona PM</em>
              </MenuItem>
              {pmList.map((pm) => (
                <MenuItem key={pm.id} value={pm.id}>
                  {pm.full_name || pm.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button 
          onClick={handleAssign} 
          variant="contained" 
          disabled={!selectedPM}
        >
          Assegna
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Dialogo per cambio stato in batch
const BatchChangeStatusDialog = ({ open, onClose, onChangeStatus, selectedRows, statiList }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');

  const handleChangeStatus = () => {
    onChangeStatus(selectedStatus, reason);
    setSelectedStatus('');
    setReason('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cambia stato dei record selezionati</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Stai per modificare lo stato di {selectedRows.length} record.
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Nuovo stato</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Nuovo stato"
            >
              <MenuItem value="">
                <em>Seleziona stato</em>
              </MenuItem>
              {statiList.map((stato) => (
                <MenuItem key={stato.codice} value={stato.codice}>
                  {stato.descrizione}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="normal"
            fullWidth
            label="Motivazione (opzionale)"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button 
          onClick={handleChangeStatus} 
          variant="contained" 
          disabled={!selectedStatus}
        >
          Aggiorna stato
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const POSTable = ({ data, isManager = false }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState('nome_account');
  const [order, setOrder] = useState('asc');
  const [filteredData, setFilteredData] = useState([]);
  
  // Stato per i filtri di colonna
  const [columnFilters, setColumnFilters] = useState({});
  
  // Stato per la selezione delle righe
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Toggle per visualizzare solo i record selezionati
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  
  // Stati per le azioni batch
  const [batchActionAnchorEl, setBatchActionAnchorEl] = useState(null);
  const [assignPMDialogOpen, setAssignPMDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [routeOptimizerDialogOpen, setRouteOptimizerDialogOpen] = useState(false);
  
  // Stato per i menù azioni
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Stato per i pannelli
  const [activePanelType, setActivePanelType] = useState(null);
  const [activePanelId, setActivePanelId] = useState(null);
  
  // Stato specifico per il panel OrderDetail
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  // Stati disponibili
  const [availableStates, setAvailableStates] = useState([]);
  const [pmList, setPMList] = useState([]);
  
  const { refreshData } = usePMStore();

  // Carica stati disponibili all'avvio
  useEffect(() => {
    const loadStatiAvanzamento = async () => {
      try {
        const result = await fetchStatiAvanzamento();
        
        if (result.success) {
          // Filtra solo gli stati per gli ordini
          const orderStates = result.data.filter(stato => 
            stato.tipo === 'ordine' && stato.attivo
          );
          setAvailableStates(orderStates);
        }
      } catch (error) {
        console.error('Error fetching stati avanzamento:', error);
      }
    };
    
    const loadPMList = async () => {
      if (isManager) {
        try {
          const result = await fetchAvailablePMs();
          
          if (result.success) {
            setPMList(result.data);
          }
        } catch (error) {
          console.error('Error fetching PM list:', error);
        }
      }
    };
    
    loadStatiAvanzamento();
    loadPMList();
  }, [isManager]);

  // Applica filtri e ordinamento
  useEffect(() => {
    let filtered = [...data];
    
    // Filtra solo i record selezionati se necessario
    if (showOnlySelected) {
      filtered = filtered.filter(row => selectedRows.includes(row.id));
    }
    
    // Applica ricerca globale
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        (row.nome_account?.toLowerCase().includes(lowerSearchTerm)) ||
        (row.tipo_attivita_desc?.toLowerCase().includes(lowerSearchTerm)) ||
        (row.sf_region?.toLowerCase().includes(lowerSearchTerm)) ||
        (row.sf_territory?.toLowerCase().includes(lowerSearchTerm)) ||
        (row.rrp_segment?.toLowerCase().includes(lowerSearchTerm)) ||
        (isManager && row.pm_full_name?.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // Applica filtri per colonna
    Object.entries(columnFilters).forEach(([column, value]) => {
      if (value) {
        filtered = filtered.filter(row => {
          const fieldValue = row[column];
          return fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    
    // Applica ordinamento
    filtered = filtered.sort((a, b) => {
      const aValue = a[orderBy] || '';
      const bValue = b[orderBy] || '';
      
      if (order === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    
    setFilteredData(filtered);
    
    // Reimposta la pagina a 0 quando cambiano i filtri
    setPage(0);
  }, [data, searchTerm, orderBy, order, columnFilters, isManager, showOnlySelected, selectedRows]);

  // Gestori paginazione
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Gestore ordinamento
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Gestore filtri colonna
  const handleColumnFilter = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Gestori selezione righe
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      // Se viene selezionato tutto, aggiungi gli ID di tutte le righe filtrate
      const newSelected = filteredData.map(row => row.id);
      setSelectedRows(newSelected);
      return;
    }
    setSelectedRows([]);
  };

  const handleRowSelect = (event, id) => {
    const selectedIndex = selectedRows.indexOf(id);
    let newSelected = [];
    
    if (selectedIndex === -1) {
      newSelected = [...selectedRows, id];
    } else {
      newSelected = selectedRows.filter(rowId => rowId !== id);
    }
    
    setSelectedRows(newSelected);
  };

  const isRowSelected = (id) => selectedRows.indexOf(id) !== -1;
  
  // Gestori azioni batch
  const handleBatchActionClick = (event) => {
    setBatchActionAnchorEl(event.currentTarget);
  };
  
  const handleBatchActionClose = () => {
    setBatchActionAnchorEl(null);
  };
  
  const handleBatchAssignPM = () => {
    setAssignPMDialogOpen(true);
    handleBatchActionClose();
  };
  
  const handleBatchChangeStatus = () => {
    setChangeStatusDialogOpen(true);
    handleBatchActionClose();
  };
  
  const handleOpenRouteOptimizer = () => {
    setRouteOptimizerDialogOpen(true);
    handleBatchActionClose();
  };
  
  const handleBatchAssignPMSubmit = async (pmId) => {
    try {
      // Utilizzo dell'API centralizzata per assegnazione batch
      await batchAssignPMToOrders(selectedRows, pmId);
      refreshData();
      setSelectedRows([]);
      setAssignPMDialogOpen(false);
    } catch (error) {
      console.error('Error in batch assign PM:', error);
    }
  };
  
  const handleBatchChangeStatusSubmit = async (status, reason) => {
    try {
      // Utilizzo dell'API centralizzata per cambio stato batch
      await batchUpdatePOSStatus(selectedRows, status, reason);
      refreshData();
      setSelectedRows([]);
      setChangeStatusDialogOpen(false);
    } catch (error) {
      console.error('Error in batch change status:', error);
    }
  };

  // Gestore menù azioni
  const handleActionClick = (event, row) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedRow(row);
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
  };

  // Gestori apertura pannelli
  const handleOpenPanel = (type, id) => {
    setActivePanelType(type);
    setActivePanelId(id);
    
    if (type === 'tasks') {
      setSelectedOrderId(id);
    }
    
    handleCloseActionMenu();
  };

  const handleClosePanel = () => {
    setActivePanelType(null);
    setActivePanelId(null);
    setSelectedOrderId(null);
  };

  // Formatta stato come badge usando i dati dinamici
  const formatStatusBadge = (statusCode) => {
    const statusConfig = availableStates.find(s => s.codice === statusCode) || {
      descrizione: statusCode || 'Sconosciuto',
      colore: 'default'
    };
    
    return (
      <Chip 
        label={statusConfig.descrizione} 
        color={mapStatusColor(statusConfig.colore)} 
        size="small" 
        variant="outlined"
      />
    );
  };
  
  // Mappa i colori degli stati da stringhe ai valori MUI
  const mapStatusColor = (color) => {
    const colorMap = {
      'blue': 'primary',
      'green': 'success',
      'red': 'error',
      'orange': 'warning',
      'cyan': 'info',
      'gray': 'default'
    };
    
    return colorMap[color] || 'default';
  };

  // Iniziali per avatar da nome completo
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Calcola le righe per mostrare nella pagina attuale
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Prepara valori disponibili per filtri a select
  const getUniqueFilterValues = (fieldName) => {
    if (fieldName === 'stato') {
      return availableStates.map(state => ({
        value: state.codice,
        label: state.descrizione
      }));
    }
    
    if (fieldName === 'pm_full_name' && isManager) {
      return pmList.map(pm => ({
        value: pm.full_name,
        label: pm.full_name
      }));
    }
    
    return null;
  };

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            placeholder="Cerca POS..."
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
          
          {/* Toggle per mostrare solo i record selezionati */}
          {selectedRows.length > 0 && (
            <Button
              variant={showOnlySelected ? "contained" : "outlined"}
              size="small"
              startIcon={showOnlySelected ? <CheckBoxIcon /> : <FilterListIcon />}
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              color={showOnlySelected ? "primary" : "inherit"}
              sx={{ ml: 1 }}
            >
              {showOnlySelected ? 
                `Selezionati (${selectedRows.length})` : 
                `Mostra selezionati (${selectedRows.length})`}
            </Button>
          )}
        </Box>
        
        {/* Panel di azioni per righe selezionate */}
        {selectedRows.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center' }}>
              <CardContent sx={{ py: 0.5, px: 2, '&:last-child': { pb: 0.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Badge 
                    badgeContent={selectedRows.length} 
                    color="primary" 
                    max={999}
                    showZero
                  >
                    <CheckBoxIcon color="action" fontSize="small" />
                  </Badge>
                  
                  <Button 
                    size="small" 
                    startIcon={<ClearIcon />} 
                    onClick={() => setSelectedRows([])}
                  >
                    Deseleziona
                  </Button>
                  
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                  
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleBatchActionClick}
                  >
                    Azioni
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      <Paper sx={{ width: '100%', height: 'calc(100% - 48px)', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100% - 52px)' }}>
          {showOnlySelected && (
            <Box sx={{ p: 1, bgcolor: 'action.selected', borderRadius: '4px 4px 0 0' }}>
              <Typography variant="body2" align="center">
                Visualizzazione filtrata: mostrati solo i {selectedRows.length} record selezionati. 
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => setShowOnlySelected(false)}
                  sx={{ ml: 1 }}
                >
                  Mostra tutti
                </Button>
              </Typography>
            </Box>
          )}
        
          <Table stickyHeader aria-label="pos table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selectedRows.length > 0 && selectedRows.length < filteredData.length}
                    checked={filteredData.length > 0 && selectedRows.length === filteredData.length}
                    onChange={handleSelectAllClick}
                    inputProps={{ 'aria-label': 'select all' }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableSortLabel
                      active={orderBy === 'nome_account'}
                      direction={orderBy === 'nome_account' ? order : 'asc'}
                      onClick={() => handleRequestSort('nome_account')}
                    >
                      Nome POS
                    </TableSortLabel>
                    <ColumnFilter 
                      column="nome_account"
                      onFilter={handleColumnFilter}
                      filterValue={columnFilters['nome_account']}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableSortLabel
                      active={orderBy === 'tipo_attivita_desc'}
                      direction={orderBy === 'tipo_attivita_desc' ? order : 'asc'}
                      onClick={() => handleRequestSort('tipo_attivita_desc')}
                    >
                      Tipo Attività
                    </TableSortLabel>
                    <ColumnFilter 
                      column="tipo_attivita_desc"
                      onFilter={handleColumnFilter}
                      filterValue={columnFilters['tipo_attivita_desc']}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableSortLabel
                      active={orderBy === 'stato'}
                      direction={orderBy === 'stato' ? order : 'asc'}
                      onClick={() => handleRequestSort('stato')}
                    >
                      Stato
                    </TableSortLabel>
                    <ColumnFilter 
                      column="stato"
                      onFilter={handleColumnFilter}
                      filterValue={columnFilters['stato']}
                      availableValues={getUniqueFilterValues('stato')}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableSortLabel
                      active={orderBy === 'sf_territory'}
                      direction={orderBy === 'sf_territory' ? order : 'asc'}
                      onClick={() => handleRequestSort('sf_territory')}
                    >
                      Territorio
                    </TableSortLabel>
                    <ColumnFilter 
                      column="sf_territory"
                      onFilter={handleColumnFilter}
                      filterValue={columnFilters['sf_territory']}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TableSortLabel
                      active={orderBy === 'rrp_segment'}
                      direction={orderBy === 'rrp_segment' ? order : 'asc'}
                      onClick={() => handleRequestSort('rrp_segment')}
                    >
                      Segmento
                    </TableSortLabel>
                    <ColumnFilter 
                      column="rrp_segment"
                      onFilter={handleColumnFilter}
                      filterValue={columnFilters['rrp_segment']}
                    />
                  </Box>
                </TableCell>
                
                {/* Colonna PM Assegnato solo per i manager */}
                {isManager && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TableSortLabel
                        active={orderBy === 'pm_full_name'}
                        direction={orderBy === 'pm_full_name' ? order : 'asc'}
                        onClick={() => handleRequestSort('pm_full_name')}
                      >
                        PM Assegnato
                      </TableSortLabel>
                      <ColumnFilter 
                        column="pm_full_name"
                        onFilter={handleColumnFilter}
                        filterValue={columnFilters['pm_full_name']}
                        availableValues={getUniqueFilterValues('pm_full_name')}
                      />
                    </Box>
                  </TableCell>
                )}
                
                <TableCell align="center">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <TableRow 
                    key={row.id} 
                    hover
                    selected={isRowSelected(row.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isRowSelected(row.id)}
                        onChange={(event) => handleRowSelect(event, row.id)}
                        inputProps={{ 'aria-labelledby': `enhanced-table-checkbox-${row.id}` }}
                      />
                    </TableCell>
                    <TableCell>{row.nome_account}</TableCell>
                    <TableCell>{row.tipo_attivita_desc}</TableCell>
                    <TableCell>{formatStatusBadge(row.stato)}</TableCell>
                    <TableCell>{row.sf_territory}</TableCell>
                    <TableCell>{row.rrp_segment}</TableCell>
                    
                    {/* PM Assegnato (solo per i manager) */}
                    {isManager && (
                      <TableCell>
                        {row.pm_full_name ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar 
                              sx={{ 
                                width: 24, 
                                height: 24, 
                                fontSize: '0.75rem', 
                                bgcolor: 'primary.main' 
                              }}
                            >
                              {getInitials(row.pm_full_name)}
                            </Avatar>
                            {row.pm_full_name}
                          </Box>
                        ) : (
                          <Chip 
                            label="Non assegnato" 
                            size="small" 
                            variant="outlined" 
                            color="default"
                          />
                        )}
                      </TableCell>
                    )}
                    
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => handleActionClick(e, row)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                 <TableCell colSpan={isManager ? 8 : 7} align="center">
                   Nessun dato disponibile
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
         </Table>
       </TableContainer>
       <TablePagination
         rowsPerPageOptions={[10, 25, 50, 100]}
         component="div"
         count={filteredData.length}
         rowsPerPage={rowsPerPage}
         page={page}
         onPageChange={handleChangePage}
         onRowsPerPageChange={handleChangeRowsPerPage}
         labelRowsPerPage="Righe per pagina:"
         labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
       />
     </Paper>

     {/* Menu Azioni per singola riga */}
     <Menu
       anchorEl={actionMenuAnchor}
       open={Boolean(actionMenuAnchor)}
       onClose={handleCloseActionMenu}
     >
       <MenuItem onClick={() => handleOpenPanel('tasks', selectedRow?.id)}>
         <TasksIcon fontSize="small" sx={{ mr: 1 }} />
         Attività
       </MenuItem>
       
       {/* Mostra "Cambia Stato" solo se l'utente è un PM o se è manager e il POS ha un PM assegnato */}
       {(!isManager || (isManager && selectedRow?.pm_id)) && (
         <MenuItem onClick={() => handleOpenPanel('status', selectedRow?.id)}>
           <EditIcon fontSize="small" sx={{ mr: 1 }} />
           Cambia Stato
         </MenuItem>
       )}
       
       <MenuItem onClick={() => handleOpenPanel('documents', selectedRow?.id)}>
         <FolderIcon fontSize="small" sx={{ mr: 1 }} />
         Documenti
       </MenuItem>
       
       {/* Opzione "Assegna PM" solo per i manager */}
       {isManager && (
         <MenuItem onClick={() => handleOpenPanel('assign', selectedRow?.id)}>
           <ManagerIcon fontSize="small" sx={{ mr: 1 }} />
           Assegna PM
         </MenuItem>
       )}
     </Menu>
     
     {/* Menu Azioni Batch */}
     <Menu
       anchorEl={batchActionAnchorEl}
       open={Boolean(batchActionAnchorEl)}
       onClose={handleBatchActionClose}
     >
       {isManager && (
         <MenuItem onClick={handleBatchAssignPM}>
           <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
           Assegna PM
         </MenuItem>
       )}
       <MenuItem onClick={handleBatchChangeStatus}>
         <EditIcon fontSize="small" sx={{ mr: 1 }} />
         Cambia Stato
       </MenuItem>
       
       {/* Nuova opzione per ottimizzazione percorsi */}
       <MenuItem onClick={handleOpenRouteOptimizer}>
         <RouteIcon fontSize="small" sx={{ mr: 1 }} />
         Ottimizza percorso visite
       </MenuItem>
     </Menu>

     {/* Dialog per azioni batch */}
     <BatchAssignPMDialog 
       open={assignPMDialogOpen}
       onClose={() => setAssignPMDialogOpen(false)}
       onAssign={handleBatchAssignPMSubmit}
       selectedRows={selectedRows}
       pmList={pmList}
     />
     
     <BatchChangeStatusDialog 
       open={changeStatusDialogOpen}
       onClose={() => setChangeStatusDialogOpen(false)}
       onChangeStatus={handleBatchChangeStatusSubmit}
       selectedRows={selectedRows}
       statiList={availableStates}
     />
     
     {/* Dialog di ottimizzazione percorsi */}
     <RouteOptimizerDialog 
       open={routeOptimizerDialogOpen}
       onClose={() => setRouteOptimizerDialogOpen(false)}
       selectedRows={selectedRows}
       selectedPosData={filteredData.filter(row => selectedRows.includes(row.id))}
     />

     {/* Panel di dettaglio dell'ordine */}
     {selectedOrderId && (
       <OrderDetailPanel
         posOrderId={selectedOrderId}
         onClose={handleClosePanel}
         onUpdate={refreshData}
         isManager={isManager}
       />
     )}

     {/* Altri pannelli */}
     {activePanelType === 'status' && (
       <StatusPanel 
         posId={activePanelId} 
         onClose={handleClosePanel}
         onUpdate={refreshData}
         availableStates={availableStates.filter(s => s.tipo === 'ordine')}
       />
     )}

     {activePanelType === 'documents' && (
       <DocumentsPanel 
         posId={activePanelId} 
         onClose={handleClosePanel}
       />
     )}

     {/* Pannello per l'assegnazione del PM */}
     {activePanelType === 'assign' && isManager && (
       <AssignPMPanel 
         posId={activePanelId} 
         onClose={handleClosePanel}
         onUpdate={refreshData}
         pmList={pmList}
       />
     )}
   </>
 );
};

export default POSTable;