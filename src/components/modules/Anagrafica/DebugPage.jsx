import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, Divider, CircularProgress, Alert } from '@mui/material';
import anagraficaApi from './api/anagraficaApi';

/**
 * Pagina di debug per l'Anagrafica
 * Questa pagina esegue test diretti sull'API e mostra i risultati dettagliati
 * per aiutare a diagnosticare problemi di connessione con il backend.
 */
const DebugPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [testData, setTestData] = useState(null);

  // Aggiungi un risultato al log
  const addResult = (message, status = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [
      { timestamp, message, status, data },
      ...prev
    ]);
  };

  // Test di base dell'API
  const runBasicTest = async () => {
    setLoading(true);
    setError(null);
    addResult('Avvio test di base dell\'API', 'info');
    
    try {
      // Test 1: Chiamata diretta all'API
      addResult('Test 1: Chiamata fetch diretta', 'info');
      // Usa getApiUrl dall'apiUtils importato tramite anagraficaApi
      const apiUrl = anagraficaApi.getApiUrl('r_anagrafica.php');
      const directResponse = await fetch(`${apiUrl}?action=get&page=1&pageSize=2`);
      
      if (!directResponse.ok) {
        addResult(`Fetch fallito con status: ${directResponse.status}`, 'error');
        throw new Error(`Fetch failed with status: ${directResponse.status}`);
      }
      
      addResult(`Fetch completato con status: ${directResponse.status}`, 'success');
      
      // Prova a ottenere il testo e fare il parsing
      const responseText = await directResponse.text();
      addResult(`Risposta ricevuta: ${responseText.length} caratteri`, 'info');
      
      try {
        const jsonData = JSON.parse(responseText);
        addResult('Parsing JSON riuscito', 'success', {
          success: jsonData.success,
          hasData: !!jsonData.data,
          dataLength: jsonData.data && Array.isArray(jsonData.data) ? jsonData.data.length : 'N/A'
        });
        
        setTestData(jsonData);
      } catch (parseError) {
        addResult(`Errore nel parsing JSON: ${parseError.message}`, 'error', {
          excerpt: responseText.substring(0, 100) + '...'
        });
      }
      
      // Test 2: Chiamata tramite anagraficaApi.getData
      addResult('Test 2: Chiamata tramite anagraficaApi.getData', 'info');
      const apiResponse = await anagraficaApi.getData({ page: 1, pageSize: 2 });
      
      addResult('Chiamata API completata', 'success', {
        success: apiResponse.success,
        hasData: !!apiResponse.data,
        dataLength: apiResponse.data && Array.isArray(apiResponse.data) ? apiResponse.data.length : 'N/A'
      });
      
      // Test 3: Chiamata test diretto
      addResult('Test 3: Chiamata test diretto con XMLHttpRequest', 'info');
      const xhrResponse = await anagraficaApi.testDirectFetch();
      
      addResult('Test diretto completato', 'success', {
        success: xhrResponse.success,
        hasData: !!xhrResponse.data,
        dataLength: xhrResponse.data && Array.isArray(xhrResponse.data) ? xhrResponse.data.length : 'N/A'
      });
      
      addResult('Tutti i test completati con successo', 'success');
    } catch (err) {
      addResult(`Errore durante i test: ${err.message}`, 'error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Typography variant="h5" gutterBottom>Diagnostica Anagrafica</Typography>
      <Typography variant="body2" paragraph>
        Questa pagina esegue vari test per diagnosticare problemi di connessione con il backend.
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={runBasicTest} 
          disabled={loading}
          sx={{ mr: 1 }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Esegui Test'}
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={() => setResults([])} 
          disabled={loading || results.length === 0}
        >
          Pulisci Log
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexGrow: 1, gap: 2 }}>
        {/* Log dei risultati */}
        <Paper sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>Log dei Test</Typography>
          
          {results.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Non è stato eseguito ancora nessun test.
            </Typography>
          ) : (
            results.map((result, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="subtitle2" color={
                    result.status === 'error' ? 'error.main' : 
                    result.status === 'success' ? 'success.main' : 
                    'text.primary'
                  }>
                    {result.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {result.timestamp}
                  </Typography>
                </Box>
                
                {result.data && (
                  <Box 
                    sx={{ 
                      p: 1, 
                      bgcolor: 'background.default', 
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <pre style={{ margin: 0, overflow: 'auto' }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </Box>
                )}
                
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))
          )}
        </Paper>
        
        {/* Visualizzazione dati di test */}
        {testData && (
          <Paper sx={{ width: '40%', p: 2, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Dati di Test</Typography>
            <Box 
              sx={{ 
                p: 1, 
                bgcolor: 'background.default', 
                borderRadius: 1,
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                overflow: 'auto',
                maxHeight: 'calc(100vh - 200px)'
              }}
            >
              <pre style={{ margin: 0 }}>
                {JSON.stringify(testData, null, 2)}
              </pre>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default DebugPage;