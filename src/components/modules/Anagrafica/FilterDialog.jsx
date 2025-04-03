import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    IconButton,
    Chip,
    Typography,
    Grid,
    Paper,
    Divider,
    Stack,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Close as CloseIcon,
    FilterList as FilterIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

// Operatori di filtro disponibili con descrizioni
const filterOperators = [
    { value: 'contains', label: 'Contiene', description: 'Cerca valori che contengono il testo specificato' },
    { value: 'equals', label: 'Uguale a', description: 'Cerca valori esattamente uguali al testo specificato' },
    { value: 'startsWith', label: 'Inizia con', description: 'Cerca valori che iniziano con il testo specificato' },
    { value: 'endsWith', label: 'Finisce con', description: 'Cerca valori che finiscono con il testo specificato' },
    { value: 'isEmpty', label: 'È vuoto', description: 'Cerca valori vuoti o nulli' },
    { value: 'isNotEmpty', label: 'Non è vuoto', description: 'Cerca valori non vuoti e non nulli' },
    { value: 'gt', label: 'Maggiore di', description: 'Cerca valori maggiori di quello specificato' },
    { value: 'gte', label: 'Maggiore o uguale a', description: 'Cerca valori maggiori o uguali a quello specificato' },
    { value: 'lt', label: 'Minore di', description: 'Cerca valori minori di quello specificato' },
    { value: 'lte', label: 'Minore o uguale a', description: 'Cerca valori minori o uguali a quello specificato' }
];

const FilterDialog = ({ open, onClose, columns, filters, onFiltersChange }) => {
    const [activeFilters, setActiveFilters] = useState([]);
    const [newFilter, setNewFilter] = useState({
        id: '',
        operator: 'contains',
        value: ''
    });
    const [operatorDescription, setOperatorDescription] = useState('');

    // Inizializza i filtri attivi all'apertura del dialog
    useEffect(() => {
        if (open) {
            setActiveFilters([...filters]);
        }
    }, [open, filters]);

    // Aggiorna la descrizione dell'operatore quando cambia
    useEffect(() => {
        const operator = filterOperators.find(op => op.value === newFilter.operator);
        setOperatorDescription(operator ? operator.description : '');
    }, [newFilter.operator]);

    // Gestione nuovo filtro
    const handleAddFilter = () => {
        if (!newFilter.id) return;
        
        // Per operatori che non richiedono un valore (isEmpty, isNotEmpty)
        if (['isEmpty', 'isNotEmpty'].includes(newFilter.operator)) {
            setActiveFilters([
                ...activeFilters,
                { ...newFilter, value: '' }
            ]);
        } else if (newFilter.value || newFilter.value === 0) {
            // Per operatori che richiedono un valore
            setActiveFilters([
                ...activeFilters,
                { ...newFilter }
            ]);
        }
        
        // Reset nuovo filtro
        setNewFilter({
            id: '',
            operator: 'contains',
            value: ''
        });
    };

    // Gestione rimozione filtro
    const handleRemoveFilter = (index) => {
        const updatedFilters = [...activeFilters];
        updatedFilters.splice(index, 1);
        setActiveFilters(updatedFilters);
    };

    // Gestione cambio colonna
    const handleColumnChange = (e) => {
        setNewFilter({
            ...newFilter,
            id: e.target.value
        });
    };

    // Gestione cambio operatore
    const handleOperatorChange = (e) => {
        setNewFilter({
            ...newFilter,
            operator: e.target.value
        });
    };

    // Gestione cambio valore
    const handleValueChange = (e) => {
        setNewFilter({
            ...newFilter,
            value: e.target.value
        });
    };

    // Gestione conferma filtri
    const handleConfirm = () => {
        onFiltersChange(activeFilters);
        onClose();
    };

    // Ottieni il nome visualizzato della colonna dal suo ID
    const getColumnLabel = (columnId) => {
        const column = columns.find(col => col.accessorKey === columnId);
        return column ? column.header : columnId;
    };

    // Ottieni l'etichetta dell'operatore dal suo valore
    const getOperatorLabel = (operatorValue) => {
        const operator = filterOperators.find(op => op.value === operatorValue);
        return operator ? operator.label : operatorValue;
    };

    // Verifica se il campo di valore è disabilitato per l'operatore attuale
    const isValueDisabled = ['isEmpty', 'isNotEmpty'].includes(newFilter.operator);

    return (
        <Dialog
            open={open}
            onClose={() => onClose()}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: { maxHeight: '80vh' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterIcon />
                <Typography variant="h6">Filtri Avanzati</Typography>
            </DialogTitle>
            
            <Divider />
            
            <DialogContent>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Aggiungi un nuovo filtro
                    </Typography>
                    
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Colonna</InputLabel>
                                    <Select
                                        value={newFilter.id}
                                        onChange={handleColumnChange}
                                        label="Colonna"
                                    >
                                        <MenuItem value="">
                                            <em>Seleziona colonna</em>
                                        </MenuItem>
                                        {columns.map(column => (
                                            <MenuItem 
                                                key={column.accessorKey} 
                                                value={column.accessorKey}
                                            >
                                                {column.header}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Operatore</InputLabel>
                                    <Select
                                        value={newFilter.operator}
                                        onChange={handleOperatorChange}
                                        label="Operatore"
                                    >
                                        {filterOperators.map(operator => (
                                            <MenuItem 
                                                key={operator.value} 
                                                value={operator.value}
                                            >
                                                {operator.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Typography variant="caption" color="text.secondary">
                                    {operatorDescription}
                                </Typography>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={newFilter.value}
                                    onChange={handleValueChange}
                                    label="Valore"
                                    disabled={isValueDisabled}
                                    variant="outlined"
                                    placeholder={isValueDisabled ? "Non richiesto" : "Inserisci valore"}
                                />
                            </Grid>
                            
                            <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <IconButton 
                                    color="primary" 
                                    onClick={handleAddFilter}
                                    disabled={!newFilter.id || (!newFilter.value && !isValueDisabled)}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                    Filtri attivi
                </Typography>
                
                {activeFilters.length === 0 ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Nessun filtro attivo. Aggiungi un filtro utilizzando il modulo sopra.
                    </Alert>
                ) : (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            {activeFilters.map((filter, index) => (
                                <Box 
                                    key={index} 
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        p: 1,
                                        bgcolor: 'background.default',
                                        borderRadius: 1
                                    }}
                                >
                                    <Typography>
                                        <strong>{getColumnLabel(filter.id)}</strong>
                                        {' '}
                                        <span style={{ color: '#666' }}>{getOperatorLabel(filter.operator)}</span>
                                        {filter.value && ` "${filter.value}"`}
                                    </Typography>
                                    <IconButton 
                                        size="small" 
                                        color="error" 
                                        onClick={() => handleRemoveFilter(index)}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                )}
                
                {activeFilters.length > 0 && (
                    <Box sx={{ mt: 2, textAlign: 'right' }}>
                        <Button 
                            variant="outlined" 
                            color="error" 
                            startIcon={<DeleteIcon />}
                            onClick={() => setActiveFilters([])}
                            size="small"
                        >
                            Rimuovi tutti i filtri
                        </Button>
                    </Box>
                )}
            </DialogContent>
            
            <Divider />
            
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => onClose()}>Annulla</Button>
                <Button 
                    onClick={handleConfirm} 
                    variant="contained" 
                    startIcon={<FilterIcon />}
                >
                    Applica Filtri
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FilterDialog;