// src/components/modules/PickManager/components/PickListPanel.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Print as PrintIcon,
  ShoppingCart as CartIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { usePickStore } from '../stores/pickStore';
import { fetchPickListDetails, updatePickListStatus } from '../api/pickApi';

// Initialization tracking key
const INITIALIZATION_KEY = 'picklists_initialized';

const PickListPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLists, setFilteredLists] = useState([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPickList, setSelectedPickList] = useState(null);
  const [pickListDetails, setPickListDetails] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedPickListId, setSelectedPickListId] = useState(null);
  
  const { pickLists, loadPickLists, refreshData } = usePickStore();

  // Load pick lists - ONE TIME ONLY, with global tracking
  useEffect(() => {
    console.log("PickListPanel component rendered");
    
    // Check if we already loaded data from session storage to prevent reload
    const alreadyInitialized = sessionStorage.getItem(INITIALIZATION_KEY) === 'true';
    
    if (!alreadyInitialized) {
      console.log("Loading pick lists - first time initialization");
      loadPickLists().then(() => {
        sessionStorage.setItem(INITIALIZATION_KEY, 'true');
        console.log("Pick lists loaded and initialization marked complete");
      });
    } else {
      console.log("Pick lists already initialized, skipping API call");
    }
    
    // No dependencies - runs exactly once per session
  }, []);

  // Filter pick lists only when search term changes
  useEffect(() => {
    if (!pickLists) return;
    
    console.log("Filtering pick lists based on search term");
    let filtered = [...pickLists];
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(list => 
        list.name?.toLowerCase().includes(lowerSearchTerm) ||
        list.description?.toLowerCase().includes(lowerSearchTerm) ||
        list.status?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    setFilteredLists(filtered);
  }, [searchTerm, pickLists]);

  // Open details dialog
  const handleOpenDetails = async (pickListId) => {
    try {
      console.log("Fetching pick list details for ID:", pickListId);
      const response = await fetchPickListDetails(pickListId);
      
      if (response.success) {
        setPickListDetails(response);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching pick list details:', error);
    }
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

  // Open status change dialog
  const handleOpenStatusDialog = (pickList) => {
    setSelectedPickList(pickList);
    setStatusDialogOpen(true);
    handleCloseActionMenu();
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      console.log("Updating status to:", newStatus);
      const response = await updatePickListStatus(selectedPickList.id, newStatus);
      
      if (response.success) {
        refreshData();
        setStatusDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  // Get status chip
  const getStatusChip = (status) => {
    let color = 'default';
    let icon = null;
    
    switch (status) {
      case 'draft':
        color = 'default';
        icon = <EditIcon />;
        break;
      case 'confirmed':
        color = 'primary';
        icon = <CheckIcon />;
        break;
      case 'ordered':
        color = 'info';
        icon = <SendIcon />;
        break;
      case 'partially_received':
        color = 'warning';
        icon = <CartIcon />;
        break;
      case 'completed':
        color = 'success';
        icon = <CheckIcon />;
        break;
      case 'cancelled':
        color = 'error';
        icon = <DeleteIcon />;
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        icon={icon}
        label={status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
        color={color}
        size="small"
      />
    );
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2, justifyContent: 'flex-start', alignItems: 'center' }}>
        <TextField
          placeholder="Search pick lists..."
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
      
      <Box sx={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
        {!pickLists ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography>Loading pick lists...</Typography>
          </Box>
        ) : filteredLists.length > 0 ? (
          <Grid container spacing={2}>
            {filteredLists.map((pickList) => (
              <Grid item xs={12} md={6} lg={4} key={pickList.id}>
                <Card variant="outlined">
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start'
                    }}>
                      <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                        {pickList.name}
                      </Typography>
                      
                      <IconButton 
                        size="small"
                        onClick={(e) => handleOpenActionMenu(e, pickList.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Created: {formatDate(pickList.created_at)}
                      </Typography>
                      {getStatusChip(pickList.status)}
                    </Box>
                    
                    {pickList.description && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mt: 1,
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {pickList.description}
                      </Typography>
                    )}
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          POS Orders
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {pickList.pos_count}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          By
                        </Typography>
                        <Typography variant="body2" noWrap>
                          {pickList.created_by_name || pickList.created_by_username}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Order Date
                        </Typography>
                        <Typography variant="body2">
                          {pickList.order_date ? formatDate(pickList.order_date) : 'Not ordered'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<ViewIcon />}
                      onClick={() => handleOpenDetails(pickList.id)}
                    >
                      Details
                    </Button>
                    
                    <Button 
                      size="small" 
                      startIcon={<PrintIcon />}
                    >
                      Print
                    </Button>
                    
                    {pickList.status === 'draft' && selectedPickListId !== pickList.id && (
                      <Button 
                        size="small" 
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => handleOpenStatusDialog(pickList)}
                      >
                        Confirm
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <CartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Pick Lists Found
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              {searchTerm 
                ? 'No pick lists match your search. Try different keywords.'
                : 'No pick lists found.'}
            </Typography>
            
            {searchTerm && (
              <Button 
                variant="outlined" 
                onClick={() => setSearchTerm('')}
                sx={{ mt: 2 }}
              >
                Clear Search
              </Button>
            )}
          </Paper>
        )}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
      >
        <MenuItem onClick={() => {
          handleOpenDetails(selectedPickListId);
          handleCloseActionMenu();
        }}>
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
        
        <Divider />
        
        <MenuItem onClick={() => {
          const pickList = pickLists.find(pl => pl.id === selectedPickListId);
          if (pickList) {
            handleOpenStatusDialog(pickList);
          }
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Status</ListItemText>
        </MenuItem>
      </Menu>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Pick List Details
            </Typography>
            <IconButton edge="end" color="inherit" onClick={() => setDetailsDialogOpen(false)} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {pickListDetails ? (
            <>
              {/* Header */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6">
                      {pickListDetails.header.name}
                    </Typography>
                    
                    {pickListDetails.header.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {pickListDetails.header.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2">
                        Status: {getStatusChip(pickListDetails.header.status)}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      height: '100%', 
                      justifyContent: 'space-between'
                    }}>
                      <Box>
                        <Typography variant="body2">
                          Created: {formatDate(pickListDetails.header.created_at)}
                        </Typography>
                        <Typography variant="body2">
                          By: {pickListDetails.header.created_by_name || pickListDetails.header.created_by_username}
                        </Typography>
                        {pickListDetails.header.order_date && (
                          <Typography variant="body2">
                            Order Date: {formatDate(pickListDetails.header.order_date)}
                          </Typography>
                        )}
                        {pickListDetails.header.expected_delivery_date && (
                          <Typography variant="body2">
                            Expected Delivery: {formatDate(pickListDetails.header.expected_delivery_date)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Associated POS Orders */}
              <Typography variant="h6" gutterBottom>
                Associated POS Orders
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>POS Name</TableCell>
                      <TableCell>Activity Type</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pickListDetails.orders.map((order) => (
                      <TableRow key={order.pos_order_id} hover>
                        <TableCell>{order.pos_name}</TableCell>
                        <TableCell>{order.tipo_attivita_desc}</TableCell>
                        <TableCell>
                          {getStatusChip(order.stato)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Materials */}
              <Typography variant="h6" gutterBottom>
                Materials
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Article Code</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pickListDetails.details.length > 0 ? (
                      pickListDetails.details.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.supplier_name || 'N/A'}</TableCell>
                          <TableCell>{item.article_code || '-'}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell>{item.unit_of_measure}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.total_price)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No materials found.
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Total row */}
                    {pickListDetails.details.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={5} />
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          Total:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(
                            pickListDetails.details.reduce(
                              (sum, item) => sum + (item.total_price || 0), 
                              0
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Loading pick list details...
            </Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            startIcon={<PrintIcon />} 
            variant="outlined"
          >
            Print
          </Button>
          <Button 
            startIcon={<DownloadIcon />} 
            variant="outlined"
          >
            Export
          </Button>
          <Button 
            onClick={() => setDetailsDialogOpen(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Change Pick List Status
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="subtitle1" gutterBottom>
            Select a new status for "{selectedPickList?.name}"
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => handleStatusChange('draft')}
                startIcon={<EditIcon />}
                disabled={selectedPickList?.status === 'draft'}
                sx={{ height: '100%', py: 2 }}
              >
                Draft
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={() => handleStatusChange('confirmed')}
                startIcon={<CheckIcon />}
                disabled={selectedPickList?.status === 'confirmed'}
                sx={{ height: '100%', py: 2 }}
              >
                Confirmed
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                color="info"
                fullWidth
                onClick={() => handleStatusChange('ordered')}
                startIcon={<SendIcon />}
                disabled={selectedPickList?.status === 'ordered'}
                sx={{ height: '100%', py: 2 }}
              >
                Ordered
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                onClick={() => handleStatusChange('partially_received')}
                startIcon={<CartIcon />}
                disabled={selectedPickList?.status === 'partially_received'}
                sx={{ height: '100%', py: 2 }}
              >
                Partially Received
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                color="success"
                fullWidth
                onClick={() => handleStatusChange('completed')}
                startIcon={<CheckIcon />}
                disabled={selectedPickList?.status === 'completed'}
                sx={{ height: '100%', py: 2 }}
              >
                Completed
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => handleStatusChange('cancelled')}
                startIcon={<DeleteIcon />}
                disabled={selectedPickList?.status === 'cancelled'}
                sx={{ height: '100%', py: 2 }}
              >
                Cancelled
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PickListPanel;
