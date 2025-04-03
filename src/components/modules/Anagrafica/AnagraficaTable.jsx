import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';

/**
 * Componente Tabella Anagrafica
 * Visualizza i dati anagrafica in una tabella con funzionalità di ricerca, paginazione e dettaglio record
 */
const AnagraficaTable = () => {
  // Stati di base
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUsingTestData, setIsUsingTestData] = useState(false);

  // Colonne della tabella
  const columns = [
    { id: 'id', label: 'ID', width: 70 },
    { id: 'nome_account', label: 'Nome Account', width: 200 },
    { id: 'sf_region', label: 'Regione SF', width: 150 },
    { id: 'sf_district', label: 'Distretto SF', width: 150 },
    { id: 'sf_territory', label: 'Territorio SF', width: 150 },
    { id: 'tipo_di_record_account', label: 'Tipo Record', width: 150 },
    { id: 'rrp_segment', label: 'Segmento RRP', width: 150 },
    { id: 'trade', label: 'Trade', width: 120 },
    { id: 'telefono', label: 'Telefono', width: 150 },
    { id: 'mobile', label: 'Cellulare', width: 150 },
    { id: 'email', label: 'Email', width: 200 },
    { id: 'cap_spedizioni', label: 'CAP', width: 100 },
    { id: 'citt_spedizioni', label: 'Città', width: 150 },
    { id: 'field_rep', label: 'Field Rep', width: 150 },
    { id: 'actions', label: 'Azioni', width: 100 }
  ];

  // Caricamento dati dal backend
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Parametri di paginazione e ordinamento
      const params = new URLSearchParams({
        action: 'get',
        page: 1,
        pageSize: 100,  // Richiedi un numero ragionevole di record
        sortBy: 'nome_account',
        sortDir: 'asc'
      });
      
      // Assicuriamoci di inviare le credenziali con la richiesta
      const response = await fetch(`backend/r_anagrafica.php?${params.toString()}`, {
        method: 'GET',
        credentials: 'include', // Importante: invia cookie di sessione cross-origin
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          console.error('Errore di autenticazione:', response.status);
          // Tenta di diagnosticare il problema
          console.log('Controllando lo stato della sessione...');
          
          // Potremmo reindirizzare alla pagina di login o mostrare un errore specifico
          throw new Error(`Errore di autenticazione. Sessione scaduta o cookie non validi.`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      // Verifica che la risposta contenga i dati necessari
      if (!data || !data.success) {
        throw new Error(data.message || 'Risposta dal server non valida');
      }
      
      // Estrazione dei dati in base alla struttura
      let recordsData = [];
      
      if (Array.isArray(data.data)) {
        recordsData = data.data;
      } else if (data.data && Array.isArray(data.data.data)) {
        recordsData = data.data.data;
      } else {
        throw new Error('Formato dati non riconosciuto');
      }
      
      console.log(`Loaded ${recordsData.length} records from backend`);
      
      if (recordsData.length === 0) {
        console.warn('Backend returned zero records, using test data');
        const testData = generateTestData();
        setRecords(testData);
        setFilteredRecords(testData);
        setIsUsingTestData(true);
        setError('Nessun dato trovato nel database. Visualizzazione di dati di esempio.');
      } else {
        // Imposta i dati reali
        setRecords(recordsData);
        setFilteredRecords(recordsData);
        setError(null);
        setIsUsingTestData(false);
        console.log('Sample record:', recordsData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Errore: ${error.message}`);
      
      // Dati di fallback
      const fallbackData = generateTestData();
      setRecords(fallbackData);
      setFilteredRecords(fallbackData);
      setIsUsingTestData(true);
      setError('Utilizzo dati di test per visualizzazione (errore connessione al backend)');
    } finally {
      setLoading(false);
    }
  };

  // Genera dati di test per la visualizzazione offline
  const generateTestData = () => {
    const regions = ['Nord', 'Centro', 'Sud', 'Nord-Est', 'Nord-Ovest'];
    const districts = ['Milano', 'Roma', 'Napoli', 'Torino', 'Firenze', 'Bari', 'Bologna', 'Venezia'];
    const recordTypes = ['POS', 'HQ', 'Deposito', 'Filiale'];
    const segments = ['Bar', 'Ristorante', 'Hotel', 'Supermercato', 'Farmacia', 'Tabaccheria'];
    const trades = ['HoReCa', 'Retail', 'GDO', 'Pharma'];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      nome_account: `ACCOUNT TEST ${i + 1}`,
      sf_region: regions[Math.floor(Math.random() * regions.length)],
      sf_district: districts[Math.floor(Math.random() * districts.length)],
      sf_territory: `Territorio ${Math.floor(Math.random() * 10) + 1}`,
      tipo_di_record_account: recordTypes[Math.floor(Math.random() * recordTypes.length)],
      rrp_segment: segments[Math.floor(Math.random() * segments.length)],
      trade: trades[Math.floor(Math.random() * trades.length)],
      cap_spedizioni: `${10000 + Math.floor(Math.random() * 90000)}`,
      statoprovincia_spedizioni: districts[Math.floor(Math.random() * districts.length)],
      citt_spedizioni: districts[Math.floor(Math.random() * districts.length)],
      indirizzo_spedizioni: `Via Test ${i + 1}`,
      telefono: `0${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 10000000) + 1000000}`,
      mobile: `3${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 10000000) + 1000000}`,
      email: `test${i + 1}@example.com`,
      field_rep: `Rep ${Math.floor(Math.random() * 20) + 1}`,
      numero_field_rep: `FR${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
      supervisor: `Supervisor ${Math.floor(Math.random() * 10) + 1}`,
      numero_supervisor: `S${String(Math.floor(Math.random() * 50) + 1).padStart(3, '0')}`
    }));
  };

  // Carica i dati all'avvio del componente
  useEffect(() => {
    fetchData();
  }, []);

  // Filtra i dati in base alla ricerca
  useEffect(() => {
    if (!search.trim()) {
      setFilteredRecords(records);
      return;
    }
    
    const lowercaseSearch = search.toLowerCase();
    const filtered = records.filter(record => {
      return Object.entries(record).some(([_, value]) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowercaseSearch);
      });
    });
    
    setFilteredRecords(filtered);
    setPage(0); // Torna alla prima pagina quando cambia la ricerca
  }, [search, records]);

  // Handler per la ricerca
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  // Handler per il cambio pagina
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handler per il cambio righe per pagina
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handler per l'apertura del dettaglio record
  const handleOpenDetail = (record) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // Handler per la chiusura del dettaglio record
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedRecord(null);
  };

  // Handler per l'esportazione CSV
  const handleExportCsv = () => {
    try {
      // Verifica se ci sono dati da esportare
      if (filteredRecords.length === 0) {
        alert('Nessun dato da esportare');
        return;
      }
      
      // Definisci le intestazioni delle colonne
      const headers = columns
        .filter(col => col.id !== 'actions')
        .map(col => col.label);
      
      // Converti i dati in formato CSV
      const csvData = filteredRecords.map(record => {
        return columns
          .filter(col => col.id !== 'actions')
          .map(col => {
            // Recupera il valore della cella con la funzione case-insensitive
            const value = getCellValue(record, col.id);
            // Gestisci valori null, caratteri speciali e virgole
            return `"${value !== null && value !== undefined ? String(value).replace(/"/g, '""') : ''}"`;
          })
          .join(',');
      });
      
      // Unisci intestazioni e righe
      const csvContent = [headers.join(','), ...csvData].join('\n');
      
      // Crea blob e link per il download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `anagrafica_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV export completed');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert(`Errore durante l'esportazione: ${error.message}`);
    }
  };

  // Funzione per ottenere il valore di una cella (case-insensitive)
  const getCellValue = (record, columnId) => {
    // Se la colonna è "actions", restituiamo null per gestirla separatamente
    if (columnId === 'actions') return null;
    
    // Accesso diretto alla proprietà
    if (record[columnId] !== undefined) {
      return record[columnId];
    }
    
    // Accesso case-insensitive
    const lowerColumnId = columnId.toLowerCase();
    const key = Object.keys(record).find(k => k.toLowerCase() === lowerColumnId);
    return key !== undefined ? record[key] : '';
  };

  // Funzione per formattare le etichette in modo più leggibile
  const formatFieldLabel = (key) => {
    const labels = {
      'nome_account': 'Nome Account',
      'sf_region': 'Regione SF',
      'sf_district': 'Distretto SF',
      'sf_territory': 'Territorio SF',
      'tipo_di_record_account': 'Tipo di Record',
      'rrp_segment': 'Segmento RRP',
      'trade': 'Trade',
      'cap_spedizioni': 'CAP',
      'statoprovincia_spedizioni': 'Provincia',
      'citt_spedizioni': 'Città',
      'indirizzo_spedizioni': 'Indirizzo',
      'telefono': 'Telefono',
      'mobile': 'Cellulare',
      'email': 'Email',
      'field_rep': 'Field Rep',
      'numero_field_rep': 'Numero Field Rep',
      'supervisor': 'Supervisor',
      'numero_supervisor': 'Numero Supervisor',
    };
    
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Calcola l'indice dei record da visualizzare per la paginazione
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 2,
          ...(isUsingTestData && { borderLeft: '4px solid #ff9800' })
        }}
      >
        <TextField
          size="small"
          placeholder="Cerca..."
          value={search}
          onChange={handleSearchChange}
          sx={{ marginRight: 2, width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <IconButton color="primary" onClick={fetchData} disabled={loading} title="Aggiorna dati">
          <RefreshIcon />
        </IconButton>
        
        <IconButton color="primary" onClick={handleExportCsv} disabled={loading} title="Esporta CSV">
          <CloudDownloadIcon />
        </IconButton>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {isUsingTestData && (
          <Chip 
            label="DATI DI TEST" 
            color="warning" 
            size="small" 
            sx={{ mr: 2 }}
          />
        )}
        
        <Typography variant="body2" color="text.secondary">
          {filteredRecords.length} record{filteredRecords.length !== records.length ? ` (filtrati da ${records.length})` : ''}
        </Typography>
      </Paper>
      
      {/* Area messaggi */}
      {error && (
        <Alert 
          severity={isUsingTestData ? "warning" : "error"} 
          sx={{ marginBottom: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Riprova
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {/* Tabella principale */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
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
              zIndex: 5
            }}>
              <CircularProgress />
            </Box>
          )}
          
          <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      style={{
                        width: column.width,
                        minWidth: column.width,
                        backgroundColor: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <TableRow
                      hover
                      key={record.id}
                      sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.id}>
                          {column.id === 'actions' ? (
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDetail(record)}
                              title="Visualizza dettaglio"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <Tooltip title={getCellValue(record, column.id) || ''}>
                              <Typography
                                variant="body2"
                                sx={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {getCellValue(record, column.id) || ''}
                              </Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      <Box sx={{ py: 3 }}>
                        {loading ? (
                          <Typography>Caricamento dati...</Typography>
                        ) : error && !isUsingTestData ? (
                          <Box>
                            <Typography color="error" gutterBottom>
                              {error}
                            </Typography>
                            <Button variant="outlined" onClick={fetchData}>
                              Riprova
                            </Button>
                          </Box>
                        ) : search ? (
                          <Typography>Nessun record corrisponde ai criteri di ricerca</Typography>
                        ) : (
                          <Typography>Nessun record disponibile</Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        
        {/* Paginazione */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredRecords.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Righe per pagina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
        />
      </Paper>
      
      {/* Dialog dettaglio record */}
      <Dialog
        open={isDetailOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Dettaglio Record {selectedRecord?.nome_account && `- ${selectedRecord.nome_account}`}
            </Typography>
            <IconButton onClick={handleCloseDetail} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {selectedRecord && Object.entries(selectedRecord).map(([key, value]) => (
              <Grid item xs={6} key={key}>
                <Typography variant="caption" color="text.secondary">
                  {formatFieldLabel(key)}
                </Typography>
                <Typography variant="body1">
                  {value !== null && value !== undefined ? value : '-'}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail} color="primary" variant="contained">
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnagraficaTable;