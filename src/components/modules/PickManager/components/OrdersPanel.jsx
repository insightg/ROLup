// src/components/modules/PickManager/components/OrdersPanel.jsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TableContainer, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControlLabel,
  Switch,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { usePickStore } from '../stores/pickStore';
import { 
  fetchPOSOrders,
  generatePickList, 
  savePickList 
} from '../api/pickApi';
import POSConfigDialog from './POSConfigDialog';
import PickListPreviewDialog from './PickListPreviewDialog';

const OrdersPanel = ({ onSelectTab }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState('has_modules');
  const [order, setOrder] = useState('desc');
  const [filteredData, setFilteredData] = useState([]);
  const [showConfiguredOnly, setShowConfiguredOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialMount = useRef(true);
  
  // Dialog states
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [pickListData, setPickListData] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pickListName, setPickListName] = useState('');
  const [pickListDescription, setPickListDescription] = useState('');
  
  const { 
    posOrders, 
    selectedOrders, 
    toggleOrderSelection, 
    clearOrderSelection,
    setPOSOrders
  } = usePickStore();

  // Load orders with server-side sorting and filtering
  const loadOrdersWithSorting = async () => {
    try {
      setIsLoading(true);
      console.log(`Loading POS orders with sorting: ${orderBy} ${order}, filter: ${showConfiguredOnly}`);
      
      const response = await fetchPOSOrders({
        sortField: orderBy,
        sortOrder: order,
        filterConfigured: showConfiguredOnly
      });
      
      if (response.success) {
        // Update the store with the sorted and filtered data
        setPOSOrders(response.data);
        // Also set the filtered data initially
        setFilteredData(response.data);
      } else {
        console.error("Error loading orders:", response.error);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (isInitialMount.current) {
      loadOrdersWithSorting();
      isInitialMount.current = false;
    }
  }, []);

  // Reload when sort or filter changes
  useEffect(() => {
    if (!isInitialMount.current) {
      loadOrdersWithSorting();
    }
  }, [orderBy, order, showConfiguredOnly]);

  // Apply client-side filtering for search term
  useEffect(() => {
    console.log("Applying client-side search filter:", searchTerm);
    if (!posOrders) return;
    
    if (!searchTerm) {
      setFilteredData(posOrders);
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = posOrders.filter(row => 
      (row.pos_name?.toLowerCase().includes(lowerSearchTerm)) ||
      (row.tipo_attivita_desc?.toLowerCase().includes(lowerSearchTerm)) ||
      (row.sf_region?.toLowerCase().includes(lowerSearchTerm)) ||
      (row.sf_territory?.toLowerCase().includes(lowerSearchTerm)) ||
      (row.rrp_segment?.toLowerCase().includes(lowerSearchTerm)) ||
      (row.pm_full_name?.toLowerCase().includes(lowerSearchTerm))
    );
    
    setFilteredData(filtered);
    setPage(0); // Reset to first page when search changes
  }, [searchTerm, posOrders]);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sorting handler - now sends to server
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sort changes
  };

  // Filter toggle handler
  const handleFilterToggle = (event) => {
    setShowConfiguredOnly(event.target.checked);
    setPage(0); // Reset to first page when filter changes
  };

  // Handle refresh button
  const handleRefresh = () => {
    loadOrdersWithSorting();
  };

  // Open config dialog
  const handleOpenConfig = (orderId) => {
    setSelectedOrderId(orderId);
    setConfigDialogOpen(true);
  };

  // Close config dialog
  const handleCloseConfig = () => {
    setConfigDialogOpen(false);
    setSelectedOrderId(null);
    
    // Reload data to get updated module status
    loadOrdersWithSorting();
  };

  // Preview pick list
  const handlePreviewPickList = async () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one order to create a pick list");
      return;
    }
    
    try {
      console.log("Generating pick list for orders:", selectedOrders);
      setIsLoading(true);
      
      const response = await generatePickList(selectedOrders);
      console.log("Pick list generation response:", response);
      
      if (response.success) {
        setPickListData(response);
        setPreviewDialogOpen(true);
      } else {
        alert("Error generating pick list: " + (response.error || "Unknown error"));
      }
    } catch (error) {
      console.error('Error generating pick list preview:', error);
      alert("Error generating pick list: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Open save dialog
  const handleOpenSaveDialog = () => {
    setPickListName(`Pick List - ${new Date().toLocaleDateString()}`);
    setPickListDescription('');
    setSaveDialogOpen(true);
  };

  // Save pick list
  const handleSavePickList = async () => {
    if (!pickListData || !pickListName) return;
    
    try {
      setIsLoading(true);
      console.log("Saving pick list:", pickListName);
      
      // Prepare details for saving
      const details = pickListData.data.map(item => ({
        supplier_id: item.supplier_id,
        material_id: item.material_id,
        is_custom: item.is_custom,
        article_code: item.article_code,
        description: item.description,
        quantity: item.total_quantity,
        unit_of_measure: item.unit_of_measure,
        unit_price: item.unit_price
      }));
      
      const saveData = {
        name: pickListName,
        description: pickListDescription,
        status: 'draft',
        details,
        order_ids: selectedOrders
      };
      
      const response = await savePickList(saveData);
      
      if (response.success) {
        // Close dialogs and clear selection
        setSaveDialogOpen(false);
        setPreviewDialogOpen(false);
        clearOrderSelection();
        
        // Navigate to Pick Lists tab
        if (onSelectTab) {
          onSelectTab();
        }
      } else {
        alert("Error saving pick list: " + (response.error || "Unknown error"));
      }
    } catch (error) {
      console.error('Error saving pick list:', error);
      alert("Error saving pick list: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate paginated data
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Format status as badge
  const formatStatusBadge = (status) => {
    let color = 'default';
    let label = status || 'Unknown';
    
    switch (status) {
      case 'completato':
        color = 'success';
        label = 'Completed';
        break;
      case 'in_lavorazione':
        color = 'primary';
        label = 'In Progress';
        break;
      case 'assegnato':
        color = 'info';
        label = 'Assigned';
        break;
      case 'standby':
        color = 'warning';
        label = 'On Hold';
        break;
      case 'non_lavorabile':
        color = 'error';
        label = 'Not Processable';
        break;
    }
    
    return (
      <Chip 
        label={label} 
        color={color} 
        size="small" 
        variant="outlined"
      />
    );
  };

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            placeholder="Search orders..."
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
          
          <FormControlLabel
            control={
              <Switch
                checked={showConfiguredOnly}
                onChange={handleFilterToggle}
                color="primary"
              />
            }
            label="Show configured only"
            sx={{ ml: 2 }}
          />
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
            sx={{ ml: 2 }}
          >
            Refresh
          </Button>
        </Box>
        
        <Box>
          {selectedOrders.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearOrderSelection}
                size="small"
              >
                Clear Selection ({selectedOrders.length})
              </Button>
              
              <Button
                variant="contained"
                startIcon={<CartIcon />}
                onClick={handlePreviewPickList}
                color="primary"
                size="small"
                disabled={selectedOrders.length === 0 || isLoading}
              >
                Create Pick List
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Paper sx={{ width: '100%', height: 'calc(100% - 48px)', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100% - 52px)' }}>
          <Table stickyHeader aria-label="pos orders table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selectedOrders.length > 0 && selectedOrders.length < filteredData.length}
                    checked={filteredData.length > 0 && selectedOrders.length === filteredData.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Select all filtered IDs
                        const allIds = filteredData.map(row => row.id);
                        usePickStore.setState({ selectedOrders: allIds });
                      } else {
                        clearOrderSelection();
                      }
                    }}
                    inputProps={{ 'aria-label': 'select all orders' }}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'pos_name'}
                    direction={orderBy === 'pos_name' ? order : 'asc'}
                    onClick={() => handleRequestSort('pos_name')}
                  >
                    POS Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'tipo_attivita_desc'}
                    direction={orderBy === 'tipo_attivita_desc' ? order : 'asc'}
                    onClick={() => handleRequestSort('tipo_attivita_desc')}
                  >
                    Activity Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'stato'}
                    direction={orderBy === 'stato' ? order : 'asc'}
                    onClick={() => handleRequestSort('stato')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'sf_territory'}
                    direction={orderBy === 'sf_territory' ? order : 'asc'}
                    onClick={() => handleRequestSort('sf_territory')}
                  >
                    Territory
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'data_creazione'}
                    direction={orderBy === 'data_creazione' ? order : 'asc'}
                    onClick={() => handleRequestSort('data_creazione')}
                  >
                    Order Date
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={orderBy === 'has_modules'}
                    direction={orderBy === 'has_modules' ? order : 'desc'}
                    onClick={() => handleRequestSort('has_modules')}
                  >
                    Modules
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
                      <CircularProgress size={30} sx={{ mr: 2 }} />
                      <Typography variant="body1">Loading orders...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <TableRow 
                    key={row.id} 
                    hover
                    selected={selectedOrders.includes(row.id)}
                    sx={{
                      backgroundColor: row.has_modules 
                        ? 'rgba(46, 125, 50, 0.05)'
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: row.has_modules 
                          ? 'rgba(46, 125, 50, 0.08)' 
                          : ''
                      }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={selectedOrders.includes(row.id)}
                        onChange={() => toggleOrderSelection(row.id)}
                        inputProps={{ 'aria-labelledby': `enhanced-table-checkbox-${row.id}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: row.has_modules ? 'medium' : 'normal' }}>
                        {row.pos_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.tipo_attivita_desc}</TableCell>
                    <TableCell>{formatStatusBadge(row.stato)}</TableCell>
                    <TableCell>{row.sf_territory}</TableCell>
                    <TableCell>
                      {row.data_creazione ? new Date(row.data_creazione).toLocaleDateString() : ''}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small" 
                        color={row.has_modules ? "success" : "default"}
                        onClick={() => handleOpenConfig(row.id)}
                        sx={{
                          backgroundColor: row.has_modules ? 'rgba(46, 125, 50, 0.1)' : 'transparent',
                          '&:hover': {
                            backgroundColor: row.has_modules ? 'rgba(46, 125, 50, 0.2)' : 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                      >
                        <BuildIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {searchTerm ? 'No matching orders found' : 'No orders available'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </Paper>

      {/* POS Configuration Dialog */}
      <POSConfigDialog
        open={configDialogOpen}
        onClose={handleCloseConfig}
        orderId={selectedOrderId}
      />

      {/* Pick List Preview Dialog */}
      <PickListPreviewDialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        pickListData={pickListData}
        onSave={handleOpenSaveDialog}
      />

      {/* Save Pick List Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Pick List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Pick List Name"
            type="text"
            fullWidth
            value={pickListName}
            onChange={(e) => setPickListName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={pickListDescription}
            onChange={(e) => setPickListDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSavePickList} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!pickListName || isLoading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OrdersPanel;