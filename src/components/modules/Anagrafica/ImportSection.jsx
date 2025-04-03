// src/components/modules/Anagrafica/ImportSection.jsx
import React, { useState, useCallback, useRef } from 'react';
import { 
    Box, 
    Paper, 
    Typography, 
    Button, 
    FormControl, 
    FormControlLabel, 
    RadioGroup, 
    Radio, 
    Alert, 
    LinearProgress,
    CircularProgress,
    Tooltip,
    IconButton
} from '@mui/material';
import { 
    CloudUpload as CloudUploadIcon,
    Close as CloseIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';
import useAnagraficaStore from './stores/anagraficaStore';
import MappingDialog from './MappingDialog';
import anagraficaApi from './api/anagraficaApi';
import { chunk } from 'lodash';

// Dimensione batch per l'elaborazione
const BATCH_SIZE = 1000;

const ImportSection = () => {
    const { importMode, setImportMode, headerMapping, setHeaderMapping } = useAnagraficaStore();
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [mappingOpen, setMappingOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState(null); // 'success', 'error', 'processing'
    const [statusMessage, setStatusMessage] = useState('');
    const [excelHeaders, setExcelHeaders] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    
    const abortControllerRef = useRef(null);

    // Gestione del file caricato con dropzone
    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles.length === 0) return;
        
        const file = acceptedFiles[0];
        setFile(file);
        
        // Reset any previous import status
        setImportStatus(null);
        setStatusMessage('');
        
        // Analisi del file Excel
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Conversione in JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Estrazione intestazioni
                const headers = jsonData[0];
                setExcelHeaders(headers);
                
                // Anteprima dei dati (prime 5 righe)
                const previewRows = jsonData.slice(1, 6);
                setPreviewData(previewRows.map(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index];
                    });
                    return rowData;
                }));
                
                // Apertura dialog mappatura
                setMappingOpen(true);
            } catch (error) {
                console.error('Errore analisi file Excel:', error);
                setImportStatus('error');
                setStatusMessage('Errore durante la lettura del file Excel. Verificare che il file sia nel formato corretto.');
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);
    
    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({ 
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        multiple: false
    });
    
    const handleModeChange = (event) => {
        setImportMode(event.target.value);
    };
    
    const handleMappingClose = (confirmed) => {
        setMappingOpen(false);
        if (!confirmed) {
            // Utente ha annullato la mappatura
            setFile(null);
            setPreviewData(null);
            setExcelHeaders([]);
        }
    };
    
    const resetImport = () => {
        setFile(null);
        setPreviewData(null);
        setExcelHeaders([]);
        setImportStatus(null);
        setStatusMessage('');
        setProgress(0);
    };
    
    const uploadData = async () => {
        if (!file || !headerMapping.length) return;
        
        setImportStatus('processing');
        setProgress(0);
        setIsUploading(true);
        setStatusMessage('Preparazione dati in corso...');
        
        try {
            // Lettura del file completo
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Conversione in JSON con intestazioni
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    setStatusMessage(`Elaborazione di ${jsonData.length} record...`);
                    
                    // Elaborazione dati in batch per evitare sovraccarichi del server
                    const batches = chunk(jsonData, BATCH_SIZE);
                    
                    // Controller per l'annullamento
                    abortControllerRef.current = new AbortController();
                    
                    let processedRows = 0;
                    let failedRows = 0;
                    
                    for (let i = 0; i < batches.length; i++) {
                        if (abortControllerRef.current.signal.aborted) {
                            setImportStatus('cancelled');
                            setStatusMessage(`Import annullato. ${processedRows} record elaborati, ${failedRows} falliti.`);
                            break;
                        }
                        
                        const batch = batches[i];
                        const mappedBatch = batch.map(row => {
                            const mappedRow = {};
                            headerMapping.forEach(mapping => {
                                if (mapping.excelHeader && mapping.dbField) {
                                    mappedRow[mapping.dbField] = row[mapping.excelHeader];
                                }
                            });
                            return mappedRow;
                        });
                        
                        const formData = new FormData();
                        formData.append('data', JSON.stringify(mappedBatch));
                        formData.append('mode', importMode);
                        
                        try {
                            setStatusMessage(`Importazione batch ${i+1}/${batches.length}...`);
                            const response = await anagraficaApi.importData(formData);
                            processedRows += response.data.processedCount || 0;
                            failedRows += response.data.failedCount || 0;
                        } catch (error) {
                            console.error('Errore batch import:', error);
                            failedRows += batch.length;
                        }
                        
                        // Aggiornamento progresso
                        const newProgress = Math.round(((i + 1) / batches.length) * 100);
                        setProgress(newProgress);
                    }
                    
                    if (!abortControllerRef.current.signal.aborted) {
                        setImportStatus('success');
                        setStatusMessage(`Import completato con successo. ${processedRows} record elaborati, ${failedRows} falliti.`);
                    }
                } catch (error) {
                    console.error('Errore elaborazione dati Excel:', error);
                    setImportStatus('error');
                    setStatusMessage('Errore durante l\'elaborazione dei dati Excel: ' + error.message);
                } finally {
                    setIsUploading(false);
                    abortControllerRef.current = null;
                }
            };
            
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Errore durante import:', error);
            setImportStatus('error');
            setStatusMessage('Errore durante l\'importazione: ' + error.message);
            setIsUploading(false);
        }
    };
    
    const cancelImport = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };
    
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 2 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Importazione Anagrafica
                    </Typography>
                    
                    <Tooltip title="Come funziona l'importazione">
                        <IconButton>
                            <InfoIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Modalità di importazione:
                    </Typography>
                    <RadioGroup 
                        row 
                        name="importMode" 
                        value={importMode}
                        onChange={handleModeChange}
                    >
                        <Tooltip title="Inserisce solo nuovi record. Ignora record esistenti con lo stesso nome account.">
                            <FormControlLabel 
                                value="insert" 
                                control={<Radio />} 
                                label="Inserisci nuovi record" 
                            />
                        </Tooltip>
                        <Tooltip title="Aggiorna solo record esistenti. Ignora record non presenti nel database.">
                            <FormControlLabel 
                                value="update" 
                                control={<Radio />} 
                                label="Aggiorna record esistenti" 
                            />
                        </Tooltip>
                        <Tooltip title="Inserisce nuovi record e aggiorna quelli esistenti.">
                            <FormControlLabel 
                                value="both" 
                                control={<Radio />} 
                                label="Inserisci e aggiorna" 
                            />
                        </Tooltip>
                    </RadioGroup>
                </Box>
                
                <Box {...getRootProps()} 
                    sx={{
                        border: '2px dashed',
                        borderColor: isDragReject ? 'error.main' : isDragActive ? 'primary.main' : 'grey.400',
                        borderRadius: 2,
                        p: 3,
                        mb: 3,
                        textAlign: 'center',
                        backgroundColor: isDragActive ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        opacity: isUploading ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                    }}
                >
                    <input {...getInputProps()} disabled={isUploading} />
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    
                    {file ? (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                File selezionato:
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <Typography>
                                    <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </Typography>
                                {!isUploading && (
                                    <IconButton size="small" onClick={(e) => {
                                        e.stopPropagation();
                                        resetImport();
                                    }}>
                                        <CloseIcon />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        <Typography>
                            {isDragActive ? 
                                isDragReject ? "File non supportato" : "Rilascia il file Excel qui..." : 
                                "Trascina qui il file Excel oppure clicca per selezionarlo"}
                        </Typography>
                    )}
                    
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Accetta file .xlsx e .xls
                    </Typography>
                </Box>
                
                {previewData && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Anteprima dati:
                        </Typography>
                        <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {excelHeaders.map((header, index) => (
                                            <th key={index} style={{ 
                                                border: '1px solid #ddd', 
                                                padding: 8, 
                                                backgroundColor: '#f5f5f5',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 2
                                            }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {excelHeaders.map((header, colIndex) => (
                                                <td key={colIndex} style={{ 
                                                    border: '1px solid #ddd', 
                                                    padding: 8 
                                                }}>
                                                    {row[header]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    </Box>
                )}
                
                {importStatus === 'processing' && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            {statusMessage || 'Importazione in corso...'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {progress}%
                                </Typography>
                            </Box>
                        </Box>
                        <Button 
                            variant="outlined" 
                            color="error" 
                            sx={{ mt: 1 }}
                            onClick={cancelImport}
                            startIcon={<CloseIcon />}
                        >
                            Annulla importazione
                        </Button>
                    </Box>
                )}
                
                {importStatus && importStatus !== 'processing' && (
                    <Alert 
                        severity={importStatus === 'success' ? 'success' : 'error'} 
                        sx={{ mb: 3 }}
                        action={
                            <Button color="inherit" size="small" onClick={resetImport}>
                                Nuova importazione
                            </Button>
                        }
                    >
                        {statusMessage}
                    </Alert>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button 
                        variant="outlined" 
                        onClick={() => setMappingOpen(true)}
                        disabled={!file || isUploading}
                    >
                        {headerMapping.length > 0 ? 'Modifica mappatura campi' : 'Configura mappatura campi'}
                    </Button>
                    
                    <Button 
                        variant="contained" 
                        onClick={uploadData}
                        disabled={!file || !headerMapping.length || isUploading || importStatus === 'success'}
                        startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isUploading ? 'Importazione in corso...' : 'Avvia importazione'}
                    </Button>
                </Box>
            </Paper>
            
            {/* Informazioni sul processo di importazione */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Informazioni sull'importazione
                </Typography>
                <Typography variant="body2" paragraph>
                    Il processo di importazione permette di caricare dati da un file Excel nella tabella dell'anagrafica.
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                    Modalità di importazione:
                </Typography>
                <ul>
                    <li>
                        <Typography variant="body2">
                            <strong>Inserisci nuovi record</strong>: Aggiungerà solo nuovi clienti, ignorando quelli esistenti.
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            <strong>Aggiorna record esistenti</strong>: Aggiornerà solo i clienti già presenti nel database.
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            <strong>Inserisci e aggiorna</strong>: Aggiungerà nuovi clienti e aggiornerà quelli esistenti.
                        </Typography>
                    </li>
                </ul>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Formato del file:
                </Typography>
                <Typography variant="body2">
                    Il file Excel deve avere una riga di intestazione con i nomi delle colonne. 
                    Attraverso la mappatura potrai associare queste colonne ai campi del database.
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Identificazione dei record:
                </Typography>
                <Typography variant="body2">
                    I record vengono identificati in base al campo "Nome Account". 
                    Questo campo è obbligatorio per l'importazione.
                </Typography>
            </Paper>
            
            {/* Dialog Mappatura */}
            <MappingDialog 
                open={mappingOpen}
                onClose={handleMappingClose}
                excelHeaders={excelHeaders}
            />
        </Box>
    );
};

export default ImportSection;