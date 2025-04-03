import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Typography,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import anagraficaApi from './api/anagraficaApi';

/**
 * Componente tabella semplificato che evita di usare la libreria React Table
 * per diagnosticare problemi di visualizzazione dati.
 */
const SimpleTable = () => {
  // Stati base
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Colonne fisse per la tabella semplificata
  const columns = [
    { id: 'id', label: 'ID', minWidth: 50 },
    { id: 'nome_account', label: 'Nome Account', minWidth: 170 },
    { id: 'sf_region', label: 'SF Region', minWidth: 100 },
    { id: 'sf_district', label: 'SF District', minWidth: 100 },
    { id: 'sf_territory', label: 'SF Territory', minWidth: 100 },
    { id: 'telefono', label: 'Telefono', minWidth: 120 },
    { id: 'email', label: 'Email', minWidth: 170 },
  ];

  // Funzione per recuperare i dati
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await anagraficaApi.getData({ page: 1, pageSize: 100 });
      console.log("SimpleTable: Raw response type:", typeof response);
      console.log("SimpleTable: Response has success?", response && typeof response.success !== 'undefined');
      console.log("SimpleTable: Response has data?", response && typeof response.data !== 'undefined');
      
      // Debug dettagliato sulla struttura dei dati
      console.log("SimpleTable: Response structure:", {
        type: typeof response,
        keys: response ? Object.keys(response) : [],
        dataType: response && response.data ? (Array.isArray(response.data) ? 'array' : typeof response.data) : 'undefined',
        dataLength: response && response.data && Array.isArray(response.data) ? response.data.length : 'N/A'
      });
      
      if (response && response.success) {
        console.log("SimpleTable: Response is successful");
        
        // Logica aggiornata per gestire diversi formati di risposta
        let recordsData = [];
        
        if (Array.isArray(response.data)) {
          console.log("SimpleTable: data is a direct array");
          recordsData = response.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.log("SimpleTable: data is nested in data.data");
          recordsData = response.data.data;
        } else if (response.data && typeof response.data === 'object') {
          console.log("SimpleTable: data is an object, not an array. Converting...");
          // Prova a interpretare l'oggetto come un record singolo
          recordsData = [response.data];
        } else {
          console.error("SimpleTable: Unexpected data format:", response.data);
        }
        
        console.log(`SimpleTable: Recovered ${recordsData.length} records`);
        
        // Ulteriore debug per assicurarsi che i dati siano strutturati correttamente
        if (recordsData.length > 0) {
          console.log("SimpleTable: First record:", recordsData[0]);
          console.log("SimpleTable: First record keys:", Object.keys(recordsData[0]));
          
          // Verifica che ci siano le chiavi principali
          const requiredKeys = ['id', 'nome_account'];
          const missingKeys = requiredKeys.filter(key => 
            !Object.keys(recordsData[0]).includes(key) &&
            !Object.keys(recordsData[0]).map(k => k.toLowerCase()).includes(key.toLowerCase())
          );
          
          if (missingKeys.length > 0) {
            console.warn(`SimpleTable: Missing required keys: ${missingKeys.join(', ')}`);
          }
        }
        
        setData(recordsData);
        setFilteredData(recordsData);
      } else {
        console.error("SimpleTable: API response was not successful:", response);
        setError("Errore nel formato della risposta dall'API");
      }
    } catch (err) {
      console.error("Errore nel recupero dati:", err);
      setError(err.message || "Errore nel recupero dei dati");
    } finally {
      setLoading(false);
    }
  };

  // Carica i dati all'avvio
  useEffect(() => {
    fetchData();
  }, []);

  // Filtraggio semplice
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(data);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = data.filter(row => {
        return Object.values(row).some(value => 
          value !== null && value.toString().toLowerCase().includes(query)
        );
      });
      setFilteredData(filtered);
    }
    setPage(0); // Reset alla prima pagina quando cambia il filtro
  }, [searchQuery, data]);

  // Gestione cambio pagina
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Gestione cambio righe per pagina
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Funzione per accedere in modo case-insensitive ai valori
  const getCellValue = (row, columnId) => {
    // Accesso diretto
    if (row[columnId] !== undefined) {
      return row[columnId];
    }
    
    // Accesso case-insensitive
    const lowerColumnId = columnId.toLowerCase();
    const key = Object.keys(row).find(k => k.toLowerCase() === lowerColumnId);
    return key !== undefined ? row[key] : '';
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #ddd' }}>
        <TextField
          label="Cerca"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mr: 2, width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <IconButton onClick={fetchData} color="primary" title="Aggiorna dati">
          <RefreshIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2">
          {filteredData.length} record{filteredData.length !== data.length ? ` (filtrati da ${data.length})` : ''}
        </Typography>
      </Box>

      {/* Contenitore tabella */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1
          }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2, color: 'error.main' }}>
            <Typography>{error}</Typography>
          </Box>
        )}

        <TableContainer sx={{ maxHeight: 'calc(100% - 52px)', overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow hover role="checkbox" tabIndex={-1} key={row.id || index}>
                      {columns.map((column) => {
                        const value = getCellValue(row, column.id);
                        return (
                          <TableCell key={column.id}>
                            <Tooltip title={value || ''}>
                              <span>{value || ''}</span>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Typography sx={{ py: 2 }}>
                      {loading ? 'Caricamento dati...' : error ? 'Si è verificato un errore' : 'Nessun record disponibile'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Paginazione */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default SimpleTable;