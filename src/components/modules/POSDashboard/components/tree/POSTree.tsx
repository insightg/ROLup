// src/components/modules/POSDashboard/components/tree/POSTree.tsx ottimizzato
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Stack,
  Chip,
  Skeleton,
  Typography,
  CircularProgress
} from '@mui/material';
import { 
  Search, 
  Store, 
  KeyboardArrowDown as ChevronDown,
  KeyboardArrowRight as ChevronRight
} from '@mui/icons-material';
import { OrderItem } from './OrderItem';
import type { POS, Order } from '../../types/dashboard';
import { debounce } from 'lodash';

// Componente per la ricerca con debounce per migliorare la performance
const SearchField = memo(({ 
  value, 
  onChange, 
  isLoading 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  isLoading: boolean 
}) => {
  const [localValue, setLocalValue] = useState(value);
  
  // Usa debounce per evitare troppe ricerche durante la digitazione
  const debouncedOnChange = useMemo(
    () => debounce((newValue: string) => {
      onChange(newValue);
    }, 300),
    [onChange]
  );
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };
  
  return (
    <TextField
      fullWidth
      size="small"
      placeholder="Cerca POS o ordini..."
      value={localValue}
      onChange={handleChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
        endAdornment: isLoading && (
          <InputAdornment position="end">
            <CircularProgress size={20} />
          </InputAdornment>
        )
      }}
    />
  );
});

SearchField.displayName = 'SearchField';

// Styled component per la scrollbar personalizzata
const CustomScrollContainer = memo(({ children }: { children: React.ReactNode }) => (
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

// Memoized OrderList component for better performance
const OrdersList = memo(({ 
  orders, 
  posName,
  posId, 
  onOrderClick, 
  selectedOrderId 
}: {
  orders: Order[];
  posName: string;
  posId: string;
  onOrderClick: (order: Order, posName: string, posId: string) => void;
  selectedOrderId?: string;
}) => {
  // Utilizziamo il virtualizedList solo se abbiamo molti ordini
  const shouldVirtualize = orders.length > 20;
  
  // Memoizzare la lista degli ordini per evitare re-render inutili
  const orderItems = useMemo(() => {
    return orders.map((order) => (
      <Box key={order.id} sx={{ mb: 1 }}>
        <OrderItem 
          order={order}
          onClick={() => onOrderClick(order, posName, posId)}
          isSelected={order.id === selectedOrderId}
        />
      </Box>
    ));
  }, [orders, posName, posId, onOrderClick, selectedOrderId]);
  
  return (
    <List sx={{ pl: 6 }}>
      {orderItems}
    </List>
  );
});

OrdersList.displayName = 'OrdersList';

// Memo-ized POSNode component with performance optimizations
const POSNode = memo(({ 
  pos, 
  isExpanded, 
  onToggle, 
  onOrderClick,
  selectedOrderId 
}: {
  pos: POS;
  isExpanded: boolean;
  onToggle: () => void;
  onOrderClick: (order: Order, posName: string, posId: string) => void;
  selectedOrderId?: string;
}) => {
  // Calcola i dati derivati solo quando necessario con useMemo
  const { hasOpenOrders, completedCount, totalOrders } = useMemo(() => {
    return {
      hasOpenOrders: pos.children.some(order => order.stato !== 'completato'),
      completedCount: pos.children.filter(order => order.stato === 'completato').length,
      totalOrders: pos.children.length
    };
  }, [pos.children]);

  // Crea le callback solo quando cambiano le dipendenze
  const handleToggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <Box>
      <ListItemButton onClick={handleToggle}>
        <ListItemIcon>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </ListItemIcon>
        <ListItemIcon>
          <Store />
        </ListItemIcon>
        <ListItemText
          primary={pos.nome_account}
          secondary={pos.sf_territory && pos.sf_region ? 
            `${pos.sf_territory}, ${pos.sf_region}` : 
            'Territory and Region not available'
          }
        />
        <Stack direction="column" spacing={0.5} alignItems="flex-end">
          {hasOpenOrders && (
            <Chip
              label="Aperto"
              size="small"
              color="primary"
            />
          )}
          <Chip
            label={`${completedCount}/${totalOrders}`}
            size="small"
            variant="outlined"
          />
        </Stack>
      </ListItemButton>
      
      {/* Renderizza il contenuto espanso solo se effettivamente espanso - usa transizione */}
      <Collapse in={isExpanded} mountOnEnter unmountOnExit>
        {isExpanded && (
          <OrdersList 
            orders={pos.children}
            posName={pos.nome_account}
            posId={pos.id}
            onOrderClick={onOrderClick}
            selectedOrderId={selectedOrderId}
          />
        )}
      </Collapse>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Personalizza il controllo di uguaglianza per il React.memo
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.selectedOrderId === nextProps.selectedOrderId &&
    prevProps.pos.id === nextProps.pos.id &&
    prevProps.pos.children.length === nextProps.pos.children.length
  );
});

POSNode.displayName = 'POSNode';

interface POSTreeProps {
  posData: POS[];
  expandedNodes: Record<string, boolean>;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNodeToggle: (id: string) => void;
  onOrderClick: (order: Order, posName: string, posId: string) => void;
  selectedOrderId?: string;
  isLoading?: boolean;
}

export const POSTree: React.FC<POSTreeProps> = memo(({
  posData,
  expandedNodes,
  searchTerm,
  onSearchChange,
  onNodeToggle,
  onOrderClick,
  selectedOrderId,
  isLoading = false
}) => {
  // Ottimizzazione: memoize la funzione di toggle
  const handleNodeToggle = useCallback((id: string) => {
    onNodeToggle(id);
  }, [onNodeToggle]);

  // Memoizzare la lista dei nodi POS
  const posNodes = useMemo(() => {
    return posData.map((pos) => (
      <POSNode 
        key={pos.id}
        pos={pos}
        isExpanded={!!expandedNodes[pos.id]}
        onToggle={() => handleNodeToggle(pos.id)}
        onOrderClick={onOrderClick}
        selectedOrderId={selectedOrderId}
      />
    ));
  }, [posData, expandedNodes, handleNodeToggle, onOrderClick, selectedOrderId]);

  // Render loading state
  if (isLoading && posData.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Skeleton width="100%" height={40} variant="rectangular" />
        </Box>

        <Box sx={{ flex: 1, p: 2 }}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Box key={item} sx={{ mb: 2 }}>
              <Skeleton variant="rectangular" width="100%" height={60} />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // Render empty state
  if (!isLoading && posData.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <SearchField 
            value={searchTerm}
            onChange={onSearchChange}
            isLoading={isLoading}
          />
        </Box>

        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column' 
        }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Nessun POS disponibile
          </Typography>
          {searchTerm && (
            <Typography variant="body2" color="text.secondary">
              Prova a modificare i criteri di ricerca
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Area di ricerca - Altezza fissa */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider', 
        flexShrink: 0,
        zIndex: 1, // Assicura che la barra di ricerca rimanga in cima
        bgcolor: 'background.paper'
      }}>
        <SearchField 
          value={searchTerm}
          onChange={onSearchChange}
          isLoading={isLoading}
        />
      </Box>

      {/* Area scrollabile della lista */}
      <CustomScrollContainer>
        <List 
          sx={{ 
            py: 1,
            '& .MuiListItemButton-root': { 
              py: 1.5 // Aumenta leggermente lo spazio per migliorare la cliccabilità
            }
          }}
        >
          {posNodes}
        </List>
      </CustomScrollContainer>
    </Box>
  );
});

POSTree.displayName = 'POSTree';