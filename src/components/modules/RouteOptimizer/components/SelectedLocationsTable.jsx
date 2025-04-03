import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { useRouteOptimizerStore } from '../stores/routeOptimizerStore';

// Dialog di modifica
const EditLocationDialog = ({ open, onClose, location, onSave }) => {
  const [name, setName] = useState(location?.name || '');
  const [address, setAddress] = useState(location?.address || '');
  const [duration, setDuration] = useState(location?.duration || 30);
  const [priority, setPriority] = useState(location?.priority || 'normal');
  const [notes, setNotes] = useState(location?.notes || '');
  
  const handleSave = () => {
    onSave({
      ...location,
      name,
      address,
      duration,
      priority,
      notes
    });
    onClose();
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifica Punto</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nome"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          
          <TextField
            label="Indirizzo"
            fullWidth
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          
          <TextField
            label="Durata visita (minuti)"
            type="number"
            fullWidth
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TimeIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl fullWidth>
            <InputLabel>Priorità</InputLabel>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              label="Priorità"
            >
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="normal">Normale</MenuItem>
              <MenuItem value="low">Bassa</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Note"
            fullWidth
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} variant="contained">Salva</Button>
      </DialogActions>
    </Dialog>
  );
};

const SelectedLocationsTable = () => {
  const { locations, removeLocation, updateLocation } = useRouteOptimizerStore();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState(null);
  
  const handleEdit = (location) => {
    setLocationToEdit(location);
    setEditDialogOpen(true);
  };
  
  const handleSaveEdit = (updatedLocation) => {
    updateLocation(updatedLocation.id, updatedLocation);
  };
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'primary';
    }
  };
  
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'normal': return 'Normale';
      case 'low': return 'Bassa';
      default: return 'Normale';
    }
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {locations.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%', 
          flexDirection: 'column', 
          p: 3 
        }}>
          <Typography variant="body1" color="text.secondary" align="center">
            Nessun POS selezionato.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Aggiungi almeno due punti dalla tabella centrale per poter ottimizzare il percorso.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome/Indirizzo</TableCell>
                <TableCell>Info</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.map((location, index) => (
                <TableRow key={location.id} hover>
                  <TableCell>
                    <Typography variant="body2">{location.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {location.address}
                    </Typography>
                    {location.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                        Note: {location.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip 
                        size="small" 
                        icon={<TimeIcon />} 
                        label={`${location.duration} min`} 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Chip 
                        size="small" 
                        icon={<FlagIcon />} 
                        label={getPriorityLabel(location.priority)} 
                        color={getPriorityColor(location.priority)} 
                        variant="outlined" 
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="Modifica">
                        <IconButton size="small" onClick={() => handleEdit(location)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rimuovi">
                        <IconButton size="small" onClick={() => removeLocation(location.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        {locations.length > 0 ? 
          `Totale: ${locations.length} punti, ${locations.reduce((acc, loc) => acc + (loc.duration || 30), 0)} min di visite` : 
          ''}
      </Typography>
      
      {/* Dialog di modifica */}
      {locationToEdit && (
        <EditLocationDialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)} 
          location={locationToEdit}
          onSave={handleSaveEdit}
        />
      )}
    </Box>
  );
};

export default SelectedLocationsTable;