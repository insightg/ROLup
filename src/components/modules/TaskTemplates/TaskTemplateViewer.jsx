// src/components/modules/TaskTemplates/TaskTemplateViewer.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Task as TaskIcon,
  Assignment as SubtaskIcon,
  CheckCircle as CheckIcon,
  Chip as ChipIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const TaskTemplateViewer = ({ template }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [templateData, setTemplateData] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [expandedSubtask, setExpandedSubtask] = useState({});

  useEffect(() => {
    const initViewer = async () => {
      setIsLoading(true);
      try {
        // Estrai i dati del template
        let parsedData = template.template_data;
        if (typeof parsedData === 'string') {
          parsedData = JSON.parse(parsedData);
        }
        
        setTemplateData(parsedData);
        
        // Espandi il primo task se presente
        if (parsedData?.tasks?.length > 0) {
          setExpandedTask(0);
        }
      } catch (error) {
        console.error('Error initializing viewer:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initViewer();
  }, [template]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!templateData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">
          Errore: impossibile caricare i dati del template
        </Typography>
      </Box>
    );
  }

  const countTotals = () => {
    const tasks = templateData.tasks?.length || 0;
    let subtasks = 0;
    let fields = 0;
    
    if (templateData.tasks) {
      templateData.tasks.forEach(task => {
        subtasks += task.subtasks?.length || 0;
        
        if (task.subtasks) {
          task.subtasks.forEach(subtask => {
            fields += subtask.fields?.length || 0;
          });
        }
      });
    }
    
    return { tasks, subtasks, fields };
  };

  const totals = countTotals();

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {template.name || template.descrizione}
            </Typography>
            {template.description && template.description !== template.name && (
              <Typography variant="body2" color="text.secondary">
                {template.description}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                label={template.is_active || template.attivo ? 'Attivo' : 'Inattivo'} 
                color={template.is_active || template.attivo ? 'success' : 'default'}
              />
              
              <Chip 
                label={template.codice}
                color="primary"
                variant="outlined"
              />
              
              <Chip 
                label={`${totals.tasks} tasks`} 
                color="info"
                variant="outlined"
              />
              
              <Chip 
                label={`${totals.subtasks} subtasks`} 
                color="secondary"
                variant="outlined"
              />
              
              <Chip 
                label={`${totals.fields} campi`} 
                color="default"
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">
          Struttura Template
        </Typography>
      </Box>

      {(templateData.tasks || []).length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
          Nessun task definito in questo template.
        </Typography>
      ) : (
        (templateData.tasks || []).map((task, taskIndex) => (
          <Accordion
            key={task.id || taskIndex}
            expanded={expandedTask === taskIndex}
            onChange={() => setExpandedTask(expandedTask === taskIndex ? null : taskIndex)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`task-${taskIndex}-content`}
              id={`task-${taskIndex}-header`}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TaskIcon color="primary" />
                <Box>
                  <Typography variant="subtitle1">
                    {task.title}
                  </Typography>
                  {task.type_code && (
                    <Typography variant="caption" color="text.secondary">
                      Codice: {task.type_code}
                    </Typography>
                  )}
                </Box>
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              {task.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Descrizione
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">
                      {task.description}
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Subtasks ({(task.subtasks || []).length})
              </Typography>
              
              {(task.subtasks || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  Nessun subtask definito per questo task.
                </Typography>
              ) : (
                (task.subtasks || []).map((subtask, subtaskIndex) => (
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
                    sx={{ mb: 1 }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`subtask-${taskIndex}-${subtaskIndex}-content`}
                      id={`subtask-${taskIndex}-${subtaskIndex}-header`}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SubtaskIcon color="secondary" />
                        <Box>
                          <Typography variant="body1">
                            {subtask.title}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={`Priorità: ${getPriorityLabel(subtask.priority)}`} 
                              size="small"
                              color={getPriorityColor(subtask.priority)}
                              variant="outlined"
                            />
                            
                            {subtask.exclude_from_completion && (
                              <Chip 
                                label="Escluso dal completamento" 
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            )}
                            
                            {(subtask.fields || []).length > 0 && (
                              <Chip 
                                label={`${subtask.fields.length} campi`} 
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      {subtask.description && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Descrizione
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="body2">
                              {subtask.description}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                      
                      {(subtask.fields || []).length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Campi ({subtask.fields.length})
                          </Typography>
                          
                          <Grid container spacing={2}>
                            {subtask.fields.map((field, fieldIndex) => (
                              <Grid item xs={12} sm={6} md={4} key={fieldIndex}>
                                <Card variant="outlined">
                                  <CardHeader
                                    title={field.label}
                                    subheader={`Campo: ${field.field_name}`}
                                    titleTypographyProps={{ variant: 'subtitle2' }}
                                    subheaderTypographyProps={{ variant: 'caption' }}
                                  />
                                  <CardContent>
                                    <Box sx={{ mb: 1 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        Tipo:
                                      </Typography>
                                      <Typography variant="body2">
                                        {getFieldTypeLabel(field.type)}
                                      </Typography>
                                    </Box>
                                    
                                    {field.value && (
                                      <Box sx={{ mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                          Valore Default:
                                        </Typography>
                                        <Typography variant="body2">
                                          {field.type === 'checkbox' 
                                            ? (field.value === '1' ? 'Sì' : 'No') 
                                            : field.value}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {field.type === 'listbox' && field.options && field.options.length > 0 && (
                                      <Box>
                                        <Typography variant="caption" color="text.secondary">
                                          Opzioni:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                          {field.options.map((option, optIndex) => (
                                            <Chip key={optIndex} label={option} size="small" />
                                          ))}
                                        </Box>
                                      </Box>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
};

// Helper functions
const getPriorityLabel = (priority) => {
  const priorities = {
    'low': 'Bassa',
    'medium': 'Media',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  
  return priorities[priority] || priority;
};

const getPriorityColor = (priority) => {
  const colors = {
    'low': 'info',
    'medium': 'primary',
    'high': 'warning',
    'urgent': 'error'
  };
  
  return colors[priority] || 'default';
};

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

export default TaskTemplateViewer;