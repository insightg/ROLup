import React, { useState, useEffect } from 'react';
import { fetchStatiAvanzamento } from '../api/pmApi';
import { 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Collapse, 
  TextField, 
  InputAdornment,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
  Avatar,
  Tooltip,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Store as StoreIcon,
  Assignment as TasksIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  SupervisorAccount as ManagerIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { usePMStore } from '../stores/pmStore';
import TasksPanel from './TasksPanel';
import StatusPanel from './StatusPanel';
import DocumentsPanel from './DocumentsPanel';
import OrderDetailPanel from './OrderDetailPanel';

// Funzione di ordinamento stringa con supporto per valori nulli
const safeCompare = (a, b) => {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  return a.toString().localeCompare(b.toString());
};

// Formatter per le date in formato italiano
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  // Formato italiano: DD/MM/YYYY
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Funzione helper per verificare se un elemento ha ordini attivi (non completati)
const hasActiveOrders = (item) => {
  // Per i POS, controlla direttamente i suoi ordini
  if (item.children && Array.isArray(item.children)) {
    return item.children.some(order => order.stato !== 'completato');
  }
  return false;
};

// Iniziali per avatar da nome completo
const getInitials = (fullName) => {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const POSTree = ({ data, isManager = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Stato per i menu azioni
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Stato per i pannelli
  const [activePanelType, setActivePanelType] = useState(null);
  const [activePanelId, setActivePanelId] = useState(null);
  
  // Stato specifico per il pannello OrderDetail
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  const { refreshData } = usePMStore();
  const [availableStates, setAvailableStates] = useState([]);


// Carica gli stati disponibili all'avvio
useEffect(() => {
  const loadStatiAvanzamento = async () => {
    try {
      const result = await fetchStatiAvanzamento();
      
      if (result.success) {
        // Filtra solo gli stati per gli ordini
        const orderStates = result.data.filter(stato => 
          stato.tipo === 'ordine' && stato.attivo
        );
        setAvailableStates(orderStates);
      }
    } catch (error) {
      console.error('Error fetching stati avanzamento:', error);
    }
  };
  
  loadStatiAvanzamento();
}, []);


  // Organizza i dati per la visualizzazione ad albero
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Filtra i dati in base alla ricerca
      let filteredItems = [...data];
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredItems = data.filter(item => 
          (item.nome_account && item.nome_account.toLowerCase().includes(search)) ||
          (item.sf_region && item.sf_region.toLowerCase().includes(search)) ||
          (item.sf_district && item.sf_district.toLowerCase().includes(search)) ||
          (item.sf_territory && item.sf_territory.toLowerCase().includes(search)) ||
          (item.rrp_segment && item.rrp_segment.toLowerCase().includes(search)) ||
          (item.tipo_attivita_desc && item.tipo_attivita_desc.toLowerCase().includes(search)) ||
          (isManager && item.pm_full_name && item.pm_full_name.toLowerCase().includes(search))
        );
      }
      
      // Crea la struttura dell'albero raggruppando per regione e territorio
      const posMap = {};
      
      filteredItems.forEach(item => {
        // Utilizziamo campi strutturati come nel backend
        const region = item.sf_region || 'Senza Regione';
        const district = item.sf_district || 'Senza Distretto';
        const territory = item.sf_territory || 'Senza Territorio';
        
        // Creazione chiave univoca per il POS
        const posKey = item.nome_account || `pos_${item.id}`;
        
        // Verifica se esiste già la regione
        if (!posMap[region]) {
          posMap[region] = {
            id: `region_${region}`,
            name: region,
            children: {}
          };
        }
        
        // Verifica se esiste già il territorio nella regione
        if (!posMap[region].children[territory]) {
          posMap[region].children[territory] = {
            id: `territory_${region}_${territory}`,
            name: territory,
            children: {}
          };
        }
        
        // Aggiungi il POS al territorio
        if (!posMap[region].children[territory].children[posKey]) {
          posMap[region].children[territory].children[posKey] = {
            ...item,
            id: item.id,
            title: item.nome_account,
            children: []
          };
        }

        // Se l'elemento corrente rappresenta un ordine, aggiungiamolo al POS
        if (item.id) {
          // Trattiamo ogni elemento come un potenziale ordine
          const orderItem = {
            id: item.id,
            title: `#${item.id} - ${item.tipo_attivita_desc || 'Ordine'}`,
            stato: item.stato || 'nuovo',
            data_creazione: item.data_creazione,
            progress: item.progress || 0,
            tipo_attivita_id: item.tipo_attivita_id,
            tipo_attivita_desc: item.tipo_attivita_desc || 'Tipologia non specificata',
            tipo_attivita_codice: item.tipo_attivita_codice,
            pm_id: item.pm_id,
            pm_username: item.pm_username,
            pm_full_name: item.pm_full_name
          };
          
          // Aggiungiamo l'ordine alla collezione del POS
          posMap[region].children[territory].children[posKey].children.push(orderItem);
        }
      });
      
      // Conversione della mappa in array per il rendering
      let treeData = Object.values(posMap)
        .map(region => ({
          ...region,
          children: Object.values(region.children)
            .map(territory => ({
              ...territory,
              children: Object.values(territory.children)
                .map(pos => ({
                  ...pos,
                  // Filtra ordini duplicati basandosi sull'ID
                  children: pos.children.filter((order, index, self) => 
                    index === self.findIndex(o => o.id === order.id)
                  )
                }))
                .sort((a, b) => safeCompare(a.title, b.title))
            }))
            .sort((a, b) => safeCompare(a.name, b.name))
        }))
        .sort((a, b) => safeCompare(a.name, b.name));
      
      // Aggiunge lo stato attivo ai nodi che hanno ordini non completati
      treeData = treeData.map(region => {
        // Controlla se la regione ha territori con POS attivi
        const hasActiveTerritory = region.children.some(territory => 
          territory.children.some(pos => hasActiveOrders(pos))
        );
        
        // Aggiorna i territori
        const updatedTerritories = region.children.map(territory => {
          // Controlla se il territorio ha POS attivi
          const hasActivePOS = territory.children.some(pos => hasActiveOrders(pos));
          
          return {
            ...territory,
            hasActiveOrders: hasActivePOS,
            children: territory.children // mantieni i figli invariati
          };
        });
        
        return {
          ...region,
          hasActiveOrders: hasActiveTerritory,
          children: updatedTerritories
        };
      });

      setFilteredData(treeData);
    } catch (error) {
      console.error('Error organizing tree data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [data, searchTerm, isManager]);

  // Gestione espansione nodi
  const handleToggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Gestore menu azioni
  const handleActionClick = (event, row) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setSelectedRow(row);
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
  };
  
  // Gestori apertura pannelli
  const handleOpenPanel = (type, id) => {
    setActivePanelType(type);
    setActivePanelId(id);
    handleCloseActionMenu();
  };

  const handleClosePanel = () => {
    setActivePanelType(null);
    setActivePanelId(null);
  };
  
  // Funzione per aprire il pannello di dettaglio dell'ordine
  const handleOrderClick = (order, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    setSelectedOrderId(order.id);
    
    // Imposta l'ordine selezionato per un accesso più facile
    setSelectedRow(order);
    
    // Apri il pannello di dettaglio
    setActivePanelType('order-detail');
    setActivePanelId(order.id);
  };
  
  // Funzione per chiudere il pannello di dettaglio dell'ordine
  const handleCloseOrderDetail = () => {
    setSelectedOrderId(null);
    setActivePanelType(null);
    setActivePanelId(null);
  };

  // Formatta stato come badge
  const formatStatusBadge = (statusCode) => {
    const statusConfig = availableStates.find(s => s.codice === statusCode) || {
      descrizione: statusCode || 'Sconosciuto',
      colore: 'default'
    };
    
    // Mappa i colori a valori MUI
    const colorMap = {
      'blue': 'primary',
      'green': 'success',
      'red': 'error',
      'orange': 'warning',
      'cyan': 'info',
      'gray': 'default'
    };
    
    const color = colorMap[statusConfig.colore] || 'default';
    
    return (
      <Chip 
        label={statusConfig.descrizione} 
        color={color} 
        size="small" 
        variant="outlined"
        sx={{ 
          height: 20, 
          '& .MuiChip-label': { 
            px: 0.8, 
            py: 0.1, 
            fontSize: '0.65rem',
            whiteSpace: 'nowrap' 
          }
        }}
      />
    );
  };

  // Renderizza il nodo regione
  const renderRegionNode = (region) => {
    const isExpanded = !!expandedNodes[region.id];
    
    // Calcola il conteggio totale dei POS nella regione
    const totalPOS = region.children.reduce(
      (sum, territory) => sum + Object.keys(territory.children).length, 
      0
    );
    
    return (
      <Box key={region.id}>
        <ListItem 
          button 
          onClick={() => handleToggleNode(region.id)}
          sx={{ 
            bgcolor: isExpanded ? 'action.selected' : 'inherit',
            color: region.hasActiveOrders ? 'primary.main' : 'inherit' 
          }}
        >
          <ListItemIcon>
            {isExpanded ? 
             <ExpandMoreIcon color={region.hasActiveOrders ? 'primary' : 'inherit'} /> : 
             <ChevronRightIcon color={region.hasActiveOrders ? 'primary' : 'inherit'} />}
          </ListItemIcon>
          <ListItemText 
            primary={region.name}
            secondary={`${region.children.length} territori, ${totalPOS} POS`}
            primaryTypographyProps={{ 
              color: region.hasActiveOrders ? 'primary' : 'inherit',
              fontWeight: region.hasActiveOrders ? 'medium' : 'normal'
            }}
          />
        </ListItem>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {region.children.map(territory => renderTerritoryNode(territory))}
          </List>
        </Collapse>
      </Box>
    );
  };
  
  // Renderizza il nodo territorio
  const renderTerritoryNode = (territory) => {
    const isExpanded = !!expandedNodes[territory.id];
    const posCount = territory.children.length;
    
    return (
      <Box key={territory.id}>
        <ListItem 
          button 
          onClick={() => handleToggleNode(territory.id)}
          sx={{ 
            pl: 4, 
            bgcolor: isExpanded ? 'action.selected' : 'inherit',
            color: territory.hasActiveOrders ? 'primary.main' : 'inherit' 
          }}
        >
          <ListItemIcon>
            {isExpanded ? 
             <ExpandMoreIcon color={territory.hasActiveOrders ? 'primary' : 'inherit'} /> : 
             <ChevronRightIcon color={territory.hasActiveOrders ? 'primary' : 'inherit'} />}
          </ListItemIcon>
          <ListItemText 
            primary={territory.name}
            secondary={`${posCount} POS`}
            primaryTypographyProps={{ 
              color: territory.hasActiveOrders ? 'primary' : 'inherit',
              fontWeight: territory.hasActiveOrders ? 'medium' : 'normal'
            }}
          />
        </ListItem>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {territory.children.map(pos => renderPOSNode(pos))}
          </List>
        </Collapse>
      </Box>
    );
  };
  
  // Renderizza il nodo POS
  const renderPOSNode = (pos) => {
    const nodeId = `pos_${pos.id}`;
    const isExpanded = !!expandedNodes[nodeId];
    const hasOrders = pos.children && pos.children.length > 0;
    const hasPendingOrders = hasOrders && pos.children.some(order => order.stato !== 'completato');
    
    return (
      <React.Fragment key={pos.id}>
        <ListItem 
          button
          onClick={() => handleToggleNode(nodeId)}
          sx={{ 
            pl: 8,
            bgcolor: isExpanded ? 'action.hover' : 'inherit',
            color: hasPendingOrders ? 'primary.main' : 'inherit'
          }}
          secondaryAction={
            <IconButton 
              edge="end" 
              size="small"
              onClick={(e) => handleActionClick(e, pos)}
            >
              <MoreVertIcon />
            </IconButton>
          }
        >
          <ListItemIcon>
            {hasOrders ? (isExpanded ? 
              <ExpandMoreIcon color={hasPendingOrders ? 'primary' : 'inherit'} /> : 
              <ChevronRightIcon color={hasPendingOrders ? 'primary' : 'inherit'} />) : 
              <Box sx={{ width: 24 }} />}
          </ListItemIcon>
          <ListItemIcon>
            <StoreIcon fontSize="small" color={hasPendingOrders ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="body2" 
                  fontWeight={hasPendingOrders ? 'medium' : 'normal'}
                  color={hasPendingOrders ? 'primary.main' : 'inherit'}
                  sx={{ flexGrow: 1 }}
                >
                  {pos.title || pos.nome_account}
                </Typography>
                
                {/* Se siamo in modalità manager e il POS ha un PM assegnato, mostriamo un badge */}
                {isManager && pos.pm_full_name && (
                  <Tooltip title={`PM: ${pos.pm_full_name}`}>
                    <Avatar
                      sx={{ 
                        width: 20, 
                        height: 20, 
                        fontSize: '0.625rem',
                        bgcolor: 'primary.light'
                      }}
                    >
                      {getInitials(pos.pm_full_name)}
                    </Avatar>
                  </Tooltip>
                )}
              </Box>
            }
            secondary={
              hasOrders ? `${pos.children.length} ordini` : null
            }
            primaryTypographyProps={{ 
              component: 'div' // Necessario per Box come figlio
            }}
            secondaryTypographyProps={{ 
              color: hasPendingOrders ? 'primary.light' : 'text.secondary'
            }}
          />
        </ListItem>
        
        {/* Ordini del POS */}
        {hasOrders && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ mt: 0.5 }}>
              {pos.children.map(order => (
                <ListItem 
                  key={order.id} 
                  button
                  onClick={(e) => handleOrderClick(order, e)}
                  sx={{ 
                    pl: 14,  
                    pr: 2,
                    py: 0.5,
                    height: 'auto',
                    bgcolor: selectedOrderId === order.id ? 'rgba(25, 118, 210, 0.12)' : 'inherit',
                    '&:hover': {
                      bgcolor: selectedOrderId === order.id ? 'rgba(25, 118, 210, 0.12)' : 'action.hover',
                    },
                    borderRadius: 1,
                    my: 0.5,
                    mx: 2
                  }}
                >
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={selectedOrderId === order.id ? 'bold' : 'normal'}
                          noWrap
                          sx={{ 
                            flexGrow: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: isManager && order.pm_full_name ? '60%' : '80%'
                          }}
                        >
                          ORDINE {order.id} del {formatDate(order.data_creazione)} - {order.tipo_attivita_desc || 'N/D'}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                          {/* Se siamo in modalità manager e l'ordine ha un PM assegnato */}
                          {isManager && order.pm_full_name && (
                            <Tooltip title={`PM: ${order.pm_full_name}`}>
                              <Avatar
                                sx={{ 
                                  width: 20, 
                                  height: 20, 
                                  fontSize: '0.625rem',
                                  bgcolor: 'primary.light'
                                }}
                              >
                                {getInitials(order.pm_full_name)}
                              </Avatar>
                            </Tooltip>
                          )}
                          
                          {formatStatusBadge(order.stato)}
                        </Box>
                      </Box>
                    }
                    secondary={null}
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2, justifyContent: 'space-between' }}>
        <TextField
          placeholder="Cerca POS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>
      
      <Paper sx={{ width: '100%', height: 'calc(100% - 48px)', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : filteredData.length > 0 ? (
            <List component="nav">
              {filteredData.map(region => renderRegionNode(region))}
            </List>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography>Nessun dato disponibile</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Menu Azioni */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
      >
        <MenuItem onClick={() => handleOpenPanel('tasks', selectedRow?.id)}>
          <TasksIcon fontSize="small" sx={{ mr: 1 }} />
          Attività
        </MenuItem>
        
        {/* Mostra opzione per cambiare stato solo se l'utente è un PM o se è manager ma il POS ha un PM assegnato */}
        {(!isManager || (isManager && selectedRow?.pm_id)) && (
          <MenuItem onClick={() => handleOpenPanel('status', selectedRow?.id)}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Cambia Stato
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleOpenPanel('documents', selectedRow?.id)}>
          <FolderIcon fontSize="small" sx={{ mr: 1 }} />
          Documenti
        </MenuItem>
        
        {/* Opzione "Assegna PM" solo per i manager */}
        {isManager && (
          <MenuItem onClick={() => handleOpenPanel('assign', selectedRow?.id)}>
            <ManagerIcon fontSize="small" sx={{ mr: 1 }} />
            Assegna PM
          </MenuItem>
        )}
      </Menu>

      {/* Pannelli */}
      {activePanelType === 'tasks' && (
        <TasksPanel 
          posOrderId={activePanelId} 
          onClose={handleClosePanel}
          onUpdate={refreshData}
          isManager={isManager}
        />
      )}

      {activePanelType === 'status' && (
        <StatusPanel 
          posId={activePanelId} 
          onClose={handleClosePanel}
          onUpdate={refreshData}
        />
      )}

      {activePanelType === 'documents' && (
        <DocumentsPanel 
          posId={activePanelId} 
          onClose={handleClosePanel}
        />
      )}

      {/* Qui si potrebbe aggiungere il pannello per l'assegnazione del PM */}
      {activePanelType === 'assign' && isManager && (
        <AssignPMPanel 
          posId={activePanelId} 
          onClose={handleClosePanel}
          onUpdate={refreshData}
        />
      )}

      {/* Pannello dettaglio ordine */}
      {activePanelType === 'order-detail' && selectedOrderId && (
        <OrderDetailPanel
          posOrderId={selectedOrderId}
          onClose={handleCloseOrderDetail}
          onUpdate={refreshData}
          isManager={isManager}
        />
      )}
    </>
  );
};

export default POSTree;