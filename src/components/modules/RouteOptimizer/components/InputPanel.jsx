import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useRouteOptimizerStore } from '../stores/routeOptimizerStore';
import { geocodeAddress } from '../api/routeOptimizerApi';

const InputPanel = () => {
  const { locations, availablePOS, addLocation, removeLocation } = useRouteOptimizerStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPOS, setFilteredPOS] = useState([]);
  const [selectedPOS, setSelectedPOS] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Paginazione della tabella POS
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filtra i POS in base alla ricerca
  useEffect(() => {
    if (!availablePOS) return;
    
    if (searchQuery.length < 2) {
      setFilteredPOS(availablePOS.slice(0, 100)); // Limita a 100 record per prestazioni
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = availablePOS.filter(pos => 
      pos.nome_account?.toLowerCase().includes(query) || 
      pos.indirizzo_spedizioni?.toLowerCase().includes(query) ||
      pos.sf_territory?.toLowerCase().includes(query)
    );
    
    setFilteredPOS(filtered);
    setPage(0); // Reset alla prima pagina dopo il filtro
  }, [searchQuery, availablePOS]);

  // Inizializza i dati filtrati all'avvio
  useEffect(() => {
    if (availablePOS && availablePOS.length > 0 && filteredPOS.length === 0) {
      setFilteredPOS(availablePOS.slice(0, 100));
    }
  }, [availablePOS]);

  // Aggiungi punto
  const handleAddLocation = async () => {
    setLoading(true);
    try {
      let locationData;
      
      if (selectedPOS) {
        // POS selezionato dalla tabella
        locationData = {
          id: `pos_${selectedPOS.id}`,
          name: selectedPOS.nome_account,
          address: selectedPOS.indirizzo_spedizioni || "Indirizzo non disponibile",
          sf_territory: selectedPOS.sf_territory || "-",
          duration: duration,
          priority: priority,
          notes: notes
        };
      } else if (manualAddress) {
        // Indirizzo manuale con geocodifica
        try {
          const geocodeResult = await geocodeAddress(manualAddress);
          
          locationData = {
            id: `manual_${Date.now()}`,
            name: `Indirizzo: ${manualAddress}`,
            address: manualAddress,
            lat: geocodeResult.data.lat,
            lng: geocodeResult.data.lng,
            sf_territory: "-",
            duration: duration,
            priority: priority,
            notes: notes
          };
        } catch (error) {
          throw new Error(`Errore nella geocodifica: ${error.message}`);
        }
      } else {
        throw new Error('Seleziona un POS o inserisci un indirizzo');
      }
      
      addLocation(locationData);
      
      // Reset form
      setSelectedPOS(null);
      setManualAddress('');
      setDuration(30);
      setNotes('');
    } catch (error) {
      console.error("Error adding location:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Gestione paginazione
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calcola righe da visualizzare
  const displayedRows = filteredPOS.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Punti da Visitare
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Grid container spacing={2}>
        {/* Ricerca POS */}
        <Grid item xs={12}>
          <TextField
            label="Cerca POS per nome, indirizzo o territorio"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        {/* Tabella POS */}
        <Grid item xs={12}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" width="40px">Sel.</TableCell>
                    <TableCell>Nome POS</TableCell>
                    <TableCell>Indirizzo</TableCell>
                    <TableCell>Territorio</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {availablePOS?.length > 0 
                          ? 'Nessun POS trovato con questo filtro' 
                          : 'Caricamento POS in corso...'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map((pos) => (
                      <TableRow
                        key={pos.id}
                        hover
                        selected={selectedPOS?.id === pos.id}
                        onClick={() => setSelectedPOS(pos)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <IconButton 
                            size="small" 
                            color={selectedPOS?.id === pos.id ? "primary" : "default"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPOS(pos);
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{pos.nome_account}</TableCell>
                        <TableCell>{pos.indirizzo_spedizioni || '-'}</TableCell>
                        <TableCell>{pos.sf_territory || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredPOS.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Grid>
        
        {/* POS selezionato o indirizzo manuale */}
        <Grid item xs={12}>
          {selectedPOS ? (
            <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2">POS selezionato:</Typography>
              <Typography variant="body1">{selectedPOS.nome_account}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPOS.indirizzo_spedizioni || 'Indirizzo non disponibile'}
              </Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setSelectedPOS(null)}>
                Annulla selezione
              </Button>
            </Paper>
          ) : (
            <TextField
              label="O inserisci indirizzo manualmente"
              fullWidth
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              variant="outlined"
            />
          )}
        </Grid>
        
        {/* Durata visita */}
        <Grid item xs={12} md={4}>
          <TextField
            label="Durata visita (minuti)"
            type="number"
            fullWidth
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TimeIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        {/* Priorità */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Priorità</InputLabel>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              label="Priorità"
            >
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="normal">Normale</MenuItem>
              <MenuItem value="low">Bassa</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Note */}
        <Grid item xs={12} md={4}>
          <TextField
            label="Note"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Grid>
        
        {/* Pulsante per aggiungere */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
              onClick={handleAddLocation}
              disabled={(!selectedPOS && !manualAddress) || loading}
            >
              Aggiungi Punto
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      {/* Elenco punti selezionati */}
      <Typography variant="subtitle1" sx={{ mt: 4, mb: 2 }}>
        Punti Selezionati ({locations.length})
      </Typography>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome/Indirizzo</TableCell>
              <TableCell>Territorio</TableCell>
              <TableCell>Durata</TableCell>
              <TableCell>Priorità</TableCell>
              <TableCell>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Nessun punto selezionato. Aggiungi almeno due punti.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <Typography variant="body2">{location.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {location.address}
                    </Typography>
                  </TableCell>
                  <TableCell>{location.sf_territory}</TableCell>
                  <TableCell>{location.duration} min</TableCell>
                  <TableCell>{location.priority}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => removeLocation(location.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InputPanel;