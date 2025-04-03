
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Divider,
  Grid,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const PickListPreviewDialog = ({ open, onClose, pickListData, onSave }) => {
  console.log("PickListPreviewDialog render with open:", open, "and data:", pickListData);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Ensure we can safely access the data
  if (!pickListData && open) {
    console.error("Dialog is open but no data is provided");
  }
  
  // Reset search when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);
  
  // Filter data based on search term
  const filteredData = pickListData && searchTerm && pickListData.data
    ? pickListData.data.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.article_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : pickListData?.data || [];
  
  // Group materials by supplier
  const supplierGroups = filteredData.reduce((groups, item) => {
    const supplierName = item.supplier_name || 'Unknown';
    if (!groups[supplierName]) {
      groups[supplierName] = [];
    }
    groups[supplierName].push(item);
    return groups;
  }, {});

  // Calculate totals
  const calculateTotals = () => {
    if (!pickListData?.data) return { totalItems: 0, totalValue: 0 };
    
    const totalItems = pickListData.data.reduce(
      (sum, item) => sum + Number(item.total_quantity), 
      0
    );
    
    const totalValue = pickListData.data.reduce(
      (sum, item) => sum + (Number(item.total_quantity) * (Number(item.unit_price) || 0)), 
      0
    );
    
    return { totalItems, totalValue };
  };
  
  const { totalItems, totalValue } = calculateTotals();

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };
  
  // Handle save button click with loading state
  const handleSaveClick = () => {
    console.log("Save button clicked");
    if (onSave) {
      setIsLoading(true);
      // Using setTimeout to simulate async operation and ensure UI updates
      setTimeout(() => {
        onSave();
        setIsLoading(false);
      }, 100);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="pick-list-preview-title"
    >
      <DialogTitle id="pick-list-preview-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Pick List Preview
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {pickListData ? (
          <>
            {/* Header with summary */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={9}>
                  <Typography variant="h6" gutterBottom>
                    Pick List Summary
                  </Typography>
                  <Typography variant="body2">
                    Orders: <strong>{pickListData.orders?.length || 0}</strong> | 
                    Materials: <strong>{pickListData.data?.length || 0}</strong> | 
                    Total Items: <strong>{totalItems}</strong>
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Included Orders:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {pickListData.orders?.map(order => (
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
                        Total Value:
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        {formatCurrency(totalValue)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                      <Button 
                        startIcon={<PdfIcon />}
                        variant="outlined"
                        color="primary"
                        sx={{ mr: 1 }}
                      >
                        Export
                      </Button>
                      <Button 
                        startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                        variant="contained"
                        color="primary"
                        onClick={handleSaveClick}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : 'Save'}
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Search box */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Box>
            
            {/* Materials table grouped by supplier */}
            {Object.keys(supplierGroups).length > 0 ? (
              Object.entries(supplierGroups).map(([supplierName, items]) => (
                <Box key={supplierName} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {supplierName}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width="15%">Article Code</TableCell>
                          <TableCell width="40%">Description</TableCell>
                          <TableCell width="10%" align="center">Quantity</TableCell>
                          <TableCell width="10%">Unit</TableCell>
                          <TableCell width="15%" align="right">Unit Price</TableCell>
                          <TableCell width="15%" align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index} hover>
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
                            <TableCell>{item.description}</TableCell>
                            <TableCell align="center">{item.total_quantity}</TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            <TableCell align="right">
                              {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                            </TableCell>
                            <TableCell align="right">
                              {item.unit_price 
                                ? formatCurrency(item.total_quantity * item.unit_price) 
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Supplier subtotal */}
                        <TableRow>
                          <TableCell colSpan={4} />
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            Subtotal:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(
                              items.reduce((sum, item) => 
                                sum + (item.total_quantity * (item.unit_price || 0)), 0)
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No materials found matching your search.
              </Typography>
            )}
          </>
        ) : (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography color="text.secondary">
              Loading pick list data...
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {pickListData && (
          <Button 
            onClick={handleSaveClick}
            startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
            variant="contained"
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Pick List'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PickListPreviewDialog;