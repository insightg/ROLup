// src/components/modules/DashboardPM/components/OrderDetailPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchTasksForOrder, updateTaskState, fetchStatiAvanzamento } from '../api/pmApi';
import {
  Box,
  Paper,
  Typography,
  Drawer,
  IconButton,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Chip,
  Badge,
  Tooltip,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Close as CloseIcon,
  KeyboardArrowDown as ChevronDown,
  KeyboardArrowRight as ChevronRight,
  Assignment as TaskIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { Package } from 'lucide-react';

/**
 * Componente de detalle ordine ispirato a OrderDetails del POSDashboard
 */
const OrderDetailPanel = ({ posOrderId, onClose, onUpdate }) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState({});
  
  // States for edit functionality
  const [selectedSubtask, setSelectedSubtask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    stato: '',
    description: '',
    exclude_from_completion: false,
    fields: []
  });
  const [availableStates, setAvailableStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  
  // Carica i dettagli dell'ordine
  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!posOrderId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await fetchTasksForOrder(posOrderId);
        
        if (result.success) {
          setOrder(result.data);
          
          // Espandi il primo task automaticamente
          if (result.data?.tasks?.length > 0) {
            setExpandedTaskIds({ [result.data.tasks[0].id]: true });
          }
        } else {
          throw new Error(result.error || 'Errore nel caricamento dei dettagli dell\'ordine');
        }
      } catch (error) {
        console.error('Error loading order details:', error);
        setError('Errore nella comunicazione con il server');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrderDetails();
  }, [posOrderId]);
  
  // Load available states
  const loadAvailableStates = useCallback(async () => {
    try {
      setLoadingStates(true);
      const response = await fetch('/backend/b_tsis.php?action=getStatiAvanzamento', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        // Filter for subtask states
        const subtaskStates = result.data.filter(s => s.tipo === 'subtask' && s.attivo);
        setAvailableStates(subtaskStates);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Error loading states:', error);
    } finally {
      setLoadingStates(false);
    }
  }, []);
  
  // Gestione espansione/compressione task
  const handleToggleTask = useCallback((taskId) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  }, []);

  // Aggiorna lo stato di un subtask
  const handleUpdateSubtask = async (taskId, subtaskId, newState) => {
    if (!order) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/backend/b_tsis.php?action=updateTaskState', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          order_id: posOrderId,
          task_title: findTaskById(taskId)?.title || '',
          subtask_title: findSubtaskById(taskId, subtaskId)?.title || '',
          stato: newState
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      
      if (result.success) {
        // Aggiorna lo stato locale dell'ordine
        setOrder(prev => {
          if (!prev) return prev;
          
          const updatedTasks = prev.tasks.map(task => {
            if (task.id === taskId) {
              const updatedSubtasks = task.subtasks.map(subtask => {
                if (subtask.id === subtaskId) {
                  return { ...subtask, stato: newState };
                }
                return subtask;
              });
              
              // Usa i valori restituiti dall'API per progress e stato del task
              return {
                ...task,
                subtasks: updatedSubtasks,
                progress: result.data.task_progress || task.progress,
                stato: result.data.task_status || task.stato
              };
            }
            return task;
          });
          
          return {
            ...prev,
            tasks: updatedTasks,
            progress: result.data.order_progress || prev.progress,
            stato: result.data.order_status || prev.stato
          };
        });
        
        // Notifica il componente padre
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(result.error || 'Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      setError('Errore nell\'aggiornamento dello stato');
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit dialog for a subtask
  const handleEditSubtask = (taskId, subtaskId) => {
    const task = findTaskById(taskId);
    const subtask = findSubtaskById(taskId, subtaskId);
    
    if (!task || !subtask) return;
    
    setSelectedSubtask({
      taskId,
      subtaskId,
      taskTitle: task.title,
      subtaskTitle: subtask.title
    });
    
    setEditFormData({
      stato: subtask.stato || '',
      description: subtask.description || '',
      exclude_from_completion: !!subtask.exclude_from_completion,
      fields: subtask.fields || []
    });
    
    // Load available states if needed
    if (availableStates.length === 0) {
      loadAvailableStates();
    }
    
    setEditDialogOpen(true);
  };

  // Close edit dialog
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedSubtask(null);
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle field value changes
  const handleFieldChange = (index, value) => {
    setEditFormData(prev => {
      const updatedFields = [...prev.fields];
      updatedFields[index] = {
        ...updatedFields[index],
        value: value
      };
      return {
        ...prev,
        fields: updatedFields
      };
    });
  };

  // Save subtask changes
  const handleSaveSubtask = async () => {
    if (!selectedSubtask) return;
    
    try {
      setIsLoading(true);
      
      const params = {
        order_id: posOrderId,
        task_title: selectedSubtask.taskTitle,
        subtask_title: selectedSubtask.subtaskTitle,
        stato: editFormData.stato,
        description: editFormData.description,
        exclude_from_completion: editFormData.exclude_from_completion ? '1' : '0'
      };
      
      // Add field values
      editFormData.fields.forEach((field, index) => {
        params[field.field_name] = field.value;
      });
      
      const response = await fetch('/backend/b_tsis.php?action=updateTaskState', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(params)
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update order with result data
        setOrder(prev => {
          if (!prev) return prev;
          
          const updatedTasks = prev.tasks.map(task => {
            if (task.id === selectedSubtask.taskId) {
              const updatedSubtasks = task.subtasks.map(subtask => {
                if (subtask.id === selectedSubtask.subtaskId) {
                  return { 
                    ...subtask, 
                    stato: editFormData.stato,
                    description: editFormData.description,
                    exclude_from_completion: editFormData.exclude_from_completion,
                    fields: editFormData.fields
                  };
                }
                return subtask;
              });
              
              return {
                ...task,
                subtasks: updatedSubtasks,
                progress: result.data.task_progress || task.progress,
                stato: result.data.task_status || task.stato
              };
            }
            return task;
          });
          
          return {
            ...prev,
            tasks: updatedTasks,
            progress: result.data.order_progress || prev.progress,
            stato: result.data.order_status || prev.stato
          };
        });
        
        // Close dialog and notify parent
        handleCloseEditDialog();
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(result.error || 'Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      setError('Errore nell\'aggiornamento dello stato');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to find task by ID
  const findTaskById = (taskId) => {
    if (!order || !order.tasks) return null;
    return order.tasks.find(task => task.id === taskId);
  };

  // Helper to find subtask by ID
  const findSubtaskById = (taskId, subtaskId) => {
    const task = findTaskById(taskId);
    if (!task || !task.subtasks) return null;
    return task.subtasks.find(subtask => subtask.id === subtaskId);
  };

  // Componente per il pannello del subtask
  const SubtaskPanel = ({ subtask, taskId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <Paper variant="outlined" sx={{ mb: 1 }}>
        <ListItem 
          button 
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{
            borderLeft: subtask.exclude_from_completion ? '4px solid #f44336' : 'none',
            backgroundColor: subtask.exclude_from_completion ? 'rgba(244, 67, 54, 0.08)' : 'inherit'
          }}
        >
          <ListItemIcon>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </ListItemIcon>
          <ListItemText 
            primary={
              <Typography 
                variant="body2" 
                sx={{ 
                  textDecoration: subtask.exclude_from_completion ? 'line-through' : 'none',
                  color: subtask.exclude_from_completion ? 'text.disabled' : 'text.primary'
                }}
              >
                {subtask.title}
              </Typography>
            }
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={getStatusLabel(subtask.stato)} 
              color={getStatusColor(subtask.stato)}
              size="small" 
              variant="outlined"
            />
            
            {/* Button for edit */}
            <Tooltip title="Modifica subtask">
              <IconButton 
                size="small" 
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditSubtask(taskId, subtask.id);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {/* Quick action buttons */}
            {!subtask.exclude_from_completion && (
              <Box sx={{ display: 'flex' }}>
                {subtask.stato !== 'completato' && (
                  <Tooltip title="Segna come completato">
                    <IconButton 
                      size="small" 
                      color="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateSubtask(taskId, subtask.id, 'completato');
                      }}
                    >
                      <CompletedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                {subtask.stato === 'completato' && (
                  <Tooltip title="Riapri">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateSubtask(taskId, subtask.id, 'in_lavorazione');
                      }}
                    >
                      <PendingIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        </ListItem>
        
        <Collapse in={isExpanded}>
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            {/* Dettagli subtask */}
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
            
            {subtask.exclude_from_completion && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Questo subtask è escluso dal calcolo di completamento
              </Alert>
            )}
            
            {/* Campi personalizzati */}
            {subtask.fields && subtask.fields.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Campi personalizzati
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {subtask.fields.map((field, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      {field.label}:
                    </Typography>
                    
                    {field.type === 'checkbox' ? (
                      <Typography variant="body2">
                        {field.value === '1' ? 'Sì' : 'No'}
                      </Typography>
                    ) : (
                      <Typography variant="body2">
                        {field.value || '-'}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    );
  };

  // Componente per il pannello del task
const TaskPanel = ({ task }) => {
  const isExpanded = !!expandedTaskIds[task.id];
  
  return (
    <Paper elevation={2} sx={{ mb: 2 }}>
      <ListItem button onClick={() => handleToggleTask(task.id)}>
        <ListItemIcon>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </ListItemIcon>
        <ListItemText 
          primary={task.title}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 100, mr: 1 }}>
              <LinearProgress variant="determinate" value={task.progress || 0} sx={{ height: 10, borderRadius: 5 }} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {task.progress || 0}%
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={getStatusLabel(task.stato)} 
            color={getStatusColor(task.stato)}
            size="small" 
            variant="outlined"
          />
        </Box>
      </ListItem>
      
      <Collapse in={isExpanded}>
        <Box sx={{ p: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {task.subtasks && task.subtasks.length > 0 ? (
            task.subtasks.map(subtask => (
              <SubtaskPanel 
                key={subtask.id} 
                subtask={subtask} 
                taskId={task.id} 
              />
            ))
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              Nessun subtask disponibile
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

  // Helper function to get status label
  const getStatusLabel = (status) => {
    const statusMap = {
      'nuovo': 'Nuovo',
      'assegnato': 'Assegnato',
      'in_lavorazione': 'In Lavorazione',
      'in_attesa': 'In Attesa',
      'completato': 'Completato',
      'standby': 'In Standby',
      'bloccato': 'Bloccato'
    };
    
    return statusMap[status] || status;
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    const colorMap = {
      'nuovo': 'default',
      'assegnato': 'primary',
      'in_lavorazione': 'info',
      'in_attesa': 'warning',
      'completato': 'success',
      'standby': 'warning',
      'bloccato': 'error'
    };
    
    return colorMap[status] || 'default';
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={Boolean(posOrderId)}
        onClose={onClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 600, md: 800 }, overflow: 'hidden' }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}

{/* Header */}
<Box sx={{ 
  p: 2, 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center',
  borderBottom: '1px solid',
  borderColor: 'divider'
}}>
  {order ? (
    <Box sx={{ mb: 1 }}>
      {/* Riga 1: AREA : TERRITORIO : POS (più piccola) */}
      <Typography variant="body2" color="text.secondary">
        {order.sf_region ? 
          `${order.sf_region || ''} : ${order.sf_territory || ''} : ${order.pos_name || ''}` 
          : 
          `${order.pos_name || ''}`
        }
      </Typography>
      
      {/* Riga 2: Numero ORDINE del DATA (più grande) */}
      <Typography variant="h6" sx={{ fontWeight: 'bold', my: 0.5 }}>
        Ordine {order.id} del {order.data_creazione ? new Date(order.data_creazione).toLocaleDateString() : ''}
      </Typography>
      
      {/* Riga 3: TIPOLOGIA ORDINE (più piccola) */}
      <Typography variant="body2" color="text.secondary">
        {order.tipo_attivita_desc || 'Nessuna tipologia specificata'}
      </Typography>
      
      {/* Riga 4: NOME PM (più piccola) */}
      <Typography variant="body2" color="text.secondary">
        PM: {order.pm_full_name || 'Non assegnato'}
      </Typography>
    </Box>
  ) : (
    <Typography variant="h6">
      Dettaglio Ordine
    </Typography>
  )}
  
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {order && (
      <>
        <Chip 
          label={getStatusLabel(order.stato)}
          color={getStatusColor(order.stato)}
          size="small"
        />
        <Button 
          startIcon={<RefreshIcon />}
          size="small"
          onClick={() => {
            if (onUpdate) onUpdate();
          }}
        >
          Aggiorna
        </Button>
      </>
    )}
    <IconButton onClick={onClose}>
      <CloseIcon />
    </IconButton>
  </Box>
</Box>
          
          {/* Contenuto */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : !order ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Package size={48} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Nessun dettaglio disponibile
                </Typography>
              </Box>
            ) : (
              <>
                {/* Progress bar dell'ordine */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Avanzamento Ordine
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={order.progress || 0} 
                        sx={{ height: 10, borderRadius: 5 }} 
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {order.progress || 0}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Task */}
                <Typography variant="subtitle1" gutterBottom>
                  Task ({order.tasks?.length || 0})
                </Typography>
                
                {order.tasks && order.tasks.length > 0 ? (
                  order.tasks.map(task => (
                    <TaskPanel key={task.id} task={task} />
                  ))
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      Nessun task disponibile per questo ordine
                    </Typography>
                  </Paper>
                )}
              </>
            )}
          </Box>
        </Box>
      </Drawer>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Modifica Subtask
        </DialogTitle>
        <DialogContent dividers>
          {/* Form fields */}
          <Box sx={{ mt: 1 }}>
            {/* Stato */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Stato</InputLabel>
              <Select
                name="stato"
                value={editFormData.stato}
                onChange={handleFormChange}
                label="Stato"
                disabled={loadingStates}
              >
                {loadingStates ? (
                  <MenuItem disabled>Caricamento stati...</MenuItem>
                ) : (
                  availableStates.map(state => (
                    <MenuItem key={state.id} value={state.codice}>
                      {state.descrizione}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            
            {/* Description */}
            <TextField
              name="description"
              label="Descrizione"
              value={editFormData.description}
              onChange={handleFormChange}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />
            
            {/* Exclude from completion */}
            <FormControlLabel
              control={
                <Checkbox
                  name="exclude_from_completion"
                  checked={editFormData.exclude_from_completion}
                  onChange={handleFormChange}
                  color="primary"
                />
              }
              label="Escludi dal calcolo di completamento"
              sx={{ mt: 1, mb: 2 }}
            />
            
            {/* Custom fields */}
            {editFormData.fields && editFormData.fields.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Campi personalizzati
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {editFormData.fields.map((field, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    {field.type === 'checkbox' ? (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.value === '1'}
                            onChange={(e) => handleFieldChange(index, e.target.checked ? '1' : '0')}
                            color="primary"
                          />
                        }
                        label={field.label}
                      />
                    ) : field.type === 'listbox' ? (
                      <FormControl fullWidth margin="normal">
                        <InputLabel>{field.label}</InputLabel>
                        <Select
                          value={field.value || ''}
                          onChange={(e) => handleFieldChange(index, e.target.value)}
                          label={field.label}
                        >
                          {(field.options || []).map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        label={field.label}
                        value={field.value || ''}
                        onChange={(e) => handleFieldChange(index, e.target.value)}
                        fullWidth
                        margin="normal"
                        type={field.type === 'date' ? 'date' : 'text'}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Annulla</Button>
          <Button 
            onClick={handleSaveSubtask} 
            variant="contained" 
            color="primary" 
            startIcon={<SaveIcon />}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OrderDetailPanel;