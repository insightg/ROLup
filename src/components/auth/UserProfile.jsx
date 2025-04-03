import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  Chip,
  Divider,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Groups as GroupsIcon,
  Edit as EditIcon,
  VpnKey as KeyIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from './AuthContext';

const UserProfile = () => {
  const { user, getProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stato per il dialog di cambio password
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Carica il profilo all'avvio
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await getProfile();
        if (result.success) {
          setProfile(result.profile);
        } else {
          setError(result.error || 'Failed to load profile');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [getProfile]);

  // Gestione dialog cambio password
  const handleOpenPasswordDialog = () => {
    setPasswordDialogOpen(true);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordFormErrors({});
    setPasswordSuccess(false);
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    
    // Reset errore per il campo modificato
    if (passwordFormErrors[name]) {
      setPasswordFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validazione form password
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Password attuale richiesta';
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = 'Nuova password richiesta';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'La password deve essere di almeno 8 caratteri';
    }
    
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Conferma password richiesta';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Le password non corrispondono';
    }
    
    setPasswordFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Cambio password
  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    
    setPasswordSubmitting(true);
    setPasswordSuccess(false);
    
    try {
      const result = await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      if (result.success) {
        setPasswordSuccess(true);
        // Reset form dopo il successo
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordFormErrors(prev => ({
          ...prev,
          submit: result.error || 'Failed to change password'
        }));
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordFormErrors(prev => ({
        ...prev,
        submit: 'Error changing password'
      }));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Ottieni l'iniziale del nome per l'avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profilo Utente
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={60} />
        </Box>
      ) : profile ? (
        <Grid container spacing={3}>
          {/* Informazioni principali */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem'
                  }}
                >
                  {getInitials(profile.full_name)}
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  {profile.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.username}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email"
                    secondary={profile.email}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <GroupsIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Gruppi"
                    secondary={
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {profile.groups.map(group => (
                          <Chip 
                            key={group.id} 
                            label={group.name} 
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                        {profile.groups.length === 0 && 'Nessun gruppo assegnato'}
                      </Box>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Ultimo accesso"
                    secondary={
                      profile.last_login 
                        ? format(new Date(profile.last_login), 'dd MMMM yyyy, HH:mm', { locale: it })
                        : 'Mai'
                    }
                  />
                </ListItem>
              </List>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<KeyIcon />}
                  onClick={handleOpenPasswordDialog}
                >
                  Cambia Password
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Contenuto aggiuntivo - esempio di altre sezioni */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Attività Recenti
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Questa sezione mostrerà le tue attività recenti nel sistema.
              </Typography>
            </Paper>
            
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Preferenze
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Qui potrai gestire le tue preferenze di sistema.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info">
          Impossibile caricare il profilo. Riprova più tardi.
        </Alert>
      )}
      
      {/* Dialog Cambio Password */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handleClosePasswordDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Cambia Password
        </DialogTitle>
        <DialogContent>
          {passwordFormErrors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordFormErrors.submit}
            </Alert>
          )}
          
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password cambiata con successo!
            </Alert>
          )}
          
          <TextField
            margin="dense"
            name="currentPassword"
            label="Password Attuale"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordForm.currentPassword}
            onChange={handlePasswordFormChange}
            error={!!passwordFormErrors.currentPassword}
            helperText={passwordFormErrors.currentPassword}
            required
            disabled={passwordSubmitting}
          />
          
          <TextField
            margin="dense"
            name="newPassword"
            label="Nuova Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordForm.newPassword}
            onChange={handlePasswordFormChange}
            error={!!passwordFormErrors.newPassword}
            helperText={passwordFormErrors.newPassword}
            required
            disabled={passwordSubmitting}
          />
          
          <TextField
            margin="dense"
            name="confirmPassword"
            label="Conferma Nuova Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordFormChange}
            error={!!passwordFormErrors.confirmPassword}
            helperText={passwordFormErrors.confirmPassword}
            required
            disabled={passwordSubmitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} disabled={passwordSubmitting}>
            Annulla
          </Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained" 
            disabled={passwordSubmitting}
          >
            {passwordSubmitting ? (
              <CircularProgress size={24} />
            ) : (
              'Cambia Password'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserProfile;
