// src/components/modules/TaskTemplates/TaskTemplateEditor.jsx
import React, { useState, useEffect } from 'react';
// Importazioni aggiuntive da aggiungere all'inizio del file
import CodeIcon from '@mui/icons-material/Code';
import JsonEditor from 'react-json-editor-ajrm';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import { fetchTaskTemplate, createTaskTemplate, updateTaskTemplate } from './taskTemplateApi';
//import locale from 'react-json-editor-ajrm/locale/it';

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  Divider,
  Card,
  Chip,
  CardContent,
  CardHeader,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  ContentCopy as DuplicateIcon
} from '@mui/icons-material';

const TaskTemplateEditor = ({ templateId = null, onSave, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [templateData, setTemplateData] = useState({
    descrizione: '',
    codice: '',
    attivo: true,
    template_data: {
      tasks: []
    }
  });

  // Stato aggiuntivo da aggiungere al componente TaskTemplateEditor
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [jsonValue, setJsonValue] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [jsonText, setJsonText] = useState(''); // Aggiungiamo stato per il testo JSON
  const [expandedTask, setExpandedTask] = useState(null);
  const [expandedSubtask, setExpandedSubtask] = useState({});
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertSeverity, setAlertSeverity] = useState('info');
  const [validationErrors, setValidationErrors] = useState({});
  
  // Dialog per la gestione dei campi personalizzati
  const [fieldDialog, setFieldDialog] = useState({
    open: false,
    taskIndex: null,
    subtaskIndex: null,
    fieldIndex: null,
    field: null
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Se c'è un ID, carica il template
        if (templateId) {
          const resultTemplate = await fetchTaskTemplate(templateId);
          
          if (resultTemplate.success) {
            // Assicuriamoci che template_data sia un oggetto e che contenga 'tasks'
            const templateDataObj = typeof resultTemplate.data.template_data === 'string' 
              ? JSON.parse(resultTemplate.data.template_data) 
              : resultTemplate.data.template_data;
            
            if (!templateDataObj || !templateDataObj.tasks) {
              templateDataObj.tasks = [];
            }
            
            setTemplateData({
              ...resultTemplate.data,
              template_data: templateDataObj || { tasks: [] },
              attivo: resultTemplate.data.attivo === 1 // Converte da numero a booleano
            });
            
            // Espandi il primo task se presente
            if (templateDataObj && templateDataObj.tasks && templateDataObj.tasks.length > 0) {
              setExpandedTask(0);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        showAlert('Errore nel caricamento dei dati', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [templateId]);

  const showAlert = (message, severity = 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  };

  const handleCloseAlert = () => {
    setAlertMessage(null);
  };

  const handleAddTask = () => {
    const tasks = [...templateData.template_data.tasks];
    const newTaskId = `task_${Date.now()}`;
    tasks.push({
      id: newTaskId,
      title: 'Nuovo Task',
      description: '',
      stato: 'nuovo',
      progress: 0,
      type_code: '',
      subtasks: []
    });
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Espandi il nuovo task
    setExpandedTask(tasks.length - 1);
  };

  const handleDeleteTask = (index) => {
    const tasks = [...templateData.template_data.tasks];
    tasks.splice(index, 1);
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Resetta expanded se necessario
    if (expandedTask === index) {
      setExpandedTask(null);
    } else if (expandedTask > index) {
      setExpandedTask(expandedTask - 1);
    }
  };

  const handleDuplicateTask = (index) => {
    const tasks = [...templateData.template_data.tasks];
    const taskToDuplicate = { ...tasks[index] };
    
    // Genera nuovi ID per il task duplicato e i suoi subtask
    taskToDuplicate.id = `task_${Date.now()}`;
    taskToDuplicate.title = `${taskToDuplicate.title} (copia)`;
    
    taskToDuplicate.subtasks = taskToDuplicate.subtasks.map(subtask => ({
      ...subtask,
      id: `subtask_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }));
    
    tasks.splice(index + 1, 0, taskToDuplicate);
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Espandi il task duplicato
    setExpandedTask(index + 1);
  };

  const handleMoveTask = (index, direction) => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === templateData.template_data.tasks.length - 1)) {
      return;
    }
    
    const tasks = [...templateData.template_data.tasks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [tasks[index], tasks[newIndex]] = [tasks[newIndex], tasks[index]];
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Aggiorna expanded
    setExpandedTask(newIndex);
  };

  const handleTaskChange = (index, field, value) => {
    const tasks = [...templateData.template_data.tasks];
    tasks[index] = {
      ...tasks[index],
      [field]: value
    };
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
  };

  const handleAddSubtask = (taskIndex) => {
    const tasks = [...templateData.template_data.tasks];
    const newSubtaskId = `subtask_${Date.now()}`;
    
    if (!tasks[taskIndex].subtasks) {
      tasks[taskIndex].subtasks = [];
    }
    
    tasks[taskIndex].subtasks.push({
      id: newSubtaskId,
      title: 'Nuovo Subtask',
      description: '',
      stato: 'nuovo',
      priority: 'medium',
      exclude_from_completion: false,
      fields: []
    });
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Espandi il nuovo subtask
    setExpandedSubtask({
      ...expandedSubtask,
      [`${taskIndex}_${tasks[taskIndex].subtasks.length - 1}`]: true
    });
  };

  const handleDeleteSubtask = (taskIndex, subtaskIndex) => {
    const tasks = [...templateData.template_data.tasks];
    tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Rimuovi expanded
    const expandedKey = `${taskIndex}_${subtaskIndex}`;
    const newExpanded = { ...expandedSubtask };
    delete newExpanded[expandedKey];
    setExpandedSubtask(newExpanded);
  };

  const handleDuplicateSubtask = (taskIndex, subtaskIndex) => {
    const tasks = [...templateData.template_data.tasks];
    const subtaskToDuplicate = { ...tasks[taskIndex].subtasks[subtaskIndex] };
    
    // Genera nuovo ID
    subtaskToDuplicate.id = `subtask_${Date.now()}`;
    subtaskToDuplicate.title = `${subtaskToDuplicate.title} (copia)`;
    
    // Clona i fields
    subtaskToDuplicate.fields = subtaskToDuplicate.fields.map(field => ({
      ...field
    }));
    
    tasks[taskIndex].subtasks.splice(subtaskIndex + 1, 0, subtaskToDuplicate);
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Espandi il subtask duplicato
    setExpandedSubtask({
      ...expandedSubtask,
      [`${taskIndex}_${subtaskIndex + 1}`]: true
    });
  };

  const handleMoveSubtask = (taskIndex, subtaskIndex, direction) => {
    const tasks = [...templateData.template_data.tasks];
    const subtasks = tasks[taskIndex].subtasks;
    
    if ((direction === 'up' && subtaskIndex === 0) || 
        (direction === 'down' && subtaskIndex === subtasks.length - 1)) {
      return;
    }
    
    const newIndex = direction === 'up' ? subtaskIndex - 1 : subtaskIndex + 1;
    
    [subtasks[subtaskIndex], subtasks[newIndex]] = [subtasks[newIndex], subtasks[subtaskIndex]];
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Aggiorna expanded
    const oldKey = `${taskIndex}_${subtaskIndex}`;
    const newKey = `${taskIndex}_${newIndex}`;
    const newExpanded = { ...expandedSubtask };
    
    if (newExpanded[oldKey]) {
      delete newExpanded[oldKey];
      newExpanded[newKey] = true;
    }
    
    setExpandedSubtask(newExpanded);
  };

  const handleSubtaskChange = (taskIndex, subtaskIndex, field, value) => {
    const tasks = [...templateData.template_data.tasks];
    tasks[taskIndex].subtasks[subtaskIndex] = {
      ...tasks[taskIndex].subtasks[subtaskIndex],
      [field]: value
    };
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
  };

  const handleAddField = (taskIndex, subtaskIndex) => {
    // Apri il dialog per aggiungere un nuovo campo
    setFieldDialog({
      open: true,
      taskIndex,
      subtaskIndex,
      fieldIndex: null,
      field: {
        type: 'text',
        label: '',
        value: '',
        field_name: '',
        options: []
      }
    });
  };

  const handleEditField = (taskIndex, subtaskIndex, fieldIndex) => {
    const field = { ...templateData.template_data.tasks[taskIndex].subtasks[subtaskIndex].fields[fieldIndex] };
    
    // Apri il dialog per modificare il campo
    setFieldDialog({
      open: true,
      taskIndex,
      subtaskIndex,
      fieldIndex,
      field
    });
  };

  const handleDeleteField = (taskIndex, subtaskIndex, fieldIndex) => {
    const tasks = [...templateData.template_data.tasks];
    tasks[taskIndex].subtasks[subtaskIndex].fields.splice(fieldIndex, 1);
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
  };

  const handleSaveField = () => {
    const { taskIndex, subtaskIndex, fieldIndex, field } = fieldDialog;
    const tasks = [...templateData.template_data.tasks];
    
    // Validazione
    if (!field.label || !field.field_name) {
      showAlert('Label e Field Name sono obbligatori', 'error');
      return;
    }
    
    // Se è una select, assicuriamoci che ci siano delle opzioni
    if (field.type === 'listbox' && (!field.options || field.options.length === 0)) {
      showAlert('Devi aggiungere almeno un\'opzione per un campo di tipo listbox', 'error');
      return;
    }
    
    if (fieldIndex !== null) {
      // Modifica campo esistente
      tasks[taskIndex].subtasks[subtaskIndex].fields[fieldIndex] = field;
    } else {
      // Aggiungi nuovo campo
      tasks[taskIndex].subtasks[subtaskIndex].fields.push(field);
    }
    
    setTemplateData({
      ...templateData,
      template_data: {
        ...templateData.template_data,
        tasks
      }
    });
    
    // Chiudi il dialog
    setFieldDialog({
      open: false,
      taskIndex: null,
      subtaskIndex: null,
      fieldIndex: null,
      field: null
    });
  };

  const handleFieldChange = (field, value) => {
    setFieldDialog({
      ...fieldDialog,
      field: {
        ...fieldDialog.field,
        [field]: value
      }
    });
  };

  const handleAddOption = () => {
    if (!fieldDialog.field.options) {
      fieldDialog.field.options = [];
    }
    
    const options = [...fieldDialog.field.options, ''];
    
    setFieldDialog({
      ...fieldDialog,
      field: {
        ...fieldDialog.field,
        options
      }
    });
  };

  const handleOptionChange = (index, value) => {
    const options = [...fieldDialog.field.options];
    options[index] = value;
    
    setFieldDialog({
      ...fieldDialog,
      field: {
        ...fieldDialog.field,
        options
      }
    });
  };

  const handleDeleteOption = (index) => {
    const options = [...fieldDialog.field.options];
    options.splice(index, 1);
    
    setFieldDialog({
      ...fieldDialog,
      field: {
        ...fieldDialog.field,
        options
      }
    });
  };

  const validateTemplate = () => {
    const errors = {};
    
    if (!templateData.descrizione.trim()) {
      errors.descrizione = 'Il nome è obbligatorio';
    }

    if (!templateData.codice.trim()) {
      errors.codice = 'Il codice è obbligatorio';
    }
    
    if (!templateData.template_data.tasks || templateData.template_data.tasks.length === 0) {
      errors.tasks = 'Devi aggiungere almeno un task';
    } else {
      // Controlla che ogni task abbia un titolo
      templateData.template_data.tasks.forEach((task, index) => {
        if (!task.title.trim()) {
          errors[`task_${index}_title`] = `Il task ${index + 1} deve avere un titolo`;
        }
        
        // Controlla che ogni subtask abbia un titolo
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask, sIndex) => {
            if (!subtask.title.trim()) {
              errors[`task_${index}_subtask_${sIndex}_title`] = `Il subtask ${sIndex + 1} del task ${index + 1} deve avere un titolo`;
            }
            
            // Controlla che ogni campo abbia label e field_name
            if (subtask.fields && subtask.fields.length > 0) {
              subtask.fields.forEach((field, fIndex) => {
                if (!field.label.trim()) {
                  errors[`task_${index}_subtask_${sIndex}_field_${fIndex}_label`] = `Il campo ${fIndex + 1} del subtask ${sIndex + 1} del task ${index + 1} deve avere una label`;
                }
                if (!field.field_name.trim()) {
                  errors[`task_${index}_subtask_${sIndex}_field_${fIndex}_field_name`] = `Il campo ${fIndex + 1} del subtask ${sIndex + 1} del task ${index + 1} deve avere un field_name`;
                }
              });
            }
          });
        }
      });
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Funzione per aprire l'editor JSON
  const handleOpenJsonEditor = () => {
    // Converti l'oggetto JSON in stringa formattata per l'editor di testo
    const formattedJson = JSON.stringify(templateData.template_data, null, 2);
    setJsonText(formattedJson);
    setJsonError(null);
    setJsonEditorOpen(true);
  };
  
  // Funzione per formattare il JSON
  const handleFormatJson = () => {
    try {
      // Parsa il JSON corrente e lo riformatta
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setJsonError(null);
    } catch (error) {
      setJsonError(`Errore di sintassi JSON: ${error.message}`);
    }
  };
  
  // Funzione per gestire modifiche al testo JSON
  const handleJsonTextChange = (e) => {
    const value = e.target.value;
    setJsonText(value);
    
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (error) {
      setJsonError(`Errore di sintassi JSON: ${error.message}`);
    }
  };
  
  // Funzione per gestire modifiche al JSON
  const handleJsonChange = (value) => {
    if (value.error) {
      setJsonError(value.error);
      return;
    }
    
    setJsonError(null);
    setJsonValue(value.jsObject);
  };
  
  // Funzione per salvare le modifiche al JSON
  const handleSaveJson = () => {
    try {
      const parsedJson = JSON.parse(jsonText);
      
      // Verifica la struttura minima richiesta
      if (!parsedJson || !parsedJson.tasks || !Array.isArray(parsedJson.tasks)) {
        throw new Error('La struttura del JSON non è valida. Deve contenere almeno un array "tasks".');
      }
      
      // Verifica che ogni task abbia un id e un title
      parsedJson.tasks.forEach((task, index) => {
        if (!task.id) {
          throw new Error(`Il task ${index + 1} non ha un ID valido.`);
        }
        if (!task.title) {
          throw new Error(`Il task ${index + 1} non ha un titolo.`);
        }
        
        // Verifica subtasks se presenti
        if (task.subtasks && Array.isArray(task.subtasks)) {
          task.subtasks.forEach((subtask, sIndex) => {
            if (!subtask.id) {
              throw new Error(`Il subtask ${sIndex + 1} del task "${task.title}" non ha un ID valido.`);
            }
            if (!subtask.title) {
              throw new Error(`Il subtask ${sIndex + 1} del task "${task.title}" non ha un titolo.`);
            }
          });
        }
      });
      
      // Se arriva qui, la validazione è riuscita
      setTemplateData({
        ...templateData,
        template_data: parsedJson
      });
      
      setJsonEditorOpen(false);
      showAlert('JSON aggiornato con successo!', 'success');
    } catch (error) {
      setJsonError(error.message);
      showAlert(`Errore nella validazione del JSON: ${error.message}`, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!validateTemplate()) {
      showAlert('Ci sono errori nel template. Controlla i campi evidenziati.', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Adatta i dati al nuovo formato della tabella
      const dataToSend = {
        id: templateId,
        codice: templateData.codice,
        descrizione: templateData.descrizione,
        attivo: templateData.attivo ? 1 : 0,
        template_data: templateData.template_data
      };
      
      const result = templateId 
        ? await updateTaskTemplate(dataToSend)
        : await createTaskTemplate(dataToSend);
      
      if (result.success) {
        showAlert('Template salvato con successo!', 'success');
        
        if (onSave) {
          // Passa l'id del template salvato
          onSave(result.data.id);
        }
      } else {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showAlert(`Errore durante il salvataggio: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !templateData.template_data.tasks.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {templateId ? 'Modifica Template' : 'Nuovo Template'}
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nome Template"
              fullWidth
              value={templateData.descrizione}
              onChange={(e) => setTemplateData({ ...templateData, descrizione: e.target.value })}
              error={!!validationErrors.descrizione}
              helperText={validationErrors.descrizione}
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Codice"
              fullWidth
              value={templateData.codice}
              onChange={(e) => setTemplateData({ ...templateData, codice: e.target.value })}
              error={!!validationErrors.codice}
              helperText={validationErrors.codice}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={templateData.attivo}
                  onChange={(e) => setTemplateData({ ...templateData, attivo: e.target.checked })}
                />
              }
              label="Template Attivo"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tasks</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddTask}
        >
          Aggiungi Task
        </Button>
      </Box>
      
      {validationErrors.tasks && (
        <Alert severity="error" sx={{ mb: 2 }}>{validationErrors.tasks}</Alert>
      )}
      
      {templateData.template_data.tasks.map((task, taskIndex) => (
        <Accordion
          key={task.id || taskIndex}
          expanded={expandedTask === taskIndex}
          onChange={() => setExpandedTask(expandedTask === taskIndex ? null : taskIndex)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`task-${taskIndex}-content`}
            id={`task-${taskIndex}-header`}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1">
                {task.title || `Task ${taskIndex + 1}`}
              </Typography>
              
              <Box sx={{ ml: 'auto', display: 'flex' }}>
                <IconButton 
                  size="small" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleMoveTask(taskIndex, 'up');
                  }}
                  disabled={taskIndex === 0}
                >
                  <MoveUpIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleMoveTask(taskIndex, 'down');
                  }}
                  disabled={taskIndex === templateData.template_data.tasks.length - 1}
                >
                  <MoveDownIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleDuplicateTask(taskIndex);
                  }}
                >
                  <DuplicateIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleDeleteTask(taskIndex);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Titolo Task"
                  fullWidth
                  value={task.title}
                  onChange={(e) => handleTaskChange(taskIndex, 'title', e.target.value)}
                  error={!!validationErrors[`task_${taskIndex}_title`]}
                  helperText={validationErrors[`task_${taskIndex}_title`]}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Codice Tipo"
                  fullWidth
                  value={task.type_code || ''}
                  onChange={(e) => handleTaskChange(taskIndex, 'type_code', e.target.value)}
                  placeholder="es. SURVEY, DESIGN, etc."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Descrizione Task"
                  fullWidth
                  multiline
                  rows={2}
                  value={task.description || ''}
                  onChange={(e) => handleTaskChange(taskIndex, 'description', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">Subtasks</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddSubtask(taskIndex)}
                  >
                    Aggiungi Subtask
                  </Button>
                </Box>
                
                {(task.subtasks || []).map((subtask, subtaskIndex) => (
                  <Accordion
                    key={subtask.id || subtaskIndex}
                    expanded={!!expandedSubtask[`${taskIndex}_${subtaskIndex}`]}
                    onChange={() => {
                      const key = `${taskIndex}_${subtaskIndex}`;
                      setExpandedSubtask({
                        ...expandedSubtask,
                        [key]: !expandedSubtask[key]
                      });
                    }}
                    sx={{ mb: 2 }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`subtask-${taskIndex}-${subtaskIndex}-content`}
                      id={`subtask-${taskIndex}-${subtaskIndex}-header`}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                        <Typography variant="body1">
                          {subtask.title || `Subtask ${subtaskIndex + 1}`}
                          {subtask.exclude_from_completion && (
                            <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                              (Escluso dal completamento)
                            </Typography>
                          )}
                        </Typography>
                        
                        <Box sx={{ ml: 'auto', display: 'flex' }}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleMoveSubtask(taskIndex, subtaskIndex, 'up');
                            }}
                            disabled={subtaskIndex === 0}
                          >
                            <MoveUpIcon fontSize="small" />
                          </IconButton>
                          
                          <IconButton 
                            size="small" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleMoveSubtask(taskIndex, subtaskIndex, 'down');
                            }}
                            disabled={subtaskIndex === (task.subtasks || []).length - 1}
                          >
                            <MoveDownIcon fontSize="small" />
                          </IconButton>
                          
                          <IconButton 
                            size="small" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleDuplicateSubtask(taskIndex, subtaskIndex);
                            }}
                          >
                            <DuplicateIcon fontSize="small" />
                          </IconButton>
                          
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleDeleteSubtask(taskIndex, subtaskIndex);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Titolo Subtask"
                            fullWidth
                            value={subtask.title}
                            onChange={(e) => handleSubtaskChange(taskIndex, subtaskIndex, 'title', e.target.value)}
                            error={!!validationErrors[`task_${taskIndex}_subtask_${subtaskIndex}_title`]}
                            helperText={validationErrors[`task_${taskIndex}_subtask_${subtaskIndex}_title`]}
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Priorità</InputLabel>
                            <Select
                              value={subtask.priority || 'medium'}
                              label="Priorità"
                              onChange={(e) => handleSubtaskChange(taskIndex, subtaskIndex, 'priority', e.target.value)}
                            >
                              <MenuItem value="low">Bassa</MenuItem>
                              <MenuItem value="medium">Media</MenuItem>
                              <MenuItem value="high">Alta</MenuItem>
                              <MenuItem value="urgent">Urgente</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            label="Descrizione Subtask"
                            fullWidth
                            multiline
                            rows={2}
                            value={subtask.description || ''}
                            onChange={(e) => handleSubtaskChange(taskIndex, subtaskIndex, 'description', e.target.value)}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={!!subtask.exclude_from_completion}
                                onChange={(e) => handleSubtaskChange(taskIndex, subtaskIndex, 'exclude_from_completion', e.target.checked)}
                              />
                            }
                            label="Escludi dal calcolo completamento"
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2">Campi Personalizzati</Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => handleAddField(taskIndex, subtaskIndex)}
                            >
                              Aggiungi Campo
                            </Button>
                          </Box>
                          
                          {(subtask.fields || []).length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                              Nessun campo personalizzato definito
                            </Typography>
                          ) : (
                            <Grid container spacing={2}>
                              {subtask.fields.map((field, fieldIndex) => (
                                <Grid item xs={12} key={fieldIndex}>
                                  <Card variant="outlined">
                                    <CardHeader
                                      title={field.label}
                                      subheader={`Tipo: ${getFieldTypeLabel(field.type)}`}
                                      action={
                                        <Box>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleEditField(taskIndex, subtaskIndex, fieldIndex)}
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteField(taskIndex, subtaskIndex, fieldIndex)}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      }
                                    />
                                    <CardContent>
                                      <Typography variant="body2" color="text.secondary">
                                        Field Name: {field.field_name}
                                      </Typography>
                                      {field.type === 'listbox' && field.options && field.options.length > 0 && (
                                        <Box sx={{ mt: 1 }}>
                                          <Typography variant="body2" color="text.secondary">
                                            Opzioni:
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {field.options.map((option, optIndex) => (
                                              <Chip key={optIndex} label={option} size="small" />
                                            ))}
                                          </Box>
                                        </Box>
                                      )}
                                      {field.value && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                          Valore Default: {field.value}
                                        </Typography>
                                      )}
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                          )}
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
                
                {(task.subtasks || []).length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    Nessun subtask definito
                  </Typography>
                )}
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
      
      {templateData.template_data.tasks.length === 0 && (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
          Nessun task definito. Aggiungi il primo task per iniziare.
        </Typography>
      )}
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={onCancel}>
          Annulla
        </Button>
        <Button 
          variant="outlined" 
          color="secondary"
          startIcon={<CodeIcon />} 
          onClick={handleOpenJsonEditor}
        >
          Modifica JSON
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />} 
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Salva Template'}
        </Button>
      </Box>

      {/* Dialog per la gestione dei campi */}
      <Dialog
        open={fieldDialog.open}
        onClose={() => setFieldDialog({ ...fieldDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {fieldDialog.fieldIndex !== null ? 'Modifica Campo' : 'Nuovo Campo'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Label"
                fullWidth
                value={fieldDialog.field?.label || ''}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Field Name"
                fullWidth
                value={fieldDialog.field?.field_name || ''}
                onChange={(e) => handleFieldChange('field_name', e.target.value)}
                required
                helperText="Nome tecnico del campo (senza spazi, solo lettere, numeri e underscore)"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo Campo</InputLabel>
                <Select
                  value={fieldDialog.field?.type || 'text'}
                  label="Tipo Campo"
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                >
                  <MenuItem value="text">Testo</MenuItem>
                  <MenuItem value="date">Data</MenuItem>
                  <MenuItem value="checkbox">Checkbox</MenuItem>
                  <MenuItem value="listbox">Lista Valori</MenuItem>
                  <MenuItem value="upload">Upload File</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Valore Default"
                fullWidth
                value={fieldDialog.field?.value || ''}
                onChange={(e) => handleFieldChange('value', e.target.value)}
                disabled={fieldDialog.field?.type === 'upload'}
                helperText={fieldDialog.field?.type === 'checkbox' ? "Usa '1' per checked, '0' per unchecked" : ""}
              />
            </Grid>
            
            {fieldDialog.field?.type === 'listbox' && (
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Opzioni
                  </Typography>
                  
                  {(fieldDialog.field?.options || []).map((option, index) => (
                    <Box key={index} sx={{ display: 'flex', mb: 1, alignItems: 'center' }}>
                      <TextField
                        label={`Opzione ${index + 1}`}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteOption(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddOption}
                    size="small"
                  >
                    Aggiungi Opzione
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialog({ ...fieldDialog, open: false })}>
            Annulla
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveField}
          >
            Salva
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
      
      {/* Dialog per l'editor JSON */}
      <Dialog
        open={jsonEditorOpen}
        onClose={() => setJsonEditorOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          Editor JSON Template
          <IconButton
            aria-label="close"
            onClick={() => setJsonEditorOpen(false)}
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
        <DialogContent dividers sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Modifica direttamente la struttura JSON del template. Assicurati che ogni task e subtask abbia un ID e un titolo.
            </Typography>
            <Button 
              size="small" 
              onClick={handleFormatJson} 
              startIcon={<FormatAlignLeftIcon />}
              variant="outlined"
            >
              Formatta JSON
            </Button>
          </Box>
          
          <TextField
            fullWidth
            multiline
            variant="outlined"
            value={jsonText}
            onChange={handleJsonTextChange}
            error={!!jsonError}
            helperText={jsonError}
            rows={25}
            InputProps={{
              sx: { 
                fontFamily: 'monospace', 
                fontSize: '0.9rem' 
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonEditorOpen(false)} variant="outlined">
            Annulla
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveJson}
            disabled={!!jsonError}
          >
            Salva Modifiche
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper per ottenere l'etichetta del tipo di campo
const getFieldTypeLabel = (type) => {
  const types = {
    'text': 'Testo',
    'date': 'Data',
    'checkbox': 'Checkbox',
    'listbox': 'Lista Valori',
    'upload': 'Upload File'
  };

  return types[type] || type;
};

export default TaskTemplateEditor;