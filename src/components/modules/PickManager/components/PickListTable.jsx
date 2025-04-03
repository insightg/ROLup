import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
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
  Tooltip,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { usePickStore } from '../stores/pickStore';
import { fetchPickListDetails, updatePickListStatus, deletePickList } from '../api/pickApi';

const PickListTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLists, setFilteredLists] = useState([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPickList, setSelectedPickList] = useState(null);
  const [pickListDetails, setPickListDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedPickListId, setSelectedPickListId] = useState(null);
  
  const { pickLists, loadPickLists, refreshData } = usePickStore();

  // Load pick lists
  useEffect(() => {
    console.log('PickListTable: Loading pick lists...');
    if (loadPickLists) {
      loadPickLists();
    } else {
      console.error('loadPickLists function is not defined');
    }
  }, [loadPickLists]);

  // Filter pick lists
  useEffect(() => {
    if (!pickLists) return;
    
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
      const response = await fetchPickListDetails(pickListId);
      if (response.success) {
        setPickListDetails(response);
        setEditedItems([...response.items]);
        setDetailsDialogOpen(true);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error fetching pick list details:', error);
    }
  };

  // Handle item field change
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' ? Number(value) : value
    };
    setEditedItems(updatedItems);
  };

  // Save edited items
  const handleSaveChanges = async () => {
    try {
      // TODO: Call API to save changes
      console.log('Saving changes:', editedItems);
      setIsEditing(false);
      // Refresh data after save
      refreshData();
    } catch (error) {
      console.error('Error saving changes:', error);
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

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      const response = await updatePickListStatus(selectedPickList.id, newStatus);
      if (response.success) {
        refreshData();
        setStatusDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      console.log('Attempting to delete pick list with ID:', selectedPickListId);
      const response = await deletePickList(selectedPickListId);
      console.log('Delete response:', response);
      if (response.success) {
        refreshData();
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting pick list:', error);
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
    
    switch (status) {
      case 'draft': color = 'default'; break;
      case 'confirmed': color = 'primary'; break;
      case 'ordered': color = 'info'; break;
      case 'partially_received': color = 'warning'; break;
      case 'completed': color = 'success'; break;
      case 'cancelled': color = 'error'; break;
      default: color = 'default';
    }
    
    return (
      <Chip 
        label={status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
        color={color}
        size="small"
      />
    );
  };

  return (
    <>
      <Box sx={{ display: 'flex', mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          <Tooltip title="Refresh">
            <IconButton onClick={refreshData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          color="primary"
          onClick={() => setEditDialogOpen(true)}
        >
          New Pick List
        </Button>
      </Box>
      
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>POS Orders</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLists.length > 0 ? (
              filteredLists.map((pickList) => (
                <TableRow key={pickList.id} hover>
                  <TableCell>{pickList.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {pickList.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(pickList.status)}</TableCell>
                  <TableCell>{formatDate(pickList.created_at)}</TableCell>
                  <TableCell>
                    {pickList.created_by_name || pickList.created_by_username}
                  </TableCell>
                  <TableCell>{pickList.pos_count}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small"
                      onClick={(e) => handleOpenActionMenu(e, pickList.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm 
                      ? 'No pick lists match your search'
                      : 'No pick lists found'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
        
        <MenuItem onClick={() => {
          setEditDialogOpen(true);
          handleCloseActionMenu();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          setDeleteDialogOpen(true);
          handleCloseActionMenu();
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => {
          const pickList = pickLists.find(pl => pl.id === selectedPickListId);
          if (pickList) {
            setSelectedPickList(pickList);
            setStatusDialogOpen(true);
          }
          handleCloseActionMenu();
        }}>
          <ListItemIcon>
            <CheckIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Status</ListItemText>
        </MenuItem>
      </Menu>

      {/* Details Dialog - Enhanced to match PickListPreview */}
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
            <Box>
              {isEditing ? (
                <>
                  <Button 
                    variant="outlined" 
                    color="secondary"
                    onClick={() => setIsEditing(false)}
                    sx={{ mr: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleSaveChanges}
                    startIcon={<SaveIcon />}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => setIsEditing(true)}
                  startIcon={<EditIcon />}
                >
                  Edit
                </Button>
              )}
              <IconButton edge="end" color="inherit" onClick={() => setDetailsDialogOpen(false)} sx={{ ml: 1 }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {pickListDetails ? (
            <>
              {/* Header with summary */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={9}>
                    <Typography variant="h6" gutterBottom>
                      {pickListDetails.name}
                    </Typography>
                    <Typography variant="body2">
                      Status: <strong>{pickListDetails.status}</strong> | 
                      Created: <strong>{new Date(pickListDetails.created_at).toLocaleString()}</strong> | 
                      By: <strong>{pickListDetails.created_by_name || pickListDetails.created_by_username}</strong>
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Included Orders:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {pickListDetails.orders?.map(order => (
                          <Chip 
                            key={order.id} 
                            label={`${order.pos_name} - ${order.tipo_attivita_desc}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      height: '100%', 
                      justifyContent: 'space-between'
                    }}>
                      <Box>
                        <Typography variant="subtitle2">
                          Total Items:
                        </Typography>
                        <Typography variant="h5" color="primary.main">
                          {pickListDetails.items?.reduce((sum, item) => sum + Number(item.quantity), 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                        <Button 
                          startIcon={<PrintIcon />}
                          variant="outlined"
                          color="primary"
                        >
                          Print
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Items table grouped by supplier */}
              {pickListDetails.items && pickListDetails.items.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Supplier</TableCell>
                        <TableCell>Material</TableCell>
                        <TableCell>Article Code</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pickListDetails.items.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.supplier_name || 'Unknown'}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            {item.article_code || '-'}
                            {item.is_custom && (
                              <Chip 
                                label="Custom" 
                                size="small" 
                                color="warning" 
                                sx={{ ml: 1 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                              <TextField
                                type="number"
                                value={editedItems[index]?.quantity || 0}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                size="small"
                                sx={{ width: 80 }}
                              />
                            ) : (
                              item.quantity
                            )}
                          </TableCell>
                          <TableCell>{item.unit_of_measure}</TableCell>
                          <TableCell align="right">
                            {item.unit_price ? `€${item.unit_price.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="right">
                            {item.unit_price ? `€${(item.quantity * item.unit_price).toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No items found in this pick list
                </Typography>
              )}
            </>
          ) : (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress sx={{ mr: 2 }} />
              <Typography color="text.secondary">
                Loading pick list details...
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPickListId ? 'Edit Pick List' : 'Create New Pick List'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography>Edit form will go here</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this pick list? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDelete}
          >
            Delete
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {['draft', 'confirmed', 'ordered', 'partially_received', 'completed', 'cancelled'].map(status => (
              <Button
                key={status}
                variant="outlined"
                onClick={() => handleStatusChange(status)}
                disabled={selectedPickList?.status === status}
                sx={{ textTransform: 'capitalize' }}
              >
                {status.replace('_', ' ')}
              </Button>
            ))}
          </Box>
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

export default PickListTable;
