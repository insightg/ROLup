// src/components/modules/TaskTemplates/TaskTemplatesPage.jsx
import React, { useState, useEffect } from 'react';
import apiUtils from '../../../utils/apiUtils';

import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import TaskTemplateEditor from './TaskTemplateEditor';
import TaskTemplateViewer from './TaskTemplateViewer'; // Componente per visualizzare un template in sola lettura

const TaskTemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertSeverity, setAlertSeverity] = useState('info');
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Menu contestuale
  const [anchorEl, setAnchorEl] = useState(null);
  const [contextTemplate, setContextTemplate] = useState(null);

  // Carica i template
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const result = await apiUtils.get('b_tsis.php?action=getTipiAttivita');
      
      if (result.success) {
        // Trasforma i dati per mantenere compatibilità
        const transformedData = result.data.map(item => ({
          id: item.id,
          name: item.descrizione,
          description: item.descrizione,
          is_active: item.attivo === 1,
          template_data: item.template_data || { tasks: [] },
          // Aggiunti campi specifici della nuova tabella
          codice: item.codice,
          // Aggiungi il campo per il conteggio degli ordini
          ordini_count: parseInt(item.ordini_count || 0)
        }));
        
        setTemplates(transformedData);
        setFilteredTemplates(transformedData);
      } else {
        throw new Error(result.error || 'Errore nel caricamento dei template');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      showAlert(`Errore nel caricamento dei template: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filtra template in base alla ricerca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTemplates(templates);
    } else {
      const term = searchTerm.toLowerCase().trim();
      const filtered = templates.filter(template => 
        template.name.toLowerCase().includes(term) || 
        template.description?.toLowerCase().includes(term) ||
        template.codice?.toLowerCase().includes(term)
      );
      setFilteredTemplates(filtered);
    }
  }, [searchTerm, templates]);

  const showAlert = (message, severity = 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  };

  const handleCloseAlert = () => {
    setAlertMessage(null);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenEditor = (template = null) => {
    setSelectedTemplate(template);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setSelectedTemplate(null);
  };

  const handleOpenViewer = (template) => {
    setSelectedTemplate(template);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedTemplate(null);
  };

  const handleSaveTemplate = () => {
    // Reload template list after saving
    loadTemplates();
    handleCloseEditor();
    showAlert('Template salvato con successo!', 'success');
  };

  const handleOpenDeleteDialog = (template) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return;
    
    setIsLoading(true);
    
    try {
      const result = await apiUtils.delete(`b_tsis.php?action=deleteTipoAttivita&id=${selectedTemplate.id}`);
      
      if (result.success) {
        showAlert('Template eliminato con successo!', 'success');
        loadTemplates();
      } else {
        throw new Error(result.error || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showAlert(`Errore durante l'eliminazione: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      handleCloseDeleteDialog();
    }
  };

  const handleOpenCopyDialog = (template) => {
    setSelectedTemplate(template);
    setNewTemplateName(`${template.name} (copia)`);
    setCopyDialogOpen(true);
  };

  const handleCloseCopyDialog = () => {
    setCopyDialogOpen(false);
    setSelectedTemplate(null);
    setNewTemplateName('');
  };

  const handleConfirmCopy = async () => {
    if (!selectedTemplate || !newTemplateName.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Crea una copia del template
      const templateCopy = {
        ...selectedTemplate,
        descrizione: newTemplateName,
        codice: `${selectedTemplate.codice}_COPY`,
        id: null  // Rimuovi ID per creare un nuovo record
      };
      
      const result = await apiUtils.post('b_tsis.php?action=saveTipoAttivita', templateCopy);
      
      if (result.success) {
        showAlert('Template duplicato con successo!', 'success');
        loadTemplates();
      } else {
        throw new Error(result.error || 'Errore durante la duplicazione');
      }
    } catch (error) {
      console.error('Error copying template:', error);
      showAlert(`Errore durante la duplicazione: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      handleCloseCopyDialog();
    }
  };

  // Menu contestuale
  const handleOpenMenu = (event, template) => {
    setAnchorEl(event.currentTarget);
    setContextTemplate(template);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setContextTemplate(null);
  };

  // Conteggio task e subtask per template
  const countTasksAndSubtasks = (template) => {
    if (!template.template_data) return { tasks: 0, subtasks: 0 };
    
    let templateData;
    if (typeof template.template_data === 'string') {
      try {
        templateData = JSON.parse(template.template_data);
      } catch (e) {
        console.error('Error parsing template data:', e);
        return { tasks: 0, subtasks: 0 };
      }
    } else {
      templateData = template.template_data;
    }
    
    const tasks = templateData.tasks?.length || 0;
    let subtasks = 0;
    
    if (templateData.tasks) {
      templateData.tasks.forEach(task => {
        subtasks += task.subtasks?.length || 0;
      });
    }
    
    return { tasks, subtasks };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Gestione Template Task
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <TextField
          placeholder="Cerca template..."
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
        />
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenEditor()}
        >
          Nuovo Template
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Codice</TableCell>
              <TableCell>Contenuto</TableCell>
              <TableCell align="center">Ordini Associati</TableCell>
              <TableCell align="center">Stato</TableCell>
              <TableCell align="center">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {searchTerm ? 'Nessun template trovato per la ricerca' : 'Nessun template disponibile'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => {
                const { tasks, subtasks } = countTasksAndSubtasks(template);
                
                return (
                  <TableRow key={template.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {template.name}
                      </Typography>
                      {template.description && template.description !== template.name && (
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.codice}
                        size="small"
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip 
                          label={`${tasks} task`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          label={`${subtasks} subtask`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={template.ordini_count || 0}
                        size="small"
                        color={template.ordini_count > 0 ? "info" : "default"}
                        sx={{ fontWeight: template.ordini_count > 0 ? 'bold' : 'normal' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={template.is_active ? 'Attivo' : 'Inattivo'}
                        color={template.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Visualizza">
                        <IconButton 
                          size="small"
                          color="info"
                          onClick={() => handleOpenViewer(template)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifica">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditor(template)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Altre azioni">
                        <IconButton 
                          size="small"
                          onClick={(e) => handleOpenMenu(e, template)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Menu contestuale */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem 
          onClick={() => {
            handleCloseMenu();
            handleOpenCopyDialog(contextTemplate);
          }}
        >
          <DuplicateIcon fontSize="small" sx={{ mr: 1 }} />
          Duplica
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleCloseMenu();
            handleOpenDeleteDialog(contextTemplate);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Elimina
        </MenuItem>
      </Menu>
      
      {/* Dialog Editor */}
      <Dialog
        open={editorOpen}
        onClose={handleCloseEditor}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            height: '90vh',
            maxHeight: 'none',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ overflow: 'auto', flex: 1 }}>
            <TaskTemplateEditor
              templateId={selectedTemplate?.id}
              onSave={handleSaveTemplate}
              onCancel={handleCloseEditor}
            />
          </Box>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Viewer */}
      <Dialog
        open={viewerOpen}
        onClose={handleCloseViewer}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            height: '90vh',
            maxHeight: 'none' 
          }
        }}
      >
        <DialogTitle>
          {selectedTemplate?.name}
          <IconButton
            aria-label="close"
            onClick={handleCloseViewer}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTemplate && (
            <TaskTemplateViewer template={selectedTemplate} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewer}>Chiudi</Button>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => {
              handleCloseViewer();
              handleOpenEditor(selectedTemplate);
            }}
          >
            Modifica
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Elimina */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare il template <strong>{selectedTemplate?.name}</strong>?<br />
            Questa azione non può essere annullata.
          </Typography>
          {selectedTemplate?.ordini_count > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Questo template è associato a {selectedTemplate.ordini_count} ordini. 
              Il template verrà disattivato anziché eliminato.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annulla</Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
          >
            {selectedTemplate?.ordini_count > 0 ? 'Disattiva' : 'Elimina'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog Duplica */}
      <Dialog
        open={copyDialogOpen}
        onClose={handleCloseCopyDialog}
      >
        <DialogTitle>Duplica template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Nome nuovo template"
              fullWidth
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCopyDialog}>Annulla</Button>
          <Button 
            onClick={handleConfirmCopy} 
            variant="contained" 
            color="primary"
            disabled={!newTemplateName.trim()}
          >
            Duplica
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar per notifiche */}
      <Snackbar
        open={!!alertMessage}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alertSeverity} 
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskTemplatesPage;