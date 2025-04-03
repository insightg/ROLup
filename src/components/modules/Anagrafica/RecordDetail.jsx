import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Grid,
    TextField,
    CircularProgress,
    Alert,
    Typography,
    Tab,
    Tabs,
    IconButton,
    Divider,
    Paper
} from '@mui/material';
import {
    Save as SaveIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import anagraficaApi from './api/anagraficaApi';

// Definizione campi del modulo, organizzati per tab
const FORM_FIELDS = {
    generali: [
        { field: 'id', label: 'ID', readOnly: true },
        { field: 'nome_account', label: 'Nome Account', required: true },
        { field: 'sf_region', label: 'SF Region' },
        { field: 'sf_district', label: 'SF District' },
        { field: 'sf_territory', label: 'SF Territory' },
        { field: 'tipo_di_record_account', label: 'Tipo di Record Account' },
        { field: 'rrp_segment', label: 'RRP Segment' },
        { field: 'trade', label: 'Trade' }
    ],
    contatti: [
        { field: 'cap_spedizioni', label: 'CAP Spedizioni' },
        { field: 'statoprovincia_spedizioni', label: 'Stato/Provincia Spedizioni' },
        { field: 'citt_spedizioni', label: 'Città Spedizioni' },
        { field: 'indirizzo_spedizioni', label: 'Indirizzo Spedizioni' },
        { field: 'telefono', label: 'Telefono' },
        { field: 'mobile', label: 'Mobile' },
        { field: 'email', label: 'Email', type: 'email' }
    ],
    rappresentanti: [
        { field: 'field_rep', label: 'Field Rep' },
        { field: 'numero_field_rep', label: 'Numero Field Rep' },
        { field: 'supervisor', label: 'Supervisor' },
        { field: 'numero_supervisor', label: 'Numero Supervisor' }
    ]
};

const RecordDetail = ({ open, onClose, record }) => {
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [validationErrors, setValidationErrors] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // Tabs configuration
    const tabs = [
        { label: 'Informazioni Generali', fields: FORM_FIELDS.generali },
        { label: 'Informazioni di Contatto', fields: FORM_FIELDS.contatti },
        { label: 'Rappresentanti', fields: FORM_FIELDS.rappresentanti }
    ];

    // Initialize form data when record changes
    useEffect(() => {
        if (record) {
            setFormData({ ...record });
        }
    }, [record]);

    // Handle tab change
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Reset validation error for this field
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    // Validate form
    const validateForm = () => {
        const errors = {};
        
        // Validate required fields
        const allFields = [...FORM_FIELDS.generali, ...FORM_FIELDS.contatti, ...FORM_FIELDS.rappresentanti];
        allFields.forEach(field => {
            if (field.required && !formData[field.field]) {
                errors[field.field] = 'Campo obbligatorio';
            }
        });
        
        // Validate email format
        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
            errors.email = 'Formato email non valido';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Save record
    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }
        
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await anagraficaApi.updateRecord(formData.id, formData);
            
            if (response.data.success) {
                setIsEditing(false);
                onClose(true); // Refresh data after update
            } else {
                throw new Error(response.data.message || 'Errore durante il salvataggio');
            }
        } catch (err) {
            console.error('Error saving record:', err);
            setError(err.message || 'Si è verificato un errore durante il salvataggio');
        } finally {
            setIsLoading(false);
        }
    };

    // Delete record
    const handleDelete = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await anagraficaApi.deleteRecord(formData.id);
            
            if (response.data.success) {
                onClose(true); // Refresh data after delete
            } else {
                throw new Error(response.data.message || 'Errore durante l\'eliminazione');
            }
        } catch (err) {
            console.error('Error deleting record:', err);
            setError(err.message || 'Si è verificato un errore durante l\'eliminazione');
        } finally {
            setIsLoading(false);
            setDeleteConfirm(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                setIsEditing(false);
                setDeleteConfirm(false);
                onClose(false);
            }}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: { height: '80vh' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="h6">
                    {isEditing ? 'Modifica Record' : 'Dettagli Record'}
                </Typography>
                <IconButton
                    onClick={() => {
                        setIsEditing(false);
                        setDeleteConfirm(false);
                        onClose(false);
                    }}
                    size="small"
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            
            <Divider />
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange} 
                    aria-label="record detail tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {tabs.map((tab, index) => (
                        <Tab key={index} label={tab.label} />
                    ))}
                </Tabs>
            </Box>
            
            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}
                
                {deleteConfirm && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#fff8f8' }}>
                        <Typography variant="subtitle1" color="error" gutterBottom>
                            Conferma eliminazione
                        </Typography>
                        <Typography variant="body2" paragraph>
                            Sei sicuro di voler eliminare questo record? L'operazione non può essere annullata.
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button 
                                variant="outlined" 
                                onClick={() => setDeleteConfirm(false)}
                                disabled={isLoading}
                            >
                                Annulla
                            </Button>
                            <Button 
                                variant="contained" 
                                color="error"
                                onClick={handleDelete}
                                disabled={isLoading}
                                startIcon={isLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
                            >
                                Elimina
                            </Button>
                        </Box>
                    </Paper>
                )}
                
                {tabs.map((tab, tabIndex) => (
                    <Box
                        key={tabIndex}
                        role="tabpanel"
                        hidden={activeTab !== tabIndex}
                        id={`tabpanel-${tabIndex}`}
                        aria-labelledby={`tab-${tabIndex}`}
                        sx={{ flexGrow: 1, overflow: 'auto' }}
                    >
                        {activeTab === tabIndex && (
                            <Grid container spacing={2}>
                                {tab.fields.map(field => (
                                    <Grid item xs={12} sm={6} key={field.field}>
                                        <TextField
                                            name={field.field}
                                            label={field.label}
                                            value={formData[field.field] || ''}
                                            onChange={handleInputChange}
                                            fullWidth
                                            margin="normal"
                                            variant="outlined"
                                            disabled={!isEditing || field.readOnly || isLoading}
                                            required={field.required}
                                            error={!!validationErrors[field.field]}
                                            helperText={validationErrors[field.field]}
                                            type={field.type || 'text'}
                                            InputProps={{
                                                readOnly: !isEditing || field.readOnly
                                            }}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                ))}
            </DialogContent>
            
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {isEditing ? (
                    <>
                        <Button 
                            onClick={() => setIsEditing(false)} 
                            disabled={isLoading}
                        >
                            Annulla
                        </Button>
                        <Button
                            startIcon={<DeleteIcon />}
                            color="error"
                            onClick={() => setDeleteConfirm(true)}
                            disabled={isLoading}
                        >
                            Elimina
                        </Button>
                        <Button
                            startIcon={isLoading ? <CircularProgress size={24} /> : <SaveIcon />}
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            disabled={isLoading}
                        >
                            Salva
                        </Button>
                    </>
                ) : (
                    <>
                        <Button 
                            onClick={() => onClose(false)}
                        >
                            Chiudi
                        </Button>
                        <Button
                            startIcon={<EditIcon />}
                            variant="contained"
                            color="primary"
                            onClick={() => setIsEditing(true)}
                        >
                            Modifica
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default RecordDetail;