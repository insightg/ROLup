// src/components/modules/ChatBot/components/KnowledgeBaseEditor.jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  InputAdornment,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useSnackbar } from 'notistack';

/**
 * Editor per le basi di conoscenza
 */
const KnowledgeBaseEditor = ({ knowledgeBases = [], onChange, disabled = false }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  // Stati locali
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [localKnowledgeBases, setLocalKnowledgeBases] = useState(knowledgeBases);
  const [fileUploadDialog, setFileUploadDialog] = useState(false);
  
  // Riferimento al file input (nascosto)
  const fileInputRef = React.useRef(null);
  
  // Sincronizza lo stato locale quando cambiano le props
  React.useEffect(() => {
    setLocalKnowledgeBases(knowledgeBases);
  }, [knowledgeBases]);
  
  // Gestisce il cambio tab
  const handleTabChange = (event, newValue) => {
    setActiveTabIndex(newValue);
  };
  
  // Aggiunge una nuova base di conoscenza
  const handleAddKnowledgeBase = () => {
    const newKnowledgeBase = {
      id: uuidv4(),
      name: '',
      content: '',
      active: true
    };
    
    setLocalKnowledgeBases(prev => [...prev, newKnowledgeBase]);
    setActiveTabIndex(localKnowledgeBases.length);
    
    // Propaghiamo il cambiamento
    if (onChange) {
      onChange([...localKnowledgeBases, newKnowledgeBase]);
    }
  };
  
  // Rimuove una base di conoscenza
  const handleRemoveKnowledgeBase = (index) => {
    if (localKnowledgeBases.length <= 1) {
      enqueueSnackbar('Deve essere presente almeno una base di conoscenza', { variant: 'warning' });
      return;
    }
    
    const newKnowledgeBases = [...localKnowledgeBases];
    newKnowledgeBases.splice(index, 1);
    
    setLocalKnowledgeBases(newKnowledgeBases);
    
    // Aggiorna l'indice della tab attiva
    if (activeTabIndex >= newKnowledgeBases.length) {
      setActiveTabIndex(Math.max(0, newKnowledgeBases.length - 1));
    }
    
    // Propaghiamo il cambiamento
    if (onChange) {
      onChange(newKnowledgeBases);
    }
  };
  
  // Gestisce i cambiamenti nei campi
  const handleKnowledgeBaseChange = (index, field, value) => {
    const newKnowledgeBases = [...localKnowledgeBases];
    newKnowledgeBases[index] = {
      ...newKnowledgeBases[index],
      [field]: value
    };
    
    setLocalKnowledgeBases(newKnowledgeBases);
    
    // Propaghiamo il cambiamento
    if (onChange) {
      onChange(newKnowledgeBases);
    }
  };
  
  // Gestisce l'importazione di un file
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      
      // Aggiorna il contenuto della base di conoscenza attiva
      const newKnowledgeBases = [...localKnowledgeBases];
      newKnowledgeBases[activeTabIndex].content = content;
      
      // Aggiorna il nome se la base è vuota
      if (!newKnowledgeBases[activeTabIndex].name) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Rimuovi estensione
        newKnowledgeBases[activeTabIndex].name = fileName;
      }
      
      setLocalKnowledgeBases(newKnowledgeBases);
      
      // Propaghiamo il cambiamento
      if (onChange) {
        onChange(newKnowledgeBases);
      }
      
      // Reset del campo file
      e.target.value = '';
      setFileUploadDialog(false);
      
      enqueueSnackbar(`File importato: ${file.name}`, { variant: 'success' });
    };
    
    reader.readAsText(file);
  };
  
  // Gestisce l'esportazione in file
  const handleFileExport = () => {
    const kb = localKnowledgeBases[activeTabIndex];
    if (!kb || !kb.content) {
      enqueueSnackbar('Nessun contenuto da esportare', { variant: 'warning' });
      return;
    }
    
    const fileName = kb.name || 'base_conoscenza';
    const blob = new Blob([kb.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    enqueueSnackbar(`File esportato: ${fileName}.txt`, { variant: 'success' });
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTabIndex} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {localKnowledgeBases.map((kb, index) => (
            <Tab 
              key={kb.id || index} 
              label={kb.name || `Base ${index + 1}`}
              disabled={disabled}
            />
          ))}
          
          <Tab 
            icon={<AddIcon />} 
            onClick={(e) => {
              e.stopPropagation();
              handleAddKnowledgeBase();
            }}
            disabled={disabled}
          />
        </Tabs>
      </Box>
      
      {/* Contenuto dei tab */}
      {localKnowledgeBases.map((kb, index) => (
        <Box
          key={kb.id || index}
          role="tabpanel"
          hidden={activeTabIndex !== index}
          id={`knowledge-base-tabpanel-${index}`}
          aria-labelledby={`knowledge-base-tab-${index}`}
          sx={{ mt: 2 }}
        >
          {activeTabIndex === index && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Nome Base di Conoscenza"
                  value={kb.name}
                  onChange={(e) => handleKnowledgeBaseChange(index, 'name', e.target.value)}
                  fullWidth
                  disabled={disabled}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => handleRemoveKnowledgeBase(index)}
                          edge="end"
                          disabled={disabled || localKnowledgeBases.length <= 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
              
              <TextField
                label="Contenuto"
                value={kb.content}
                onChange={(e) => handleKnowledgeBaseChange(index, 'content', e.target.value)}
                fullWidth
                multiline
                rows={10}
                disabled={disabled}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={kb.active}
                      onChange={(e) => handleKnowledgeBaseChange(index, 'active', e.target.checked)}
                      disabled={disabled}
                    />
                  }
                  label="Attiva"
                />
                
                <Box>
                  <Button
                    startIcon={<UploadIcon />}
                    onClick={() => setFileUploadDialog(true)}
                    disabled={disabled}
                    sx={{ mr: 1 }}
                  >
                    Importa
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={handleFileExport}
                    disabled={disabled || !kb.content}
                  >
                    Esporta
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      ))}
      
      {/* Input file nascosto */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".txt,.md,.doc,.docx,.pdf"
        onChange={handleFileImport}
      />
      
      {/* Dialog per upload file */}
      <Dialog open={fileUploadDialog} onClose={() => setFileUploadDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Importa File</Typography>
            <IconButton onClick={() => setFileUploadDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Seleziona un file da importare come base di conoscenza. Il contenuto del file verrà caricato nel campo di testo.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
            Formati supportati: .txt, .md, .doc, .docx, .pdf
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current.click()}
            >
              Seleziona File
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileUploadDialog(false)}>
            Annulla
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KnowledgeBaseEditor;
