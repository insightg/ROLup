import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Divider,
  Chip,
  CircularProgress,
  LinearProgress,
  Drawer
} from '@mui/material';
import {
  Close as CloseIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowRight as CollapseIcon,
  CheckCircle as CompletedIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchTasksForOrder, updateTaskState } from '../api/pmApi';

const TasksPanel = ({ posOrderId, onClose, onUpdate }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [error, setError] = useState(null);

  // Carica le attività per l'ordine al montaggio del componente
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetchTasksForOrder(posOrderId);
        
        if (response.success) {
          setTasks(response.data.tasks || []);
          
          // Espandi il primo task automaticamente se ce n'è almeno uno
          if (response.data.tasks?.length > 0) {
            setExpandedTasks({ [response.data.tasks[0].id]: true });
          }
        } else {
          setError(response.error || 'Errore nel caricamento delle attività');
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        setError('Errore nella comunicazione con il server');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTasks();
  }, [posOrderId]);

  // Gestione espansione/compressione task
  const handleToggleTask = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Aggiorna lo stato di un subtask
  const handleUpdateSubtask = async (taskId, subtaskId, newState) => {
    try {
      setIsLoading(true);
      
      const response = await updateTaskState(posOrderId, taskId, subtaskId, newState);
      
      if (response.success) {
        // Aggiorna i task localmente
        const updatedTasks = tasks.map(task => {
          if (task.id === taskId) {
            const updatedSubtasks = task.subtasks.map(subtask => {
              if (subtask.id === subtaskId) {
                return { ...subtask, stato: newState };
              }
              return subtask;
            });
            
            // Calcola il nuovo progresso del task
            const activeSubtasks = updatedSubtasks.filter(st => !st.exclude_from_completion);
            const completedCount = activeSubtasks.filter(st => st.stato === 'completato').length;
            const totalCount = activeSubtasks.length;
            const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            // Determina il nuovo stato del task
            let newTaskState = task.stato;
            if (totalCount > 0) {
              if (completedCount === totalCount) {
                newTaskState = 'completato';
              } else if (completedCount > 0) {
                newTaskState = 'in_lavorazione';
              }
            }
            
            return {
              ...task,
              subtasks: updatedSubtasks,
              progress: newProgress,
              stato: newTaskState
            };
          }
          return task;
        });
        
        setTasks(updatedTasks);
        
        // Aggiorna la vista genitore
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setError(response.error || 'Errore nell\'aggiornamento dello stato');
      }
    } catch (error) {
      console.error('Error updating subtask state:', error);
      setError('Errore nella comunicazione con il server');
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per formattare lo stato di un task/subtask
  const formatStatus = (status) => {
    const statusConfig = {
      'completato': { label: 'Completato', color: 'success', icon: <CompletedIcon /> },
      'in_lavorazione': { label: 'In Lavorazione', color: 'primary', icon: <PendingIcon /> },
      'pending': { label: 'In Attesa', color: 'warning', icon: <PendingIcon /> },
      'blocked': { label: 'Bloccato', color: 'error', icon: <ErrorIcon /> }
    };
    
    const config = statusConfig[status] || { label: status, color: 'default', icon: <PendingIcon /> };
    
    return (
      <Chip 
        icon={config.icon}
        label={config.label} 
        color={config.color} 
        size="small" 
        variant="outlined"
      />
    );
  };

  return (
    <Drawer
      anchor="right"
      open={true}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 450 }, overflow: 'hidden' }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header del pannello */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="h6">Attività</Typography>
          <Box>
            <IconButton onClick={() => setIsLoading(true)} disabled={isLoading} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Contenuto del pannello */}
        <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexDirection: 'column',
              p: 4 
            }}>
              <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Typography color="error">{error}</Typography>
            </Box>
          ) : tasks.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexDirection: 'column',
              p: 4 
            }}>
              <Typography>Nessuna attività disponibile</Typography>
            </Box>
          ) : (
            <Box>
              {tasks.map(task => (
                <Paper key={task.id} elevation={1} sx={{ mb: 2, overflow: 'hidden' }}>
                  {/* Header del task */}
                  <Box 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      bgcolor: 'action.hover',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleToggleTask(task.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {expandedTasks[task.id] ? <ExpandIcon /> : <CollapseIcon />}
                      <Typography variant="subtitle1">{task.title}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {formatStatus(task.stato)}
                    </Box>
                  </Box>
                  
                  {/* Progress bar */}
                  <LinearProgress 
                    variant="determinate" 
                    value={task.progress} 
                    sx={{ height: 4 }}
                  />
                  
                  {/* Subtasks */}
                  <Collapse in={expandedTasks[task.id]}>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Sottoattività ({task.subtasks.length})
                      </Typography>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      {task.subtasks.map(subtask => (
                        <Box 
                          key={subtask.id} 
                          sx={{ 
                            p: 1.5, 
                            mb: 1, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: subtask.exclude_from_completion ? 0.6 : 1
                          }}
                        >
                          <Typography 
                            variant="body2"
                            sx={{
                              textDecoration: subtask.exclude_from_completion ? 'line-through' : 'none'
                            }}
                          >
                            {subtask.title}
                          </Typography>
                          
                          <Box display="flex" gap={1} alignItems="center">
                            {formatStatus(subtask.stato)}
                            
                            {/* Menu per cambio stato */}
                            {!subtask.exclude_from_completion && (
                              <Box sx={{ display: 'flex' }}>
                                {subtask.stato !== 'completato' && (
                                  <IconButton 
                                    size="small" 
                                    color="success"
                                    onClick={() => handleUpdateSubtask(task.id, subtask.id, 'completato')}
                                  >
                                    <CompletedIcon fontSize="small" />
                                  </IconButton>
                                )}
                                
                                {subtask.stato === 'completato' && (
                                  <IconButton 
                                    size="small" 
                                    color="primary"
                                    onClick={() => handleUpdateSubtask(task.id, subtask.id, 'in_lavorazione')}
                                  >
                                    <PendingIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default TasksPanel;

