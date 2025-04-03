// src/components/modules/Anagrafica/MappingDialog.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
    TextField,
    IconButton,
    Tooltip,
    Chip,
    Divider
} from '@mui/material';
import {
    Save as SaveIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    AutoAwesome as AutoMappingIcon,
    CheckCircle as MappedIcon,
    Error as UnmappedIcon,
    ImportExport as ImportIcon
} from '@mui/icons-material';
import useAnagraficaStore from './stores/anagraficaStore';
import anagraficaApi from './api/anagraficaApi';

// Database field definitions for tsis_anagrafica
const DB_FIELDS = [
    { field: 'id', label: 'ID', isKey: true },
    { field: 'nome_account', label: 'Nome Account', required: true },
    { field: 'sf_region', label: 'SF Region' },
    { field: 'sf_district', label: 'SF District' },
    { field: 'sf_territory', label: 'SF Territory' },
    { field: 'tipo_di_record_account', label: 'Tipo di Record Account' },
    { field: 'rrp_segment', label: 'RRP Segment' },
    { field: 'trade', label: 'Trade' },
    { field: 'cap_spedizioni', label: 'CAP Spedizioni' },
    { field: 'statoprovincia_spedizioni', label: 'Stato/Provincia Spedizioni' },
    { field: 'citt_spedizioni', label: 'Città Spedizioni' },
    { field: 'indirizzo_spedizioni', label: 'Indirizzo Spedizioni' },
    { field: 'telefono', label: 'Telefono' },
    { field: 'mobile', label: 'Mobile' },
    { field: 'email', label: 'Email' },
    { field: 'field_rep', label: 'Field Rep' },
    { field: 'numero_field_rep', label: 'Numero Field Rep' },
    { field: 'supervisor', label: 'Supervisor' },
    { field: 'numero_supervisor', label: 'Numero Supervisor' }
];

// Local storage key for saved mappings
const STORAGE_KEY = 'anagrafica_header_mappings';

const MappingDialog = ({ open, onClose, excelHeaders }) => {
    const { headerMapping, setHeaderMapping } = useAnagraficaStore();
    const [localMapping, setLocalMapping] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [savedMappings, setSavedMappings] = useState([]);
    const [selectedMapping, setSelectedMapping] = useState('');
    const [mappingName, setMappingName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [dbSchema, setDbSchema] = useState(null);

    // Fetch database schema if needed
    useEffect(() => {
        if (open && !dbSchema) {
            const fetchSchema = async () => {
                try {
                    setLoading(true);
                    const response = await anagraficaApi.getDbSchema();
                    if (response.data.success) {
                        setDbSchema(response.data.schema);
                    }
                } catch (err) {
                    console.error('Error fetching database schema:', err);
                } finally {
                    setLoading(false);
                }
            };
            
            fetchSchema();
        }
    }, [open, dbSchema]);

    // Initialize mappings from localStorage and hook state
    useEffect(() => {
        if (open) {
            loadSavedMappings();
            
            // Initialize local mapping
            if (headerMapping.length === 0 && excelHeaders.length > 0) {
                // Auto-mapping based on name similarity
                const initialMapping = autoMapHeaders(excelHeaders);
                setLocalMapping(initialMapping);
            } else if (headerMapping.length > 0) {
                setLocalMapping([...headerMapping]);
            }
        }
    }, [open, excelHeaders, headerMapping]);

    // Calculate mapping statistics
    const getMappingStats = () => {
        const mappedCount = localMapping.filter(m => m.excelHeader).length;
        const unmappedCount = localMapping.filter(m => !m.excelHeader).length;
        const requiredFieldsMapped = DB_FIELDS.filter(f => f.required).every(
            requiredField => localMapping.some(
                m => m.dbField === requiredField.field && m.excelHeader
            )
        );
        
        return { mappedCount, unmappedCount, requiredFieldsMapped };
    };

    // Load mappings from localStorage
    const loadSavedMappings = () => {
        try {
            setLoading(true);
            setError(null);
            
            const storedMappings = localStorage.getItem(STORAGE_KEY);
            if (storedMappings) {
                const mappings = JSON.parse(storedMappings);
                setSavedMappings(mappings);
            } else {
                setSavedMappings([]);
            }
        } catch (err) {
            console.error('Error loading saved mappings:', err);
            setError('Impossibile recuperare le mappature salvate');
        } finally {
            setLoading(false);
        }
    };

    // Auto-mapping function based on name similarity
    const autoMapHeaders = (headers) => {
        return DB_FIELDS.map(dbField => {
            // Convert to lowercase for better matching
            const dbFieldNameLower = dbField.field.toLowerCase().replace(/_/g, '');
            const dbFieldLabelLower = dbField.label.toLowerCase().replace(/ /g, '');
            
            // Try to find matching header
            const matchingHeader = headers.find(header => {
                if (!header) return false;
                const headerLower = header.toLowerCase().replace(/[ _-]/g, '');
                return headerLower === dbFieldNameLower || 
                       headerLower === dbFieldLabelLower ||
                       headerLower.includes(dbFieldNameLower) ||
                       dbFieldNameLower.includes(headerLower);
            });
            
            return {
                dbField: dbField.field,
                dbLabel: dbField.label,
                required: dbField.required || false,
                excelHeader: matchingHeader || ''
            };
        });
    };

    const handleMappingChange = (dbField, excelHeader) => {
        setLocalMapping(prevMapping => {
            return prevMapping.map(item => {
                if (item.dbField === dbField) {
                    return { ...item, excelHeader };
                }
                return item;
            });
        });
    };

    // Run auto-mapping
    const handleAutoMapping = () => {
        const newMapping = autoMapHeaders(excelHeaders);
        setLocalMapping(newMapping);
    };

    // Save mapping to localStorage
    const handleSaveMapping = () => {
        if (!mappingName.trim()) {
            alert('Per favore inserisci un nome per la mappatura');
            return;
        }
        
        try {
            setLoading(true);
            
            // Create new mapping object
            const newMapping = {
                id: Date.now().toString(), // Use timestamp as ID
                name: mappingName,
                configuration: localMapping,
                created_at: new Date().toISOString()
            };
            
            // Add to saved mappings
            const updatedMappings = [...savedMappings, newMapping];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMappings));
            
            // Update state
            setSavedMappings(updatedMappings);
            setSelectedMapping(newMapping.id);
            setMappingName('');
            setShowSaveDialog(false);
        } catch (err) {
            console.error('Error saving mapping:', err);
            alert('Errore durante il salvataggio della mappatura');
        } finally {
            setLoading(false);
        }
    };

    // Delete a saved mapping
    const handleDeleteMapping = (id) => {
        if (!window.confirm('Sei sicuro di voler eliminare questa mappatura?')) {
            return;
        }
        
        try {
            const updatedMappings = savedMappings.filter(mapping => mapping.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMappings));
            setSavedMappings(updatedMappings);
            
            if (selectedMapping === id) {
                setSelectedMapping('');
            }
        } catch (err) {
            console.error('Error deleting mapping:', err);
            alert('Errore durante l\'eliminazione della mappatura');
        }
    };

    // Load a saved mapping
    const handleLoadMapping = (mappingId) => {
        if (!mappingId) return;
        
        try {
            setLoading(true);
            
            const mapping = savedMappings.find(m => m.id === mappingId);
            
            if (mapping && mapping.configuration) {
                setLocalMapping(mapping.configuration);
            } else {
                throw new Error('Mapping configuration not found');
            }
        } catch (err) {
            console.error('Error loading mapping:', err);
            alert('Errore durante il caricamento della mappatura');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        setHeaderMapping(localMapping);
        onClose(true);
    };

    const handleSelectedMappingChange = (e) => {
        setSelectedMapping(e.target.value);
        if (e.target.value) {
            handleLoadMapping(e.target.value);
        }
    };

    // Calculate mapping statistics
    const stats = getMappingStats();

    return (
        <Dialog 
            open={open} 
            onClose={() => onClose(false)} 
            fullWidth 
            maxWidth="md"
            PaperProps={{
                sx: { height: '80vh' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    Mappatura Campi Excel
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Associa le colonne del file Excel ai campi del database
                    </Typography>
                </Box>
                <Box>
                    <Chip 
                        label={`${stats.mappedCount} campi mappati`}
                        color={stats.mappedCount > 0 ? "success" : "default"}
                        size="small"
                        icon={<MappedIcon />}
                        sx={{ mr: 1 }}
                    />
                    {!stats.requiredFieldsMapped && (
                        <Chip 
                            label="Campi obbligatori mancanti"
                            color="error"
                            size="small"
                            icon={<UnmappedIcon />}
                        />
                    )}
                </Box>
            </DialogTitle>
            
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : (
                    <>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Seleziona una mappatura salvata o crea una nuova mappatura
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <FormControl fullWidth>
                                    <InputLabel>Mappature salvate</InputLabel>
                                    <Select
                                        value={selectedMapping}
                                        onChange={handleSelectedMappingChange}
                                        label="Mappature salvate"
                                    >
                                        <MenuItem value="">
                                            <em>Nessuna mappatura</em>
                                        </MenuItem>
                                        {savedMappings.map(mapping => (
                                            <MenuItem key={mapping.id} value={mapping.id}>
                                                {mapping.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                <Tooltip title="Salva nuova mappatura">
                                    <IconButton 
                                        color="primary" 
                                        onClick={() => setShowSaveDialog(true)}
                                    >
                                        <AddIcon />
                                    </IconButton>
                                </Tooltip>
                                
                                {selectedMapping && (
                                    <Tooltip title="Elimina mappatura">
                                        <IconButton 
                                            color="error" 
                                            onClick={() => handleDeleteMapping(selectedMapping)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                
                                <Tooltip title="Mappatura automatica">
                                    <IconButton
                                        color="primary"
                                        onClick={handleAutoMapping}
                                        size="small"
                                    >
                                        <AutoMappingIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        
                        {/* Dialog to save mapping */}
                        {showSaveDialog && (
                            <Box sx={{ 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 1,
                                p: 2,
                                mb: 3,
                                bgcolor: '#f5f5f5'
                            }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Salva mappatura corrente
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <TextField
                                        label="Nome mappatura"
                                        value={mappingName}
                                        onChange={(e) => setMappingName(e.target.value)}
                                        size="small"
                                        fullWidth
                                    />
                                    <Button 
                                        startIcon={<SaveIcon />}
                                        variant="contained" 
                                        onClick={handleSaveMapping}
                                        disabled={!mappingName.trim()}
                                    >
                                        Salva
                                    </Button>
                                    <Button 
                                        variant="outlined" 
                                        onClick={() => setShowSaveDialog(false)}
                                    >
                                        Annulla
                                    </Button>
                                </Box>
                            </Box>
                        )}
                        
                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width="40%">Campo Database</TableCell>
                                        <TableCell width="60%">Intestazione Excel</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {localMapping.map((item) => (
                                        <TableRow key={item.dbField}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {item.dbLabel}
                                                    {item.required && (
                                                        <Chip 
                                                            label="Richiesto" 
                                                            size="small" 
                                                            color="primary" 
                                                            variant="outlined"
                                                            sx={{ ml: 1 }}
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <FormControl fullWidth size="small">
                                                    <Select
                                                        value={item.excelHeader || ''}
                                                        onChange={(e) => handleMappingChange(item.dbField, e.target.value)}
                                                        displayEmpty
                                                        error={item.required && !item.excelHeader}
                                                    >
                                                        <MenuItem value="">
                                                            <em>Non mappato</em>
                                                        </MenuItem>
                                                        {excelHeaders.map((header) => (
                                                            <MenuItem key={header} value={header}>
                                                                {header}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        
                        <Alert severity="info">
                            <Typography variant="body2">
                                <strong>Nota:</strong> Assicurati di mappare i campi obbligatori. 
                                I record senza i campi obbligatori verranno ignorati durante l'importazione.
                            </Typography>
                        </Alert>
                    </>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={() => onClose(false)}>Annulla</Button>
                <Button 
                    onClick={() => setShowSaveDialog(true)}
                    startIcon={<SaveIcon />}
                    disabled={loading}
                >
                    Salva Mappatura
                </Button>
                <Button 
                    onClick={handleConfirm} 
                    variant="contained"
                    startIcon={<ImportIcon />}
                    disabled={loading || !stats.requiredFieldsMapped}
                >
                    Conferma e Procedi
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MappingDialog;