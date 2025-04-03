// src/components/modules/POSDashboard/PosOrdersDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Grid, CircularProgress, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { StatsBar } from './components/stats/StatsBar';
import { POSTree } from './components/tree/POSTree';
import { OrderDetails } from './components/orders/OrderDetails';
import { fetchOrderTree } from './api/posApi';
import type { POS, Order } from './types/dashboard';

// Costanti per la configurazione
const QUERY_REFETCH_INTERVAL = 30000; // 30 secondi
const QUERY_STALE_TIME = 15000; // 15 secondi
const SEARCH_DEBOUNCE_TIME = 300; // 300ms

// Funzioni per le API
const fetchDashboardData = async () => {
  const result = await fetchOrderTree();
  
  if (!result.success) {
    // Se c'è un errore di autorizzazione, reindirizza alla pagina di login
    if (result.error?.includes('401') || result.error?.includes('autorizzazione')) {
      window.location.href = '../../login.php';
      throw new Error('Sessione scaduta');
    }
    throw new Error(result.error || 'Errore nel caricamento dei dati');
  }
  
  return result.data;
};

const POSOrdersDashboard: React.FC = () => {
  // Query client
  const queryClient = useQueryClient();
  
  // State declarations
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [internalSearchTerm, setInternalSearchTerm] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedOrderInfo, setSelectedOrderInfo] = useState<{
    order: Order;
    posName: string;
    posId: string;
  } | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  
  // React Query hook per la gestione dei dati e caching
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    refetchInterval: QUERY_REFETCH_INTERVAL,
    staleTime: QUERY_STALE_TIME,
    // Opzioni di caching avanzate
    gcTime: 60 * 60 * 1000, // 1 ora di garbage collection time (rimpiazza cacheTime che è deprecato)
    retry: 3, // Riprova 3 volte in caso di errore
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000) // Backoff esponenziale
  });
  
  // Estrai i dati
  const posData = useMemo(() => data?.data || [], [data]);
  const stats = useMemo(() => data?.stats || {
    total_pos_with_orders: 0,
    orders_assigned: 0,
    orders_in_progress: 0,
    orders_completed: 0
  }, [data]);

  // Funzione debounce per la ricerca
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, SEARCH_DEBOUNCE_TIME),
    []
  );

  // Handler per il cambio del termine di ricerca
  const handleSearchChange = useCallback((value: string) => {
    setInternalSearchTerm(value);
    debouncedSetSearchTerm(value);
  }, [debouncedSetSearchTerm]);

  // Forza refresh manuale dei dati (memoizzato)
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
  }, [queryClient]);

  // Gestione ordine selezionato quando i dati cambiano
  useEffect(() => {
    if (selectedOrderInfo && data?.data) {
      // Cerca il POS aggiornato basandosi sull'ID
      const updatedPos = data.data.find((pos: POS) => pos.id === selectedOrderInfo.posId);
      
      if (updatedPos) {
        // Cerca l'ordine aggiornato all'interno del POS trovato
        const updatedOrder = updatedPos.children.find(
          (order: Order) => order.id === selectedOrderInfo.order.id
        );
        
        if (updatedOrder) {
          // Aggiorna le informazioni dell'ordine selezionato
          setSelectedOrderInfo(prev => {
            // Ottimizzazione: aggiorna solo se c'è un cambiamento
            if (JSON.stringify(prev?.order) !== JSON.stringify(updatedOrder)) {
              return {
                order: updatedOrder,
                posName: updatedPos.nome_account,
                posId: updatedPos.id
              };
            }
            return prev;
          });
        }
      }
    }
  }, [data, selectedOrderInfo]);

  // Event handlers (memoizzati per prevenire ri-rendering)
  const handleOrderClick = useCallback((order: Order, posName: string, posId: string) => {
    // Reset expanded task state when changing order
    setExpandedTaskIds({});

    // Update selected order info
    setSelectedOrderInfo({
      order,
      posName,
      posId
    });

    // Expand the POS node if not already expanded
    setExpandedNodes(prev => {
      // Ottimizzazione: aggiorna solo se necessario
      if (!prev[posId]) {
        return { ...prev, [posId]: true };
      }
      return prev;
    });
  }, []);

  // Handler per aggiornamenti di ordini e task
  const handleOrderUpdated = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Handler per espandere/chiudere i task
  const handleTaskToggle = useCallback((taskId: string) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  }, []);

  // Handler per espandere/chiudere i nodi del POS
  const handleNodeToggle = useCallback((id: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  // Filtered POS data based on search term (memoizzato)
  const filteredPOS = useMemo(() => {
    if (!searchTerm.trim()) return posData;
    
    const searchLower = searchTerm.toLowerCase();
    return posData.filter((pos: POS) => {
      // Memo per i match sul POS stesso
      const posMatch = pos.nome_account.toLowerCase().includes(searchLower) ||
                      (pos.sf_region && pos.sf_region.toLowerCase().includes(searchLower)) ||
                      (pos.sf_district && pos.sf_district.toLowerCase().includes(searchLower)) ||
                      (pos.sf_territory && pos.sf_territory.toLowerCase().includes(searchLower));
      
      // Se c'è già un match sul POS, non controllare anche gli ordini
      if (posMatch) return true;
      
      // Controlla match sugli ordini solo se necessario
      return pos.children.some(order => 
        order.title.toLowerCase().includes(searchLower) ||
        (order.tipo_attivita_desc && order.tipo_attivita_desc.toLowerCase().includes(searchLower))
      );
    });
  }, [posData, searchTerm]);

  // Return ottimizzato
  return (
    <Box 
      sx={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2,
        bgcolor: 'grey.100'
      }}
    >
      {/* Stats Bar Section - Altezza fissa */}
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <StatsBar stats={stats} isLoading={isLoading} />
      </Box>
      
      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 3
      }}>
        <Grid container sx={{ height: '100%', overflow: 'hidden' }}>
          {/* Sidebar - Larghezza fissa con scrollbar interna */}
          <Grid item xs={3} sx={{ 
            height: '100%', 
            borderRight: 1, 
            borderColor: 'divider',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              height: '100%', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <POSTree 
                posData={filteredPOS}
                expandedNodes={expandedNodes}
                searchTerm={internalSearchTerm}
                onSearchChange={handleSearchChange}
                onNodeToggle={handleNodeToggle}
                onOrderClick={handleOrderClick}
                selectedOrderId={selectedOrderInfo?.order?.id}
                isLoading={isLoading || isFetching}
              />
            </Box>
          </Grid>
          
          {/* Main Content - Area di dettaglio */}
          <Grid item xs={9} sx={{ height: '100%', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', overflow: 'hidden' }}>
              {selectedOrderInfo ? (
                <OrderDetails 
                  selectedOrder={{
                    order: selectedOrderInfo.order,
                    posName: selectedOrderInfo.posName
                  }}
                  expandedTaskIds={expandedTaskIds}
                  onTaskToggle={handleTaskToggle}
                  onOrderUpdated={handleOrderUpdated}
                  isLoading={isLoading}
                />
              ) : (
                <Box 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    p: 2,
                    textAlign: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Seleziona un ordine
                    </Typography>
                    <Typography color="text.secondary">
                      Seleziona un ordine dall'elenco a sinistra per visualizzare i dettagli
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

// Per evitare ri-rendering non necessari
export default React.memo(POSOrdersDashboard);