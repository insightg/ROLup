import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import anagraficaApi from './api/anagraficaApi';

/**
 * Versione semplificata della DataTable per diagnosticare e risolvere il problema
 * di visualizzazione dei dati nella tabella.
 */
const FixedDataTable = () => {
  // Stati base
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Funzione semplificata per recuperare i dati
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching data...");
      const response = await anagraficaApi.getData({ page: 1, pageSize: 25 });
      console.log("Raw API response:", response);
      
      // Estrai i dati dalla risposta in base alla struttura
      let tableData = [];
      
      if (response && response.success) {
        if (response.data && Array.isArray(response.data)) {
          tableData = response.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          tableData = response.data.data;
        } else {
          console.error("Unexpected data structure:", response);
          setError("Formato dati non valido dal server");
        }
      } else {
        console.error("API error:", response);
        setError("Errore API");
      }
      
      console.log("Processed table data:", tableData);
      setData(tableData);
    } catch (err) {
      console.error('Errore recupero dati:', err);
      setError(err.message || 'Errore nel recupero dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  // Carica i dati all'inizializzazione
  useEffect(() => {
    fetchData();
  }, []);

  // Definizione statica delle colonne principali
  const columns = useMemo(() => [
    { id: 'id', header: 'ID' },
    { id: 'nome_account', header: 'Nome Account' },
    { id: 'sf_region', header: 'SF Region' },
    { id: 'sf_district', header: 'SF District' },
    { id: 'sf_territory', header: 'SF Territory' },
    { id: 'email', header: 'Email' },
    { id: 'telefono', header: 'Telefono' }
  ], []);

  // Helper per accedere ai dati indipendentemente dalle maiuscole/minuscole
  const getCellValue = (row, columnId) => {
    // Tenta accesso diretto alla proprietà
    if (row[columnId] !== undefined) {
      return row[columnId];
    }
    
    // Se non trovata, prova a cercare la proprietà ignorando maiuscole/minuscole
    const propKeys = Object.keys(row);
    const matchingKey = propKeys.find(key => key.toLowerCase() === columnId.toLowerCase());
    return matchingKey !== undefined ? row[matchingKey] : '';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar semplificata */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Tabella Diagnostica
        </Typography>
        <IconButton color="primary" onClick={fetchData} title="Aggiorna dati">
          <RefreshIcon />
        </IconButton>
      </Paper>

      {/* Messaggio di errore */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Contenitore della tabella */}
      <Box sx={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isLoading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.7)', zIndex: 1000 }}>
            <CircularProgress />
          </Box>
        )}

        <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map(column => (
                  <TableCell key={column.id}>
                    {column.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(data) && data.length > 0 ? (
                data.map((row, index) => (
                  <TableRow key={row.id || index}>
                    {columns.map(column => (
                      <TableCell key={column.id}>
                        <Tooltip title={getCellValue(row, column.id) || ''}>
                          <span>{getCellValue(row, column.id) || ''}</span>
                        </Tooltip>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      {isLoading ? 'Caricamento dati...' : 
                       error ? `Errore: ${error}` :
                       'Nessun record disponibile'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Debug info */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2">Debug Info</Typography>
        <Typography variant="body2">Data length: {Array.isArray(data) ? data.length : 0}</Typography>
        <Typography variant="body2">Data type: {Array.isArray(data) ? 'Array' : typeof data}</Typography>
        {data.length > 0 && (
          <Typography variant="body2">
            Proprietà prima riga: {Object.keys(data[0]).join(', ')}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default FixedDataTable;