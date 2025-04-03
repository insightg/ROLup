import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Divider,
  Button,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  ClearAll as ClearIcon,
  Place as PlaceIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useRouteOptimizerStore } from '../stores/routeOptimizerStore';
import { fetchPOSLocations } from '../api/routeOptimizerApi';

const POSTableWithSelection = () => {
  const { 
    availablePOS, 
    locations, 
    addLocation, 
    removeLocation, 
    updateLocation,
    setAvailablePOS
  } = useRouteOptimizerStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Paginazione
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Effettua la ricerca sul server quando cambia il termine di ricerca
  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const response = await fetchPOSLocations(searchQuery);
      
      if (!response || !response.success) {
        console.error("Error in search response:", response?.error || "Unknown error");
        setAvailablePOS([]);
        return;
      }
      
      const results = response.data || [];
      
      // Verifica che results sia un array
      if (!Array.isArray(results)) {
        console.error("Search results are not an array:", results);
        setAvailablePOS([]);
        return;
      }
      
      setAvailablePOS(results);
      setPage(0);
    } catch (error) {
      console.error("Error searching POS:", error);
      setAvailablePOS([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Gestisce l'invio della ricerca
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  // Genera dati di location
  const createLocationData = (pos) => {
    return {
      id: `pos_${pos.id}`,
      name: pos.nome_account,
      address: getFullAddress(pos),
      sf_territory: pos.sf_territory || "-",
      sf_region: pos.sf_region || "-",
      duration: 30, // Default duration
      priority: 'normal', // Default priority
      notes: '',
      lat: pos.lat,
      lng: pos.lng
    };
  };

  // Aggiunge un POS alla selezione
  const handleAddPOS = (pos) => {
    const locationId = `pos_${pos.id}`;
    if (!locations.some(loc => loc.id === locationId)) {
      addLocation(createLocationData(pos));
    }
  };

  // Rimuove un POS dalla selezione
  const handleRemovePOS = (locationId) => {
    removeLocation(locationId);
  };

  // Verifica se un POS è selezionato
  const isSelected = (pos) => {
    return locations.some(loc => loc.id === `pos_${pos.id}`);
  };

  // Gestione modifica durata
  const handleChangeDuration = (locationId, newDuration) => {
    updateLocation(locationId, { duration: newDuration });
  };
  
  // Gestione modifica priorità
  const handleChangePriority = (locationId, newPriority) => {
    updateLocation(locationId, { priority: newPriority });
  };

  const getFullAddress = (pos) => {
    const parts = [];
    if (pos.indirizzo_spedizioni) parts.push(pos.indirizzo_spedizioni);
    if (pos.citt_spedizioni) parts.push(pos.citt_spedizioni);
    if (pos.cap_spedizioni) parts.push(pos.cap_spedizioni);
    return parts.join(', ') || "Indirizzo non disponibile";
  };

  // Gestione paginazione
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Funzione per cancellare la ricerca
  const clearSearch = async () => {
    setSearchQuery('');
    try {
      setIsSearching(true);
      const response = await fetchPOSLocations('');
      
      if (!response || !response.success) {
        console.error("Error in clear search response:", response?.error || "Unknown error");
        setAvailablePOS([]);
        return;
      }
      
      const results = response.data || [];
      
      // Verifica che results sia un array
      if (!Array.isArray(results)) {
        console.error("Clear search results are not an array:", results);
        setAvailablePOS([]);
        return;
      }
      
      setAvailablePOS(results);
      setPage(0);
    } catch (error) {
      console.error("Error clearing search:", error);
      setAvailablePOS([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Calcola righe da visualizzare con paginazione
  const displayedRows = Array.isArray(availablePOS) 
    ? availablePOS.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  // Carica i dati iniziali
  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sezione 1: Punti Selezionati */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Punti Selezionati ({locations.length})
        </Typography>

        {locations.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            Nessun POS selezionato. Aggiungi POS dalla lista sottostante.
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 200 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nome POS</TableCell>
                  <TableCell>Durata</TableCell>
                  <TableCell>Priorità</TableCell>
                  <TableCell align="right" width="40px">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locations.map(location => (
                  <TableRow key={location.id} hover>
                    <TableCell>
                      <Typography variant="body2">{location.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{location.sf_territory}</Typography>
                    </TableCell>
                    <TableCell>
  <TextField
    type="number"
    size="small"
    value={location.duration}
    onChange={(e) => handleChangeDuration(location.id, parseInt(e.target.value) || 30)}
    InputProps={{
      endAdornment: <InputAdornment position="end">min</InputAdornment>,
      sx: { width: '120px' } // Increased from 90px to 120px
    }}
    inputProps={{ min: 5, max: 240, step: 5 }}
  />
</TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={location.priority}
                          onChange={(e) => handleChangePriority(location.id, e.target.value)}
                          sx={{ minWidth: '100px' }}
                        >
                          <MenuItem value="high">Alta</MenuItem>
                          <MenuItem value="normal">Media</MenuItem>
                          <MenuItem value="low">Bassa</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemovePOS(location.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Sezione 2: Ricerca dei POS */}
      <Box sx={{ mb: 2 }}>
        <form onSubmit={handleSearchSubmit}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Cerca POS per nome, indirizzo, territorio, regione, ecc."
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isSearching ? (
                      <CircularProgress size={20} />
                    ) : (
                      <IconButton 
                        type="submit"
                        edge="end"
                      >
                        <SearchIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                )
              }}
            />
            
            <Button 
              variant="outlined" 
              startIcon={<ClearIcon />}
              onClick={clearSearch}
              size="small"
              disabled={isSearching}
            >
              Reset
            </Button>
          </Box>
        </form>
        
        <Divider sx={{ my: 2 }} />
      </Box>
      
      {/* Sezione 3: Tabella POS disponibili */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width="80px" align="center">Aggiungi</TableCell>
                <TableCell>Nome POS</TableCell>
                <TableCell>Indirizzo</TableCell>
                <TableCell>Territorio</TableCell>
                <TableCell>Regione</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isSearching ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} />
                    <Typography sx={{ ml: 2 }}>Ricerca in corso...</Typography>
                  </TableCell>
                </TableRow>
              ) : displayedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    {searchQuery.length > 0 
                      ? 'Nessun risultato trovato. Prova con una ricerca diversa.' 
                      : 'Nessun POS disponibile. Verifica la connessione al database.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayedRows.map((pos) => {
                  const isItemSelected = isSelected(pos);
                  const locationId = `pos_${pos.id}`;
                  
                  return (
                    <TableRow
                      key={locationId}
                      hover
                      selected={isItemSelected}
                      sx={{ 
                        '&.Mui-selected': { 
                          bgcolor: 'action.selected' 
                        },
                        '&:hover': { 
                          bgcolor: 'action.hover' 
                        }
                      }}
                    >
                      <TableCell align="center">
                        {isItemSelected ? (
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemovePOS(locationId)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleAddPOS(pos)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{pos.nome_account}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <PlaceIcon fontSize="small" sx={{ mt: 0.2, mr: 0.5, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">{pos.indirizzo_spedizioni || '-'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pos.citt_spedizioni} {pos.cap_spedizioni}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{pos.sf_territory || '-'}</TableCell>
                      <TableCell>{pos.sf_region || '-'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Footer con paginazione e selezioni */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {locations.length} POS selezionati su {Array.isArray(availablePOS) ? availablePOS.length : 0} trovati
          </Typography>
          
          <TablePagination
            rowsPerPageOptions={[10, 15, 25, 50]}
            component="div"
            count={Array.isArray(availablePOS) ? availablePOS.length : 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Righe:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default POSTableWithSelection;