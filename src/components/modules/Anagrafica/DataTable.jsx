import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Badge,
  Tooltip,
  Checkbox,
  Button,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Refresh as RefreshIcon, 
  FilterList as FilterIcon, 
  Visibility as VisibilityIcon 
} from '@mui/icons-material';
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  flexRender 
} from '@tanstack/react-table';
import { useDebouncedCallback } from 'use-debounce';
import FilterDialog from './FilterDialog';
import RecordDetail from './RecordDetail';
import anagraficaApi from './api/anagraficaApi';
import ColumnVisibilityMenu from './ColumnVisibilityMenu';

const DataTable = () => {
  // Stati per dati, filtri, paginazione, ecc.
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isColumnVisibilityDialogOpen, setIsColumnVisibilityDialogOpen] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filteredRecords, setFilteredRecords] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25
  });
  const [sorting, setSorting] = useState([]);
  // Stato per la gestione degli ID selezionati
  const [selectedIds, setSelectedIds] = useState([]);
  // Stato per l'ancora del menu delle azioni sui record selezionati
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);

  // Funzione per recuperare i dati con supporto per filtri, ordinamento e paginazione lato server
  const fetchData = async (options = {}) => {
    setIsLoading(true);
    setError(null);

    // Determina la direzione e il campo per l'ordinamento
    let sortDir = 'asc';
    let sortBy = 'id';
    if (options.sorting?.length > 0) {
      sortDir = options.sorting[0].desc ? 'desc' : 'asc';
      sortBy = options.sorting[0].id;
    }

    const params = {
      page: (options.pagination?.pageIndex || 0) + 1,
      pageSize: options.pagination?.pageSize || 25,
      sortBy: sortBy,
      sortDir: sortDir,
      search: options.globalFilter || '',
      filters: options.columnFilters ? JSON.stringify(options.columnFilters) : ''
    };

    try {
      console.log("Fetching data with params:", params);
      const response = await anagraficaApi.getData(params);
      setData(response.data.data || []);
      setTotalRecords(response.data.total || 0);
      setFilteredRecords(response.data.total || 0);
      return {
        data: response.data.data || [],
        totalRecords: response.data.total || 0,
        pageCount: response.data.pages || 0
      };
    } catch (err) {
      console.error('Errore recupero dati:', err);
      setError(err.message || 'Errore nel recupero dei dati');
      return { data: [], totalRecords: 0, pageCount: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per recuperare tutti gli ID dei record filtrati
  const fetchAllIds = async () => {
    const params = {
      search: globalFilter || '',
      filters: columnFilters ? JSON.stringify(columnFilters) : '',
    };
    try {
      const response = await anagraficaApi.getAllIds(params);
      // Si assume che la response restituisca un array di ID in response.data.ids
      return response.data.ids;
    } catch (err) {
      console.error('Errore nel recupero di tutti gli ID:', err);
      return [];
    }
  };

  // Caricamento dati al variare di paginazione, ordinamento o filtri
  useEffect(() => {
    const loadData = async () => {
      console.log("Fetching data with sorting:", sorting);
      await fetchData({
        pagination,
        sorting,
        globalFilter,
        columnFilters
      });
    };
    loadData();
  }, [pagination.pageIndex, pagination.pageSize, JSON.stringify(sorting), globalFilter, JSON.stringify(columnFilters)]);

  // Gestione della chiusura del dettaglio record
  const handleDetailClose = (refreshData = false) => {
    setIsDetailOpen(false);
    setSelectedRecord(null);
    if (refreshData) {
      fetchData({
        pagination,
        sorting,
        globalFilter,
        columnFilters
      });
    }
  };

  // Aggiornamento manuale dei dati
  const handleRefresh = () => {
    fetchData({
      pagination,
      sorting,
      globalFilter,
      columnFilters
    });
  };

  // Gestione della selezione di una singola riga
  const handleRowSelection = (id, isSelected, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      if (isSelected) {
        return [...prev, id];
      } else {
        return prev.filter(item => item !== id);
      }
    });
  };

  // Gestione del "select all" per tutti i record filtrati (o dell'intera tabella)
  const handleSelectAll = async (isSelected) => {
    if (isSelected) {
      const allIds = await fetchAllIds();
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  // Funzione per la gestione dell'ordinamento al click sull'intestazione della colonna
  const handleSortingClick = useCallback((columnId) => {
    const toggleSort = (currentSort) => {
      if (!currentSort.length) {
        return [{ id: columnId, desc: false }];
      } else if (currentSort[0].id === columnId) {
        if (currentSort[0].desc === false) {
          return [{ id: columnId, desc: true }];
        } else {
          return [];
        }
      } else {
        return [{ id: columnId, desc: false }];
      }
    };
    setSorting(current => toggleSort(current));
  }, []);

  // Funzione per aprire il menu delle azioni sui record selezionati
  const handleActionMenuOpen = (event) => {
    setActionMenuAnchor(event.currentTarget);
  };

  // Funzione per chiudere il menu delle azioni
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  // Esempio di funzione per gestire una specifica azione sui record selezionati
  const handleSelectedAction = () => {
    // Personalizza qui le azioni da eseguire sui record selezionati
    alert(`Eseguo azione su record: ${selectedIds.join(", ")}`);
  };

  // Debounce per la ricerca globale
  const debouncedSetGlobalFilter = useDebouncedCallback(value => {
    setGlobalFilter(value);
    // Resetta alla prima pagina al cambiare la ricerca
    setPagination(old => ({ ...old, pageIndex: 0 }));
  }, 500);

  const hasActiveFilters = columnFilters.length > 0 || globalFilter.trim() !== '';

  // Definizione delle colonne, inclusa quella per la selezione
  const columns = useMemo(
    () => [
      {
        id: 'selection',
        header: ({ table }) => {
          // In questo caso, consideriamo "tutti" i record filtrati
          const allSelected = selectedIds.length === filteredRecords && filteredRecords > 0;
          return (
            <Checkbox
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
        cell: ({ row }) => {
          const isSelected = selectedIds.includes(row.original.id);
          return (
            <Checkbox
              checked={isSelected}
              onChange={(e) => handleRowSelection(row.original.id, e.target.checked, e)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
        size: 60,
      },
      {
        id: 'actions',
        header: 'Azioni',
        cell: ({ row }) => (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRecord(row.original);
              setIsDetailOpen(true);
            }}
            size="small"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 60,
      },
      {
        accessorKey: 'id',
        header: 'ID',
        size: 70,
        enableResizing: true,
      },
      {
        accessorKey: 'nome_account',
        header: 'Nome Account',
        size: 200,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
            <Tooltip title={info.getValue()}>
              <span>{info.getValue()}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'sf_region',
        header: 'SF Region',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'sf_district',
        header: 'SF District',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'sf_territory',
        header: 'SF Territory',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'tipo_di_record_account',
        header: 'Tipo di Record Account',
        size: 180,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'rrp_segment',
        header: 'RRP Segment',
        size: 130,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'trade',
        header: 'Trade',
        size: 120,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'cap_spedizioni',
        header: 'CAP Spedizioni',
        size: 120,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'statoprovincia_spedizioni',
        header: 'Stato/Provincia Spedizioni',
        size: 180,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'citt_spedizioni',
        header: 'Città Spedizioni',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'indirizzo_spedizioni',
        header: 'Indirizzo Spedizioni',
        size: 200,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'telefono',
        header: 'Telefono',
        size: 120,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'mobile',
        header: 'Mobile',
        size: 120,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 180,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'field_rep',
        header: 'Field Rep',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'numero_field_rep',
        header: 'Numero Field Rep',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'supervisor',
        header: 'Supervisor',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      },
      {
        accessorKey: 'numero_supervisor',
        header: 'Numero Supervisor',
        size: 150,
        enableResizing: true,
        cell: info => (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Tooltip title={info.getValue() || ''}>
              <span>{info.getValue() || ''}</span>
            </Tooltip>
          </div>
        )
      }
    ],
    [selectedIds, filteredRecords]
  );

  const table = useReactTable({
    columns,
    data,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    state: {
      pagination,
      globalFilter,
      columnFilters,
      sorting
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
        <TextField
          size="small"
          sx={{ mr: 2, width: 300 }}
          value={globalFilter}
          onChange={(e) => debouncedSetGlobalFilter(e.target.value)}
          placeholder="Cerca..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        <Badge color="primary" variant="dot" invisible={!hasActiveFilters} overlap="circular">
          <IconButton color={hasActiveFilters ? "primary" : "default"} sx={{ mr: 2 }} onClick={() => setIsFilterDialogOpen(true)} title="Filtri avanzati">
            <FilterIcon />
          </IconButton>
        </Badge>
        <IconButton color="primary" sx={{ mr: 2 }} onClick={() => setIsColumnVisibilityDialogOpen(true)} title="Gestione colonne">
          <VisibilityIcon />
        </IconButton>
        <IconButton color="primary" onClick={handleRefresh} title="Aggiorna dati">
          <RefreshIcon />
        </IconButton>

        {/* Bottone che mostra il contatore dei record selezionati e apre il menu per le azioni */}
        {selectedIds.length > 0 && (
          <Button variant="contained" color="secondary" onClick={handleActionMenuOpen} sx={{ ml: 2 }}>
            {selectedIds.length} selezionati
          </Button>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {hasActiveFilters && (
          <Typography variant="body2" color="primary">
            {filteredRecords} filtrati
          </Typography>
        )}
      </Paper>

      {/* Menu per le azioni sui record selezionati */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => { handleSelectedAction(); handleActionMenuClose(); }}>
          Azione 1
        </MenuItem>
        <MenuItem onClick={() => { alert(`Azione 2 su: ${selectedIds.join(", ")}`); handleActionMenuClose(); }}>
          Azione 2
        </MenuItem>
        {/* Aggiungi qui altre azioni se necessario */}
      </Menu>

      {/* Alert di errore */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Contenitore principale con la tabella */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isLoading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.7)', zIndex: 1000 }}>
              <CircularProgress />
            </Box>
          )}

          <TableContainer sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.05)',
            }
          }}>
            <Table stickyHeader sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableCell
                        key={header.id}
                        sx={{
                          padding: '8px',
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          backgroundColor: 'white',
                          zIndex: 1,
                          whiteSpace: 'nowrap',
                          width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : 'auto'
                        }}
                        onClick={() => {
                          if (header.column.getCanSort()) {
                            handleSortingClick(header.column.id);
                          }
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() ?? null]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      }
                    }}
                    onClick={() => {
                      setSelectedRecord(row.original);
                      setIsDetailOpen(true);
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        sx={{
                          padding: '8px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: cell.column.columnDef.size ? `${cell.column.columnDef.size}px` : 'auto'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {data.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        {hasActiveFilters ? 'Nessun record corrisponde ai filtri applicati' : 'Nessun record disponibile'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Paginazione */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderTop: '1px solid #ddd', backgroundColor: 'background.paper', flexShrink: 0 }}>
          <Box sx={{ mr: 2 }}>
            Righe per pagina:
            <select
              value={pagination.pageSize}
              onChange={e => {
                setPagination(prev => ({
                  ...prev,
                  pageSize: Number(e.target.value),
                  pageIndex: 0 // Reset alla prima pagina al cambiare il numero di righe per pagina
                }));
              }}
              style={{ marginLeft: '8px', padding: '4px' }}
            >
              {[10, 25, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </Box>
          <Box>
            <IconButton onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}>
              {"<<"}
            </IconButton>
            <IconButton onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))} disabled={pagination.pageIndex === 0}>
              {"<"}
            </IconButton>
            <span style={{ margin: '0 8px' }}>
              Pagina <strong>{pagination.pageIndex + 1} di {table.getPageCount() || 1}</strong>
            </span>
            <IconButton onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.min(table.getPageCount() - 1, prev.pageIndex + 1) }))} disabled={pagination.pageIndex >= table.getPageCount() - 1}>
              {">"}
            </IconButton>
            <IconButton onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, table.getPageCount() - 1) }))} disabled={pagination.pageIndex >= table.getPageCount() - 1}>
              {">>"}
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Dialog per filtri avanzati */}
      <FilterDialog
        open={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        columns={columns.filter(col => col.id !== 'actions' && col.id !== 'selection')}
        filters={columnFilters}
        onFiltersChange={setColumnFilters}
      />

      {/* Dialog per la gestione della visibilità delle colonne */}
      <ColumnVisibilityMenu
        open={isColumnVisibilityDialogOpen}
        onClose={() => setIsColumnVisibilityDialogOpen(false)}
        table={table}
      />

      {/* Dialog per il dettaglio del record */}
      {selectedRecord && (
        <RecordDetail
          open={isDetailOpen}
          onClose={handleDetailClose}
          record={selectedRecord}
        />
      )}
    </Box>
  );
};

export default DataTable;
