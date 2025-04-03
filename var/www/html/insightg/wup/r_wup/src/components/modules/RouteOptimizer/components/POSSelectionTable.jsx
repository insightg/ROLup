import React, { useState, useEffect } from 'react';
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
  Checkbox,
  Chip,
  Typography
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useRouteStore } from '../store/routeStore';

const POSSelectionTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  
  const { 
    availablePos, 
    selectedPos, 
    addPosToSelection, 
    removePosFromSelection, 
    setVisitDuration,
    setPosVisitPriority
  } = useRouteStore();
  
  // Filtro dati in base alla ricerca
  useEffect(() => {
    if (!availablePos) return;
    
    let filtered = [...availablePos];
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(pos => 
        pos.nome_account?.toLowerCase().includes(lowerSearchTerm) ||
        pos.indirizzo_spedizioni?.toLowerCase().includes(lowerSearchTerm) ||
        pos.citt_spedizioni?.toLowerCase().includes(lowerSearchTerm) ||
        pos.sf_territory?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    setFilteredData(filtered);
    setPage(0);
  }, [availablePos, searchTerm]);

  // Gestori paginazione
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Gestione selezione POS
  const handlePosSelect = (pos) => {
    if (isSelected(pos.id)) {
      removePosFromSelection(pos.id);
    } else {
      // Aggiunge con durata visita di default (30 minuti)
      addPosToSelection({...pos, visitDuration: 30, priority: 'normal'});
    }
  };
  
  const isSelected = (posId) => {
    return selectedPos.some(pos => pos.id === posId);
  };
  
  // Calcola le righe per la pagina corrente
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
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
        
        <Typography variant="body2" color="text.secondary">
          {selectedPos.length} POS selezionati
        </Typography>
      </Box>
      
      <Paper sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={{ flexGrow: 1 }}>
          <Table stickyHeader aria-label="pos selection table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    disabled
                    indeterminate
                  />
                </TableCell>
                <TableCell>Nome POS</TableCell>
                <TableCell>Indirizzo</TableCell>
                <TableCell>Territorio</TableCell>
                <TableCell>Segmento</TableCell>
                <TableCell align="center">Durata Visita</TableCell>
                <TableCell align="center">Priorità</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((pos) => {
                  const isItemSelected = isSelected(pos.id);
                  const selectedItem = selectedPos.find(item => item.id === pos.id);
                  
                  return (
                    <TableRow
                      hover
                      onClick={() => handlePosSelect(pos)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={pos.id}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          inputProps={{
                            'aria-labelledby': `enhanced-table-checkbox-${pos.id}`,
                          }}
                        />
                      </TableCell>
                      <TableCell component="th" scope="row">
                        {pos.nome_account}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          {pos.indirizzo_spedizioni}, {pos.citt_spedizioni}
                        </Box>
                      </TableCell>
                      <TableCell>{pos.sf_territory}</TableCell>
                      <TableCell>{pos.rrp_segment}</TableCell>
                      <TableCell align="center">
                        {isItemSelected ? (
                          <TextField
                            type="number"
                            size="small"
                            value={selectedItem.visitDuration}
                            onChange={(e) => {
                              const newDuration = Math.max(5, Math.min(480, parseInt(e.target.value) || 30));
                              setVisitDuration(pos.id, newDuration);
                              e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">min</InputAdornment>,
                              inputProps: { min: 5, max: 480 }
                            }}
                            sx={{ width: 100 }}
                          />
                        ) : (
                          '30 min'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {isItemSelected ? (
                          <Box 
                            onClick={(e) => e.stopPropagation()}
                            sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}
                          >
                            {['high', 'normal', 'low'].map((priority) => (
                              <Chip
                                key={priority}
                                label={priority === 'high' ? 'Alta' : priority === 'normal' ? 'Media' : 'Bassa'}
                                color={priority === 'high' ? 'error' : priority === 'normal' ? 'primary' : 'default'}
                                size="small"
                                variant={selectedItem.priority === priority ? 'filled' : 'outlined'}
                                onClick={(e) => {
                                  setPosVisitPriority(pos.id, priority);
                                  e.stopPropagation();
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Chip label="Media" color="primary" size="small" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nessun POS disponibile
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Righe per pagina:"
        />
      </Paper>
    </Box>
  );
};

export default POSSelectionTable;


# ====== File: /var/www/html/insightg/wup/r_wup/src/components/modules/RouteOptimizer/components/RouteScheduleTable.jsx ======
