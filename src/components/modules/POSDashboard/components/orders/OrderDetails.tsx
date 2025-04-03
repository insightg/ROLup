import React, { useState, useEffect } from 'react';
import { fetchStatiAvanzamento, updateTaskState, saveOrderState } from '../../api/posApi';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  TextField,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import { 
  CalendarToday as Calendar,
  Person as User,
  KeyboardArrowDown as ChevronDown,
  KeyboardArrowRight as ChevronRight,
  FileCopy as Clipboard,
  Edit as Pencil,
  Check,
  Close as X
} from '@mui/icons-material';
import { Package } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { CustomFields } from '../form/CustomFields';
import type { Order, Task, Subtask } from '../../types/dashboard';

// Styled component per la scrollbar personalizzata
const CustomScrollContainer = React.memo(({ children }: { children: React.ReactNode }) => (
  <Box sx={{ 
    flex: 1, 
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    position: 'relative',
    '&::-webkit-scrollbar': {
      width: '10px',
      backgroundColor: 'transparent',
      display: 'block',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: (theme) => theme.palette.grey[100],
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: (theme) => theme.palette.grey[400],
      borderRadius: '4px',
      minHeight: '40px',
      '&:hover': {
        backgroundColor: (theme) => theme.palette.grey[600],
      },
    },
    // Stile per Firefox
    scrollbarWidth: 'thin',
    scrollbarColor: (theme) => `${theme.palette.grey[400]} ${theme.palette.grey[100]}`,
  }}>
    {children}
  </Box>
));

CustomScrollContainer.displayName = 'CustomScrollContainer';

// Interfaccia per lo stato proveniente dal database
interface StateOption {
  id: number;
  codice: string;
  descrizione: string;
  tipo: 'order' | 'task' | 'subtask';
  ordine: number;
  colore: string | null;
  icona: string | null;
  attivo: boolean;
}

// API Functions
// Funzione per recuperare gli stati disponibili dal database
const fetchAvailableStates = async (
  type: 'order' | 'task' | 'subtask'
): Promise<StateOption[]> => {
  try {
    const result = await fetchStatiAvanzamento();
    
    if (result.success && Array.isArray(result.data)) {
      // Filtra gli stati per il tipo richiesto e attivi
      return result.data.filter((s: StateOption) => s.tipo === type && s.attivo);
    } else {
      console.error("Formato dati non valido:", result);
      return [];
    }
  } catch (error) {
    console.error("Errore nel recupero degli stati:", error);
    return [];
  }
};

// Funzione per aggiornare lo stato di un subtask
const updateSubtaskState = async (
  orderId: string,
  taskTitle: string,
  subtaskTitle: string,
  updates: Record<string, unknown>
): Promise<void> => {
  const result = await updateTaskState({
    order_id: orderId,
    task_id: taskTitle, // Usando lo stesso nome dei parametri
    subtask_id: subtaskTitle,
    new_state: updates.new_state as string
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update task state');
  }
};

// Funzione per aggiornare lo stato dell'ordine
const updateOrderState = async (
  orderId: string,
  newState: string
): Promise<void> => {
  const result = await saveOrderState({
    order_id: parseInt(orderId),
    status: newState
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update order state');
  }
};

// Helper function to determine order state based on task states
const determineOrderState = (tasks: Task[], availableStates: StateOption[]): string => {
  const allStates = tasks.map(task => task.stato);
  
  // Se tutti i task sono completati, l'ordine è completato
  if (allStates.every(state => state === 'completato')) {
    const completedState = availableStates.find(s => s.codice === 'completato');
    return completedState ? completedState.codice : 'completato';
  }
  
  // Se almeno un task è in lavorazione, l'ordine è in lavorazione
  if (allStates.some(state => state === 'in_lavorazione')) {
    const inProgressState = availableStates.find(s => s.codice === 'in_lavorazione');
    return inProgressState ? inProgressState.codice : 'in_lavorazione';
  }
  
  // Se almeno un task è assegnato, l'ordine è assegnato
  if (allStates.some(state => state === 'assegnato')) {
    const assignedState = availableStates.find(s => s.codice === 'assegnato');
    return assignedState ? assignedState.codice : 'assegnato';
  }
  
  // Se almeno un task è in attesa, l'ordine è in attesa
  if (allStates.some(state => state === 'in_attesa')) {
    const waitingState = availableStates.find(s => s.codice === 'in_attesa');
    return waitingState ? waitingState.codice : 'in_attesa';
  }
  
  // Altrimenti, lo stato predefinito è nuovo
  const newState = availableStates.find(s => s.codice === 'nuovo');
  return newState ? newState.codice : 'nuovo';
};

interface SubtaskPanelProps {
  subtask: Subtask;
  orderId: string;
  taskTitle: string;
  onSubtaskUpdated: (updatedSubtask: Subtask) => void;
}

const SubtaskPanel: React.FC<SubtaskPanelProps> = ({ 
  subtask, 
  orderId, 
  taskTitle,
  onSubtaskUpdated
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableSubtask, setEditableSubtask] = useState<Subtask>(subtask);
  const [isUpdating, setIsUpdating] = useState(false);
  const [availableStates, setAvailableStates] = useState<StateOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);

  // Carica gli stati disponibili dal database quando il componente viene montato o passa in modalità editing
  useEffect(() => {
    if (isEditing) {
      const loadStates = async () => {
        setLoadingStates(true);
        try {
          const states = await fetchAvailableStates('subtask');
          setAvailableStates(states);
        } catch (error) {
          console.error('Error loading states:', error);
        } finally {
          setLoadingStates(false);
        }
      };
      
      loadStates();
    }
  }, [isEditing]);

  const handleStateChange = (event: SelectChangeEvent<string>) => {
    const newState = event.target.value;
    
    setEditableSubtask(prev => ({
      ...prev,
      stato: newState
    }));
  };

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      
      const updates: Record<string, any> = {
        stato: editableSubtask.stato,
        description: editableSubtask.description,
        exclude_from_completion: editableSubtask.exclude_from_completion ? '1' : '0',
      };

      if (editableSubtask.fields) {
        editableSubtask.fields.forEach(field => {
          updates[field.field_name] = field.value;
        });
      }

      await updateTaskState(orderId, taskTitle, subtask.title, updates);
      
      // Notifica il componente padre dell'aggiornamento
      onSubtaskUpdated({
        ...subtask,
        ...editableSubtask
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving subtask:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ bgcolor: 'grey.50' }}>
      <ListItemButton onClick={() => !isEditing && setIsExpanded(!isExpanded)}>
        <ListItemIcon>
          {!isEditing && (isExpanded ? <ChevronDown /> : <ChevronRight />)}
        </ListItemIcon>
        <ListItemText 
          primary={
            <Typography 
              variant="subtitle2" 
              sx={{ 
                textDecoration: editableSubtask.exclude_from_completion ? 'line-through' : 'none',
                color: editableSubtask.exclude_from_completion ? 'text.disabled' : 'text.primary'
              }}
            >
              {subtask.title}
            </Typography>
          }
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusBadge 
            status={editableSubtask.stato} 
            type="subtask"
            isIgnored={!!editableSubtask.exclude_from_completion} 
          />
          {!isEditing ? (
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setIsExpanded(true);
              }}
            >
              <Pencil fontSize="small" />
            </IconButton>
          ) : (
            <>
              <IconButton 
                size="small" 
                color="error" 
                onClick={() => {
                  setEditableSubtask(subtask);
                  setIsEditing(false);
                }}
                disabled={isUpdating}
              >
                <X />
              </IconButton>
              <IconButton 
                size="small" 
                color="success" 
                onClick={handleSave}
                disabled={isUpdating}
              >
                <Check />
              </IconButton>
            </>
          )}
        </Stack>
      </ListItemButton>

      <Collapse in={isExpanded || isEditing}>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={2}>
            {isEditing ? (
              <Stack spacing={2}>
                {/* Stato subtask */}
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel>Stato</InputLabel>
                  <Select
                    value={editableSubtask.stato}
                    onChange={handleStateChange}
                    label="Stato"
                    disabled={isUpdating || loadingStates}
                    startAdornment={
                      loadingStates ? (
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={20} />
                        </Box>
                      ) : null
                    }
                  >
                    {availableStates.map(state => (
                      <MenuItem key={state.id} value={state.codice}>
                        <StatusBadge status={state.codice} type="subtask" />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Descrizione"
                  value={editableSubtask.description || ''}
                  onChange={(e) => setEditableSubtask(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  disabled={isUpdating}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!editableSubtask.exclude_from_completion}
                      onChange={(e) => setEditableSubtask(prev => ({
                        ...prev,
                        exclude_from_completion: e.target.checked
                      }))}
                      disabled={isUpdating}
                    />
                  }
                  label="Escludi questo subtask dal calcolo di completamento del task"
                />

                {editableSubtask.fields && (
                  <CustomFields 
                    fields={editableSubtask.fields}
                    onChange={(fields) => setEditableSubtask(prev => ({
                      ...prev,
                      fields
                    }))}
                    readOnly={isUpdating}
                  />
                )}
              </Stack>
            ) : (
              <Stack spacing={2}>
                {subtask.description && (
                  <Box>
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
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, bgcolor: 'warning.light' }}
                  >
                    <Typography variant="body2">
                      ⚠️ Questo subtask è escluso dal calcolo di completamento
                    </Typography>
                  </Paper>
                )}

                {subtask.fields && (
                  <CustomFields 
                    fields={subtask.fields}
                    readOnly={true}
                  />
                )}
              </Stack>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
};

interface TaskPanelProps {
  task: Task;
  orderId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ 
  task, 
  orderId,
  isExpanded, 
  onToggleExpand,
  onTaskUpdated
}) => {
  // Funzione che gestisce l'aggiornamento di un subtask
  const handleSubtaskUpdated = (updatedSubtask: Subtask) => {
    // Aggiorna l'elenco dei subtask con il subtask modificato
    const updatedSubtasks = task.subtasks.map(subtask => 
      subtask.id === updatedSubtask.id ? updatedSubtask : subtask
    );
    
    // Calcola il nuovo stato del task in base agli stati dei subtask
    const activeSubtasks = updatedSubtasks.filter(s => !s.exclude_from_completion);
    const completedCount = activeSubtasks.filter(s => s.stato === 'completato').length;
    const inProgressCount = activeSubtasks.filter(s => s.stato === 'in_lavorazione').length;
    const totalCount = activeSubtasks.length;
    
    let newTaskState = task.stato;
    let newProgress = task.progress;
    
    // Aggiorna lo stato del task in base agli stati dei subtask
    if (totalCount > 0) {
      // Calcola la percentuale di completamento
      newProgress = Math.round((completedCount / totalCount) * 100);
      
      // Determina il nuovo stato
      if (completedCount === totalCount) {
        newTaskState = 'completato';
      } else if (inProgressCount > 0) {
        newTaskState = 'in_lavorazione';
      } else if (completedCount > 0) {
        newTaskState = 'in_lavorazione';
      }
    }
    
    // Crea una versione aggiornata del task
    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      stato: newTaskState,
      progress: newProgress
    };
    
    // Notifica il componente padre dell'aggiornamento del task
    onTaskUpdated(updatedTask);
  };

  return (
    <Paper elevation={2}>
      <ListItemButton onClick={onToggleExpand}>
        <ListItemIcon>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </ListItemIcon>
        <ListItemText primary={task.title} />
        <Stack direction="row" spacing={2} alignItems="center">
          <ProgressBar progress={task.progress} />
          <StatusBadge status={task.stato} type="task" />
          <Typography variant="caption" color="text.secondary">
            {task.subtasks.length} {task.subtasks.length === 1 ? 'subtask' : 'subtasks'}
          </Typography>
        </Stack>
      </ListItemButton>

      <Collapse in={isExpanded}>
        {task.subtasks.length > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack spacing={2}>
              {task.subtasks.map((subtask) => (
                <SubtaskPanel 
                  key={subtask.id}
                  subtask={subtask}
                  orderId={orderId}
                  taskTitle={task.title}
                  onSubtaskUpdated={handleSubtaskUpdated}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};

const EmptyTasksPlaceholder: React.FC = () => (
  <Box sx={{ textAlign: 'center', py: 8 }}>
    <Clipboard sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
    <Typography variant="h6" gutterBottom>
      Nessun task disponibile
    </Typography>
    <Typography color="text.secondary">
      Questo ordine non ha task associati
    </Typography>
  </Box>
);

interface OrderDetailsProps {
  selectedOrder: {
    order: Order;
    posName: string;
  } | null;
  expandedTaskIds: Record<string, boolean>;
  onTaskToggle: (taskId: string) => void;
  onOrderUpdated?: (orderId: string) => void;
  isLoading?: boolean;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({
  selectedOrder,
  expandedTaskIds,
  onTaskToggle,
  onOrderUpdated,
  isLoading = false
}) => {
  const [localOrder, setLocalOrder] = useState<Order | null>(selectedOrder?.order || null);
  const [orderStates, setOrderStates] = useState<StateOption[]>([]);

  // Carica gli stati disponibili per gli ordini quando il componente viene montato
  useEffect(() => {
    const loadOrderStates = async () => {
      try {
        const states = await fetchAvailableStates('order');
        setOrderStates(states);
      } catch (error) {
        console.error('Error loading order states:', error);
      }
    };
    
    loadOrderStates();
  }, []);

  // Aggiorna lo stato locale quando cambia l'ordine selezionato
  useEffect(() => {
    if (selectedOrder?.order) {
      setLocalOrder(selectedOrder.order);
    } else {
      setLocalOrder(null);
    }
  }, [selectedOrder]);

  // Gestisce l'aggiornamento di un task
  const handleTaskUpdated = async (updatedTask: Task) => {
    if (!localOrder) return;
    
    // Aggiorna i task con il task modificato
    const updatedTasks = localOrder.tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    
    // Determina il nuovo stato dell'ordine in base agli stati dei task
    const newOrderState = determineOrderState(updatedTasks, orderStates);
    
    // Calcola il nuovo progresso dell'ordine
    const totalProgress = updatedTasks.reduce((sum, task) => sum + task.progress, 0);
    const newOrderProgress = updatedTasks.length > 0 
      ? Math.round(totalProgress / updatedTasks.length) 
      : 0;
    
    // Crea una versione aggiornata dell'ordine
    const updatedOrder: Order = {
      ...localOrder,
      tasks: updatedTasks,
      stato: newOrderState,
      progress: newOrderProgress
    };
    
    // Aggiorna lo stato locale
    setLocalOrder(updatedOrder);
    
    // Aggiorna lo stato dell'ordine sul server solo se è cambiato
    if (localOrder.stato !== newOrderState) {
      try {
        await updateOrderState(localOrder.id, newOrderState);
        
        // Notifica il componente padre dell'aggiornamento dell'ordine
        if (onOrderUpdated) {
          onOrderUpdated(localOrder.id);
        }
      } catch (error) {
        console.error('Failed to update order state:', error);
      }
    }
  };

  if (!selectedOrder || !localOrder) {
    return (
      <Box 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Package size={48} />
          <Typography variant="h6">
            Seleziona un ordine
          </Typography>
          <Typography color="text.secondary">
            Seleziona un ordine dalla lista a sinistra per visualizzare i dettagli
          </Typography>
        </Stack>
      </Box>
    );
  }

  const { posName } = selectedOrder;

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header con dettagli dell'ordine - Altezza fissa */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider', 
        flexShrink: 0,
        zIndex: 1,
        bgcolor: 'background.paper'
      }}>
        <Typography variant="caption" color="text.secondary">
          {posName}
        </Typography>
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center"
          spacing={2}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">
              {localOrder.title}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Calendar fontSize="small" />
              <Typography variant="body2">
                {localOrder.data_creazione || 'No date'}
              </Typography>
            </Stack>
            {localOrder.pm_full_name && (
              <Chip
                icon={<User />}
                label={`PM: ${localOrder.pm_full_name}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {localOrder.tipo_attivita_desc && (
              <Typography variant="body2" color="text.secondary">
                {localOrder.tipo_attivita_desc}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <ProgressBar progress={localOrder.progress} />
            <StatusBadge status={localOrder.stato} type="order" />
          </Stack>
        </Stack>
      </Box>

      {/* Area di contenuto scrollabile - Usa il componente CustomScrollContainer */}
      <CustomScrollContainer>
        <Box sx={{ p: 2 }}>
          {isLoading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((index) => (
                <Paper key={index} elevation={2} sx={{ p: 2 }}>
                  <Box sx={{ width: '100%', height: 60 }} />
                </Paper>
              ))}
            </Stack>
          ) : localOrder.tasks.length > 0 ? (
            <Stack spacing={2}>
              {localOrder.tasks.map((task) => (
                <TaskPanel 
                  key={task.id}
                  task={task}
                  orderId={localOrder.id}
                  isExpanded={!!expandedTaskIds[task.id]}
                  onToggleExpand={() => onTaskToggle(task.id)}
                  onTaskUpdated={handleTaskUpdated}
                />
              ))}
            </Stack>
          ) : (
            <EmptyTasksPlaceholder />
          )}
        </Box>
      </CustomScrollContainer>
    </Box>
  );
};
