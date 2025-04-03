import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Paper,
  InputAdornment,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Tooltip,
  CircularProgress,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ClearAll as ClearIcon,
  Place as PlaceIcon
} from '@mui/icons-material';
import { useRouteOptimizerStore } from '../stores/routeOptimizerStore';

const POSTable = () => {
  const { availablePOS, addLocation } = useRouteOptimizerStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPOS, setFilteredPOS] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regionFilter, setRegionFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Paginazione della tabella POS
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Compila le liste uniche di regioni, territori e segmenti
  const getUniqueValues = (array, field) => {
    if (!array || !Array.isArray(array)) return [];
    const values = array.map(item => item[field]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const regions = getUniqueValues(availablePOS, 'sf_region');
  const territories = getUniqueValues(availablePOS, 'sf_territory');
  const segments = getUniqueValues(availablePOS, 'rrp_segment');

  // Filtra i POS in base alla ricerca e ai filtri selezionati
  useEffect(() => {
    if (!availablePOS || !Array.isArray(availablePOS)) return;
    
    let filtered = [...availablePOS];
    
    // Applica il filtro di ricerca testuale
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pos => 
        (pos.nome_account?.toLowerCase().includes(query)) || 
        (pos.indirizzo_spedizioni?.toLowerCase().includes(query)) ||
        (pos.citt_spedizioni?.toLowerCase().includes(query)) ||
        (pos.sf_territory?.toLowerCase().includes(query))
      );
    }
    
    // Applica i filtri selezionati
    if (regionFilter) {
      filtered = filtered.filter(pos => pos.sf_region === regionFilter);
    }
    
    if (territoryFilter) {
      filtered = filtered.filter(pos => pos.sf_territory === territoryFilter);
    }
    
    if (segmentFilter) {
      filtered = filtered.filter(pos => pos.rrp_segment === segmentFilter);
    }
    
    setFilteredPOS(filtered);
    setPage(0); // Reset alla prima pagina dopo il filtro
  }, [searchQuery, regionFilter, territoryFilter, segmentFilter, availablePOS]);

  // Inizializza i dati filtrati all'avvio
  useEffect(() => {
    if (availablePOS && availablePOS.length > 0 && filteredPOS.length === 0) {
      setFilteredPOS(availablePOS);
    }
  }, [availablePOS]);

  // Aggiungi punto
  const handleAddLocation = async (pos) => {
    setLoading(true);
    try {
      const locationData = {
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
      
      addLocation(locationData);
      showNotification(`"${pos.nome_account}" aggiunto ai POS selezionati`);
    } catch (error) {
      console.error("Error adding location:", error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message) => {
    // Implementata tramite props o context
    console.log(message);
  };

  const getFullAddress = (pos) => {
    const parts = [];
    if (pos.indirizzo_spedizioni) parts.push(pos.indirizzo_spedizioni);
    if (pos.citt_spedizioni) parts.push(pos.citt_spedizioni);
    if (pos.cap_spedizioni) parts.push(pos.cap_spedizioni);
    return parts.join(', ') || "Indirizzo non disponibile";
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRegionFilter('');
    setTerritoryFilter('');
    setSegmentFilter('');
    setShowFilters(false);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header con ricerca e filtri */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="Cerca POS per nome, indirizzo o territorio"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          
          <Button 
            variant="outlined" 
            startIcon={showFilters ? <ClearIcon /> : <FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
          >
            {showFilters ? 'Nascondi Filtri' : 'Filtri'}
          </Button>
        </Box>
        
        {showFilters && (
          <Box sx={{ mb: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Regione</InputLabel>
                  <Select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    label="Regione"
                  >
                    <MenuItem value="">Tutte le regioni</MenuItem>
                    {regions.map(region => (
                      <MenuItem key={region} value={region}>{region}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Territorio</InputLabel>
                  <Select
                    value={territoryFilter}
                    onChange={(e) => setTerritoryFilter(e.target.value)}
                    label="Territorio"
                  >
                    <MenuItem value="">Tutti i territori</MenuItem>
                    {territories.map(territory => (
                      <MenuItem key={territory} value={territory}>{territory}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Segmento</InputLabel>
                  <Select
                    value={segmentFilter}
                    onChange={(e) => setSegmentFilter(e.target.value)}
                    label="Segmento"
                  >
                    <MenuItem value="">Tutti i segmenti</MenuItem>
                    {segments.map(segment => (
                      <MenuItem key={segment} value={segment}>{segment}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button 
                size="small" 
                onClick={clearFilters}
                startIcon={<ClearIcon />}
              >
                Cancella filtri
              </Button>
            </Box>
          </Box>
        )}
        
        <Divider />
      </Box>
      
      {/* Tabella POS */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" width="50px" align="center">Aggiungi</TableCell>
                <TableCell>Nome POS</TableCell>
                <TableCell>Indirizzo</TableCell>
                <TableCell>Territorio</TableCell>
                <TableCell width="120px">Regione</TableCell>
                <TableCell width="120px">Segmento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              )}
              
              {!loading && displayedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    {availablePOS?.length > 0 
                      ? 'Nessun POS trovato con i filtri impostati' 
                      : 'Caricamento POS in corso...'}
                  </TableCell>
                </TableRow>
              )}
              
              {!loading && displayedRows.map((pos) => (
                <TableRow
                  key={pos.id}
                  hover
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell padding="checkbox" align="center">
                    <Tooltip title="Aggiungi ai POS selezionati">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleAddLocation(pos)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
                  <TableCell>
                    {pos.sf_region && (
                      <Chip 
                        size="small" 
                        label={pos.sf_region} 
                        color="primary" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {pos.rrp_segment && (
                      <Chip 
                        size="small" 
                        label={pos.rrp_segment} 
                        color="secondary" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Footer con paginazione */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {filteredPOS.length} POS filtrati su {availablePOS?.length || 0} totali
          </Typography>
          
          <TablePagination
            rowsPerPageOptions={[10, 20, 50, 100]}
            component="div"
            count={filteredPOS.length}
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

export default POSTable;