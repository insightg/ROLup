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
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import anagraficaApi from './api/anagraficaApi';

/**
 * Componente reimplementato per la tabella anagrafica
 * Completamente semplificato per garantire la visualizzazione dei dati
 */
const NewAnagraficaTable = () => {
  // Stati di base
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isUsingTestData, setIsUsingTestData] = useState(false); // Flag per dati di test

  // Colonne da visualizzare
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

  // Caricamento dati diretto
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Utilizzo dell'API centralizzata
      const data = await anagraficaApi.getData({ page: 1, pageSize: 1000 });
      
      console.log('Raw response:', data);
      
      // Verifica che la risposta contenga i dati necessari
      if (!data || !data.success) {
        throw new Error('Risposta dal server non valida');
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
      
      console.log(`Loaded ${recordsData.length} records`);
      
      // Imposta i dati
      setRecords(recordsData);
      setFilteredRecords(recordsData);
      setError(null);
      setIsUsingTestData(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Errore durante il recupero dei dati');
      
      // Mostra un messaggio che stiamo usando dati di test
      console.log('Utilizzando dati di fallback per testing a causa dell\'errore API');
      // Imposta un messaggio di errore più amichevole con informazioni sul fallback
      setError(`Errore API: ${error.message}. Visualizzazione di dati di test per debug.`);
      
      // Dati di fallback per testing
      const fallbackData = [
        { id: 1, nome_account: 'BAR MARIO', sf_region: 'Nord', sf_district: 'Milano', sf_territory: 'Milano Centro', tipo_di_record_account: 'POS', rrp_segment: 'Bar', trade: 'HoReCa', cap_spedizioni: '20121', statoprovincia_spedizioni: 'Milano', citt_spedizioni: 'Milano', indirizzo_spedizioni: 'Via Dante 1', telefono: '02-12345678', mobile: '333-1234567', email: 'bar.mario@example.com', field_rep: 'Marco Bianchi', numero_field_rep: 'FR001', supervisor: 'Laura Verdi', numero_supervisor: 'S001' },
        { id: 2, nome_account: 'RISTORANTE BELLA NAPOLI', sf_region: 'Sud', sf_district: 'Napoli', sf_territory: 'Napoli Centro', tipo_di_record_account: 'POS', rrp_segment: 'Ristorante', trade: 'HoReCa', cap_spedizioni: '80100', statoprovincia_spedizioni: 'Napoli', citt_spedizioni: 'Napoli', indirizzo_spedizioni: 'Via Toledo 15', telefono: '081-7654321', mobile: '339-7654321', email: 'info@bellanapoli.example.com', field_rep: 'Giuseppe Esposito', numero_field_rep: 'FR002', supervisor: 'Antonio Russo', numero_supervisor: 'S002' },
        { id: 3, nome_account: 'HOTEL BELVEDERE', sf_region: 'Centro', sf_district: 'Roma', sf_territory: 'Roma Est', tipo_di_record_account: 'POS', rrp_segment: 'Hotel', trade: 'HoReCa', cap_spedizioni: '00185', statoprovincia_spedizioni: 'Roma', citt_spedizioni: 'Roma', indirizzo_spedizioni: 'Via Nazionale 43', telefono: '06-5432109', mobile: '335-6543210', email: 'reception@belvedere.example.com', field_rep: 'Francesca Rossi', numero_field_rep: 'FR003', supervisor: 'Roberto Belli', numero_supervisor: 'S003' },
        { id: 4, nome_account: 'CAFFÈ VENEZIA', sf_region: 'Nord-Est', sf_district: 'Venezia', sf_territory: 'Venezia Centro', tipo_di_record_account: 'POS', rrp_segment: 'Caffè', trade: 'HoReCa', cap_spedizioni: '30100', statoprovincia_spedizioni: 'Venezia', citt_spedizioni: 'Venezia', indirizzo_spedizioni: 'Campo San Marco 2', telefono: '041-8765432', mobile: '347-8765432', email: 'info@caffevenezia.example.com', field_rep: 'Elena Ferretti', numero_field_rep: 'FR004', supervisor: 'Marco Neri', numero_supervisor: 'S004' },
        { id: 5, nome_account: 'MINI MARKET DA LUIGI', sf_region: 'Nord-Ovest', sf_district: 'Torino', sf_territory: 'Torino Sud', tipo_di_record_account: 'POS', rrp_segment: 'Mini Market', trade: 'Retail', cap_spedizioni: '10135', statoprovincia_spedizioni: 'Torino', citt_spedizioni: 'Torino', indirizzo_spedizioni: 'Corso Unione Sovietica 100', telefono: '011-5432198', mobile: '340-5432198', email: 'daluigi@example.com', field_rep: 'Paolo Bianchi', numero_field_rep: 'FR005', supervisor: 'Alessia Verdi', numero_supervisor: 'S005' },
        { id: 6, nome_account: 'SUPERMERCATO PRIMAVERA', sf_region: 'Centro', sf_district: 'Firenze', sf_territory: 'Firenze Centro', tipo_di_record_account: 'POS', rrp_segment: 'Supermercato', trade: 'Retail', cap_spedizioni: '50122', statoprovincia_spedizioni: 'Firenze', citt_spedizioni: 'Firenze', indirizzo_spedizioni: 'Via dei Mille 21', telefono: '055-2345678', mobile: '338-2345678', email: 'info@primavera.example.com', field_rep: 'Stefano Ricci', numero_field_rep: 'FR006', supervisor: 'Maria Conti', numero_supervisor: 'S006' },
        { id: 7, nome_account: 'PIZZERIA DA MICHELE', sf_region: 'Sud', sf_district: 'Bari', sf_territory: 'Bari Centro', tipo_di_record_account: 'POS', rrp_segment: 'Pizzeria', trade: 'HoReCa', cap_spedizioni: '70121', statoprovincia_spedizioni: 'Bari', citt_spedizioni: 'Bari', indirizzo_spedizioni: 'Corso Vittorio Emanuele 45', telefono: '080-3456789', mobile: '331-3456789', email: 'damichele@example.com', field_rep: 'Antonio Basile', numero_field_rep: 'FR007', supervisor: 'Sara Romano', numero_supervisor: 'S007' },
        { id: 8, nome_account: 'GELATERIA PARADISO', sf_region: 'Nord', sf_district: 'Bologna', sf_territory: 'Bologna Centro', tipo_di_record_account: 'POS', rrp_segment: 'Gelateria', trade: 'HoReCa', cap_spedizioni: '40121', statoprovincia_spedizioni: 'Bologna', citt_spedizioni: 'Bologna', indirizzo_spedizioni: 'Via Indipendenza 12', telefono: '051-4567890', mobile: '346-4567890', email: 'paradiso@example.com', field_rep: 'Chiara Ferrari', numero_field_rep: 'FR008', supervisor: 'Luca Martini', numero_supervisor: 'S008' },
        { id: 9, nome_account: 'TABACCHERIA CENTRALE', sf_region: 'Centro', sf_district: 'Perugia', sf_territory: 'Perugia Centro', tipo_di_record_account: 'POS', rrp_segment: 'Tabaccheria', trade: 'Retail', cap_spedizioni: '06121', statoprovincia_spedizioni: 'Perugia', citt_spedizioni: 'Perugia', indirizzo_spedizioni: 'Corso Vannucci 32', telefono: '075-5678901', mobile: '342-5678901', email: 'tabaccheria.centrale@example.com', field_rep: 'Andrea Moretti', numero_field_rep: 'FR009', supervisor: 'Giulia Fabbri', numero_supervisor: 'S009' },
        { id: 10, nome_account: 'PUB IRLANDESE', sf_region: 'Nord-Ovest', sf_district: 'Genova', sf_territory: 'Genova Porto', tipo_di_record_account: 'POS', rrp_segment: 'Pub', trade: 'HoReCa', cap_spedizioni: '16124', statoprovincia_spedizioni: 'Genova', citt_spedizioni: 'Genova', indirizzo_spedizioni: 'Via al Porto Antico 5', telefono: '010-6789012', mobile: '344-6789012', email: 'info@pubirlandese.example.com', field_rep: 'Davide Rizzo', numero_field_rep: 'FR010', supervisor: 'Simona Gallo', numero_supervisor: 'S010' },
        { id: 11, nome_account: 'EDICOLA STAZIONE', sf_region: 'Nord', sf_district: 'Milano', sf_territory: 'Milano Nord', tipo_di_record_account: 'POS', rrp_segment: 'Edicola', trade: 'Retail', cap_spedizioni: '20124', statoprovincia_spedizioni: 'Milano', citt_spedizioni: 'Milano', indirizzo_spedizioni: 'Piazza Duca d\'Aosta 1', telefono: '02-7890123', mobile: '347-7890123', email: 'edicola.stazione@example.com', field_rep: 'Marco Bianchi', numero_field_rep: 'FR001', supervisor: 'Laura Verdi', numero_supervisor: 'S001' },
        { id: 12, nome_account: 'FARMACIA SAN PAOLO', sf_region: 'Sud', sf_district: 'Palermo', sf_territory: 'Palermo Centro', tipo_di_record_account: 'POS', rrp_segment: 'Farmacia', trade: 'Retail', cap_spedizioni: '90133', statoprovincia_spedizioni: 'Palermo', citt_spedizioni: 'Palermo', indirizzo_spedizioni: 'Via Roma 123', telefono: '091-8901234', mobile: '348-8901234', email: 'farmacia.sanpaolo@example.com', field_rep: 'Luigi Marino', numero_field_rep: 'FR012', supervisor: 'Giovanna Costa', numero_supervisor: 'S012' },
        { id: 13, nome_account: 'ALIMENTARI FRESCHI', sf_region: 'Centro', sf_district: 'Roma', sf_territory: 'Roma Nord', tipo_di_record_account: 'POS', rrp_segment: 'Alimentari', trade: 'Retail', cap_spedizioni: '00192', statoprovincia_spedizioni: 'Roma', citt_spedizioni: 'Roma', indirizzo_spedizioni: 'Viale Angelico 54', telefono: '06-9012345', mobile: '335-9012345', email: 'alimentarifreschi@example.com', field_rep: 'Francesca Rossi', numero_field_rep: 'FR003', supervisor: 'Roberto Belli', numero_supervisor: 'S003' },
        { id: 14, nome_account: 'PASTICCERIA DOLCE VITA', sf_region: 'Nord-Est', sf_district: 'Padova', sf_territory: 'Padova Centro', tipo_di_record_account: 'POS', rrp_segment: 'Pasticceria', trade: 'HoReCa', cap_spedizioni: '35121', statoprovincia_spedizioni: 'Padova', citt_spedizioni: 'Padova', indirizzo_spedizioni: 'Via San Francesco 30', telefono: '049-0123456', mobile: '340-0123456', email: 'info@dolcevita.example.com', field_rep: 'Elena Ferretti', numero_field_rep: 'FR004', supervisor: 'Marco Neri', numero_supervisor: 'S004' },
        { id: 15, nome_account: 'PANIFICIO IL BUON PANE', sf_region: 'Centro', sf_district: 'Ancona', sf_territory: 'Ancona Centro', tipo_di_record_account: 'POS', rrp_segment: 'Panificio', trade: 'Retail', cap_spedizioni: '60121', statoprovincia_spedizioni: 'Ancona', citt_spedizioni: 'Ancona', indirizzo_spedizioni: 'Corso Stamira 10', telefono: '071-1234567', mobile: '339-1234567', email: 'buonpane@example.com', field_rep: 'Stefano Ricci', numero_field_rep: 'FR006', supervisor: 'Maria Conti', numero_supervisor: 'S006' },
        { id: 16, nome_account: 'ENOTECA DIVINO', sf_region: 'Nord-Ovest', sf_district: 'Torino', sf_territory: 'Torino Centro', tipo_di_record_account: 'POS', rrp_segment: 'Enoteca', trade: 'Retail', cap_spedizioni: '10122', statoprovincia_spedizioni: 'Torino', citt_spedizioni: 'Torino', indirizzo_spedizioni: 'Via Lagrange 12', telefono: '011-2345678', mobile: '347-2345678', email: 'info@divino.example.com', field_rep: 'Paolo Bianchi', numero_field_rep: 'FR005', supervisor: 'Alessia Verdi', numero_supervisor: 'S005' },
        { id: 17, nome_account: 'CARTOLERIA ARCOBALENO', sf_region: 'Sud', sf_district: 'Napoli', sf_territory: 'Napoli Ovest', tipo_di_record_account: 'POS', rrp_segment: 'Cartoleria', trade: 'Retail', cap_spedizioni: '80129', statoprovincia_spedizioni: 'Napoli', citt_spedizioni: 'Napoli', indirizzo_spedizioni: 'Via Posillipo 45', telefono: '081-3456789', mobile: '338-3456789', email: 'arcobaleno@example.com', field_rep: 'Giuseppe Esposito', numero_field_rep: 'FR002', supervisor: 'Antonio Russo', numero_supervisor: 'S002' },
        { id: 18, nome_account: 'MACELLERIA CARNI SCELTE', sf_region: 'Nord', sf_district: 'Milano', sf_territory: 'Milano Est', tipo_di_record_account: 'POS', rrp_segment: 'Macelleria', trade: 'Retail', cap_spedizioni: '20133', statoprovincia_spedizioni: 'Milano', citt_spedizioni: 'Milano', indirizzo_spedizioni: 'Viale Argonne 25', telefono: '02-4567890', mobile: '329-4567890', email: 'carniscelte@example.com', field_rep: 'Marco Bianchi', numero_field_rep: 'FR001', supervisor: 'Laura Verdi', numero_supervisor: 'S001' },
        { id: 19, nome_account: 'FIORERIA PETALI', sf_region: 'Centro', sf_district: 'Firenze', sf_territory: 'Firenze Ovest', tipo_di_record_account: 'POS', rrp_segment: 'Fioreria', trade: 'Retail', cap_spedizioni: '50144', statoprovincia_spedizioni: 'Firenze', citt_spedizioni: 'Firenze', indirizzo_spedizioni: 'Via Alamanni 5', telefono: '055-5678901', mobile: '345-5678901', email: 'petali@example.com', field_rep: 'Stefano Ricci', numero_field_rep: 'FR006', supervisor: 'Maria Conti', numero_supervisor: 'S006' },
        { id: 20, nome_account: 'LIBRERIA CULTURA', sf_region: 'Sud', sf_district: 'Bari', sf_territory: 'Bari Nord', tipo_di_record_account: 'POS', rrp_segment: 'Libreria', trade: 'Retail', cap_spedizioni: '70125', statoprovincia_spedizioni: 'Bari', citt_spedizioni: 'Bari', indirizzo_spedizioni: 'Via Capruzzi 100', telefono: '080-6789012', mobile: '335-6789012', email: 'info@libreriacultura.example.com', field_rep: 'Antonio Basile', numero_field_rep: 'FR007', supervisor: 'Sara Romano', numero_supervisor: 'S007' }
      ];
      setRecords(fallbackData);
      setFilteredRecords(fallbackData);
      setIsUsingTestData(true);
    } finally {
      setLoading(false);
    }
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

  // Funzione per ottenere il valore di una cella
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

  // Calcola l'indice dei record da visualizzare per la paginazione
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', marginBottom: 2 }}>
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
        
        <IconButton color="primary" onClick={fetchData} disabled={loading}>
          <RefreshIcon />
        </IconButton>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Typography variant="body2" color="text.secondary">
          {filteredRecords.length} record{filteredRecords.length !== records.length ? ` (filtrati da ${records.length})` : ''}
        </Typography>
      </Paper>
      
      {/* Area messaggi */}
      {error && (
        <Alert 
          severity={error.includes('dati di test') ? "warning" : "error"} 
          sx={{ 
            marginBottom: 2,
            display: 'flex',
            alignItems: 'center'
          }}
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
          
          <TableContainer sx={{ 
            height: '100%', 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            }
          }}>
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
                              onClick={() => setSelectedRecord(record)}
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
                        ) : error ? (
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
      {selectedRecord && (
        <Paper
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 800,
            maxHeight: '90vh',
            p: 3,
            zIndex: 1000,
            overflow: 'auto'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Dettaglio Record</Typography>
            <IconButton onClick={() => setSelectedRecord(null)}>
              <RefreshIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            {Object.entries(selectedRecord).map(([key, value]) => (
              <Box key={key} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {key}
                </Typography>
                <Typography variant="body1">
                  {value !== null && value !== undefined ? value : '-'}
                </Typography>
              </Box>
            ))}
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => setSelectedRecord(null)}
            >
              Chiudi
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default NewAnagraficaTable;