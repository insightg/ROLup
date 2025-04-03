// src/components/modules/PickManager/components/HistoryPanel.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Send as SendIcon,
  ShoppingCart as CartIcon
} from '@mui/icons-material';
import { usePickStore } from '../stores/pickStore';
import { fetchPickListDetails } from '../api/pickApi';

const HistoryPanel = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [filteredLists, setFilteredLists] = useState([]);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedPickListId, setSelectedPickListId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { pickLists, loadPickLists } = usePickStore();

  // Load pick lists on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadPickLists();
      } catch (error) {
        console.error("Error loading pick lists:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [loadPickLists]);

  // Filter and sort pick lists
  useEffect(() => {
    if (!pickLists) return;
    
    let filtered = [...pickLists];
    
    // Apply search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(list => 
        (list.name && list.name.toLowerCase().includes(lowerSearchTerm)) ||
        (list.description && list.description.toLowerCase().includes(lowerSearchTerm)) ||
        (list.status && list.status.toLowerCase().includes(lowerSearchTerm)) ||
        (list.created_by_name && list.created_by_name.toLowerCase().includes(lowerSearchTerm)) ||
        (list.created_by_username && list.created_by_username.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // Apply sorting
    filtered = filtered.sort((a, b) => {
      const aValue = a[orderBy] || '';
      const bValue = b[orderBy] || '';
      
      // For date fields
      if (orderBy === 'created_at' || orderBy === 'order_date') {
        const aDate = aValue ? new Date(aValue).getTime() : 0;
        const bDate = bValue ? new Date(bValue).getTime() : 0;
        return order === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // For numeric fields
      if (orderBy === 'pos_count') {
        return order === 'asc' 
          ? Number(aValue || 0) - Number(bValue || 0) 
          : Number(bValue || 0) - Number(aValue || 0);
      }
      
      // For string fields
      if (order === 'asc') {
        return String(aValue).localeCompare(String(bValue));
      } else {
        return String(bValue).localeCompare(String(aValue));
      }
    });
    
    setFilteredLists(filtered);
    
    // Reset to first page when filters change
    setPage(0);
  }, [pickLists, searchTerm, orderBy, order]);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sorting handler
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // View pick list details
  const handleViewDetails = async (pickListId) => {
    try {
      const response = await fetchPickListDetails(pickListId);
      
      if (response.success) {
        // Navigate to details or open a dialog
        // This would typically be implemented in a real app
        console.log('Pick list details:', response);
      }
    } catch (error) {
      console.error('Error fetching pick list details:', error);
    }
    
    handleCloseActionMenu();
  };

  // Open action menu
  const handleOpenActionMenu = (event, pickListId) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedPickListId(pickListId);
  };

  // Close action menu
  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
    setSelectedPickListId(null);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Get status chip
  const getStatusChip = (status) => {
    if (!status) return <Chip label="Unknown" size="small" />;
    
    let color = 'default';
    
    switch (status) {
      case 'draft':
        color = 'default';
        break;
      case 'confirmed':
        color = 'primary';
        break;
      case 'ordered':
        color = 'info';
        break;
      case 'partially_received':
        color = 'warning';
        break;
      case 'completed':
        color = 'success';
        break;
      case 'cancelled':
        color = 'error';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        label={status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        color={color}
        size="small"
      />
    );
  };

  // Calculate paginated data
  const paginatedData = filteredLists.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            placeholder="Search..."
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
          
          {searchTerm && (
            <Button 
              size="small" 
              variant="outlined" 
              onClick={() => setSearchTerm('')}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>
      
      <Paper sx={{ width: '100%', height: 'calc(100% - 48px)', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100% - 52px)' }}>
          <Table stickyHeader aria-label="pick lists table">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Pick List Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'created_by_name'}
                    direction={orderBy === 'created_by_name' ? order : 'asc'}
                    onClick={() => handleRequestSort('created_by_name')}
                  >
                    Created By
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'created_at'}
                    direction={orderBy === 'created_at' ? order : 'asc'}
                    onClick={() => handleRequestSort('created_at')}
                  >
                    Created Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'order_date'}
                    direction={orderBy === 'order_date' ? order : 'asc'}
                    onClick={() => handleRequestSort('order_date')}
                  >
                    Order Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'pos_count'}
                    direction={orderBy === 'pos_count' ? order : 'asc'}
                    onClick={() => handleRequestSort('pos_count')}
                  >
                    POS Count
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.name || '-'}</TableCell>
                    <TableCell>{row.status ? getStatusChip(row.status) : '-'}</TableCell>
                    <TableCell>{row.created_by_name || row.created_by_username || '-'}</TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>{formatDate(row.order_date)}</TableCell>
                    <TableCell>{row.pos_count || 0}</TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small"
                        onClick={(e) => handleOpenActionMenu(e, row.id)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No pick lists found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredLists.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
      >
        <MenuItem onClick={() => handleViewDetails(selectedPickListId)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleCloseActionMenu}>
          <ListItemIcon>
            <PrintIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Print</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleCloseActionMenu}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default HistoryPanel;