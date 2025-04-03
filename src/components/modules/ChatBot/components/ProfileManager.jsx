// src/components/modules/ChatBot/components/ProfileManager.jsx
import React, { useState } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import useChatBotStore from '../stores/chatBotStore';
import chatBotApi from '../api/chatBotApi';
import ProfileCard from './common/ProfileCard';
import KnowledgeBaseEditor from './KnowledgeBaseEditor';

const ProfileManager = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // Stati locali
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    definition: '',
    welcome: '',
    knowledgeBases: [],
    isMobileDefault: false
  });
  
  // Stato dallo store
  const { 
    profiles, 
    currentProfileId, 
    setCurrentProfileId, 
    setProfiles,
    addProfile,
    updateProfile,
    deleteProfile
  } = useChatBotStore();
  
  // Apre il dialog per un nuovo profilo
  const handleNewProfile = () => {
    setFormData({
      id: null,
      name: '',
      definition: '',
      welcome: '',
      knowledgeBases: [],
      isMobileDefault: false
    });
    setIsDialogOpen(true);
  };
  
  // Apre il dialog per modificare un profilo esistente
  const handleEditProfile = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
      setFormData({
        id: profile.id,
        name: profile.name,
        definition: profile.definition,
        welcome: profile.welcome || '',
        knowledgeBases: profile.knowledgeBases || [],
        isMobileDefault: profile.isMobileDefault || false
      });
      setIsDialogOpen(true);
    }
  };
  
  // Gestisce la selezione di un profilo
  const handleSelectProfile = (profileId) => {
    setCurrentProfileId(profileId);
  };
  
  // Gestisce il cambio di valori nel form
  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Gestisce la modifica delle basi di conoscenza
  const handleKnowledgeBasesChange = (knowledgeBases) => {
    setFormData(prev => ({
      ...prev,
      knowledgeBases
    }));
  };
  
  // Salva il profilo
  const handleSaveProfile = async () => {
    // Validazione
    if (!formData.name || !formData.definition) {
      setError('Nome e definizione sono campi obbligatori');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Se il profilo è impostato come default mobile, rimuovi il flag dagli altri profili lato server
      if (formData.isMobileDefault) {
        await chatBotApi.clearMobileDefault();
      }
      
      // Salva il profilo
      const response = await chatBotApi.saveProfile(formData);
      
      if (response.success) {
        if (formData.id) {
          // Aggiorna il profilo esistente nello store
          updateProfile(formData.id, response.profile);
          enqueueSnackbar('Profilo aggiornato con successo', { variant: 'success' });
        } else {
          // Aggiungi il nuovo profilo allo store
          addProfile(response.profile);
          enqueueSnackbar('Profilo creato con successo', { variant: 'success' });
        }
        
        // Chiudi il dialog
        setIsDialogOpen(false);
      } else {
        throw new Error(response.error || 'Errore nel salvataggio del profilo');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error.message || 'Si è verificato un errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Elimina un profilo
  const handleDeleteProfile = async (profileId) => {
    setDeleteConfirmation(null);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await chatBotApi.deleteProfile(profileId);
      
      if (response.success) {
        // Rimuovi il profilo dallo store
        deleteProfile(profileId);
        enqueueSnackbar('Profilo eliminato con successo', { variant: 'success' });
      } else {
        throw new Error(response.error || 'Errore nell\'eliminazione del profilo');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      setError(error.message || 'Si è verificato un errore durante l\'eliminazione');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3, width: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Gestione Profili
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewProfile}
        >
          Nuovo Profilo
        </Button>
      </Box>
      
      {/* Visualizzazione dei profili */}
      <Grid container spacing={2}>
        {profiles.map(profile => (
          <Grid item xs={12} sm={6} md={4} key={profile.id}>
            <ProfileCard
              profile={profile}
              isSelected={profile.id === currentProfileId}
              onSelect={handleSelectProfile}
              onEdit={handleEditProfile}
              onDelete={() => setDeleteConfirmation(profile)}
            />
          </Grid>
        ))}
        
        {profiles.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>
                Nessun profilo disponibile.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewProfile}
                sx={{ mt: 2 }}
              >
                Crea il tuo primo profilo
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* Dialog per creazione/modifica profilo */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => !isLoading && setIsDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {formData.id ? 'Modifica Profilo' : 'Nuovo Profilo'}
            </Typography>
            <IconButton 
              onClick={() => !isLoading && setIsDialogOpen(false)}
              disabled={isLoading}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Nome Profilo"
                value={formData.name}
                onChange={handleFormChange}
                fullWidth
                required
                disabled={isLoading}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="definition"
                label="Definizione Bot"
                value={formData.definition}
                onChange={handleFormChange}
                fullWidth
                required
                multiline
                rows={4}
                disabled={isLoading}
                helperText="Questa definizione sarà usata come contesto per Claude"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="welcome"
                label="Messaggio di Benvenuto"
                value={formData.welcome}
                onChange={handleFormChange}
                fullWidth
                multiline
                rows={2}
                disabled={isLoading}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="isMobileDefault"
                    checked={formData.isMobileDefault}
                    onChange={handleFormChange}
                    disabled={isLoading}
                  />
                }
                label="Usa come profilo predefinito per versione mobile"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Solo un profilo può essere impostato come predefinito per la versione mobile
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Basi di Conoscenza
              </Typography>
              
              <KnowledgeBaseEditor
                knowledgeBases={formData.knowledgeBases}
                onChange={handleKnowledgeBasesChange}
                disabled={isLoading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setIsDialogOpen(false)} 
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleSaveProfile} 
            variant="contained" 
            color="primary"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {isLoading ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog di conferma eliminazione */}
      <Dialog
        open={!!deleteConfirmation}
        onClose={() => !isLoading && setDeleteConfirmation(null)}
      >
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare il profilo "{deleteConfirmation?.name}"?
          </Typography>
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            Questa azione non può essere annullata.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmation(null)} 
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button 
            onClick={() => handleDeleteProfile(deleteConfirmation?.id)} 
            color="error" 
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isLoading ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileManager;
