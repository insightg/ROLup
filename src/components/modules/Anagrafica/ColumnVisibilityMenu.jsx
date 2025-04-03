import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Checkbox,
    FormControlLabel,
    List,
    ListItem,
    Typography,
    Divider,
    IconButton,
    Paper,
    InputBase,
    Tooltip,
    Switch
} from '@mui/material';
import {
    DragIndicator as DragIcon,
    VisibilityOff as HideAllIcon,
    Visibility as ShowAllIcon,
    Search as SearchIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Elemento draggabile per riordinare le colonne
const DraggableColumnItem = ({ column, index, moveColumn, onToggleVisibility }) => {
    const [{ isDragging }, drag, preview] = useDrag({
        type: 'column',
        item: { index },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: 'column',
        hover: (item, monitor) => {
            if (item.index === index) {
                return;
            }
            moveColumn(item.index, index);
            item.index = index;
        },
    });

    return (
        <div
            ref={(node) => drop(preview(node))}
            style={{
                opacity: isDragging ? 0.5 : 1,
                cursor: 'move',
            }}
        >
            <ListItem
                sx={{
                    borderBottom: '1px solid #eee',
                    '&:hover': { backgroundColor: '#f5f5f5' },
                    p: 1
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <div ref={drag}>
                        <DragIcon sx={{ cursor: 'grab', mr: 1, color: 'grey.500' }} />
                    </div>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={column.getIsVisible()}
                                onChange={onToggleVisibility}
                                name={column.id}
                                disabled={column.id === 'selection'}
                            />
                        }
                        label={
                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: column.getIsVisible() ? 'bold' : 'normal',
                                    }}
                                >
                                    {column.columnDef.header || column.id}
                                </Typography>
                                {column.id === 'selection' && (
                                    <Typography variant="caption" color="text.secondary">
                                        (Colonna di sistema)
                                    </Typography>
                                )}
                            </Box>
                        }
                        sx={{ flex: 1 }}
                    />
                </Box>
            </ListItem>
        </div>
    );
};

const ColumnVisibilityMenu = ({ open, onClose, table }) => {
    const [columns, setColumns] = useState(() => table.getAllLeafColumns());
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyVisible, setShowOnlyVisible] = useState(false);

    // Aggiorna le colonne quando il componente si apre
    useEffect(() => {
        if (open) {
            setColumns(table.getAllLeafColumns());
        }
    }, [open, table]);

    // Gestisci lo spostamento delle colonne (riordinamento)
    const moveColumn = (fromIndex, toIndex) => {
        const newColumns = [...columns];
        const [movedColumn] = newColumns.splice(fromIndex, 1);
        newColumns.splice(toIndex, 0, movedColumn);
        setColumns(newColumns);
    };

    // Toggle visibilità di una singola colonna
    const handleToggleColumnVisibility = (columnId) => {
        table.getColumn(columnId)?.toggleVisibility();
    };

    // Mostra tutte le colonne
    const handleShowAllColumns = () => {
        table.toggleAllColumnsVisible(true);
    };

    // Nascondi tutte le colonne eccetto la prima (selezione)
    const handleHideAllColumns = () => {
        const selectionColumn = table.getColumn('selection');
        
        // Nascondi tutte le colonne
        table.toggleAllColumnsVisible(false);
        
        // Mostra solo la colonna di selezione
        if (selectionColumn) {
            selectionColumn.toggleVisibility(true);
        }
    };

    // Applica le modifiche all'ordine delle colonne
    const handleApplyColumnOrder = () => {
        table.setColumnOrder(columns.map(column => column.id));
        onClose();
    };

    // Filtra le colonne in base al termine di ricerca
    const filteredColumns = columns.filter(column => {
        // Filtra in base alla ricerca
        const matchesSearch = searchTerm === '' || 
            (column.columnDef.header && column.columnDef.header.toString().toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Applica il filtro "solo visibili" se attivo
        const matchesVisibility = !showOnlyVisible || column.getIsVisible();
        
        return matchesSearch && matchesVisibility;
    });

    // Numero di colonne visibili
    const visibleCount = columns.filter(col => col.getIsVisible()).length;
    const totalColumns = columns.length;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="h6">Gestione Colonne</Typography>
                <Typography variant="body2" color="text.secondary">
                    {visibleCount} di {totalColumns} colonne visibili
                </Typography>
            </DialogTitle>
            
            <Divider />
            
            <DialogContent sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Trascina per riordinare le colonne. Seleziona o deseleziona le caselle per mostrare o nascondere le colonne.
                </Typography>
                
                <Paper 
                    component="form" 
                    sx={{ 
                        p: '2px 4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2, 
                        mt: 1
                    }}
                >
                    <SearchIcon sx={{ color: 'action.active', ml: 1, mr: 1 }} />
                    <InputBase
                        sx={{ ml: 1, flex: 1 }}
                        placeholder="Cerca colonne..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <IconButton 
                            size="small" 
                            onClick={() => setSearchTerm('')}
                            sx={{ p: '10px' }}
                        >
                            <ClearIcon />
                        </IconButton>
                    )}
                </Paper>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                        <Button
                            size="small"
                            startIcon={<ShowAllIcon />}
                            onClick={handleShowAllColumns}
                            sx={{ mr: 1 }}
                            variant="outlined"
                        >
                            Mostra Tutte
                        </Button>
                        <Button
                            size="small"
                            startIcon={<HideAllIcon />}
                            onClick={handleHideAllColumns}
                            variant="outlined"
                        >
                            Nascondi Tutte
                        </Button>
                    </Box>
                    
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showOnlyVisible}
                                onChange={(e) => setShowOnlyVisible(e.target.checked)}
                                size="small"
                            />
                        }
                        label={
                            <Typography variant="body2">
                                Solo colonne visibili
                            </Typography>
                        }
                    />
                </Box>
                
                <Divider sx={{ my: 1 }} />

                <DndProvider backend={HTML5Backend}>
                    <List sx={{ 
                        maxHeight: '50vh', 
                        overflow: 'auto', 
                        bgcolor: 'background.paper',
                        border: '1px solid #eee',
                        borderRadius: 1
                    }}>
                        {filteredColumns.map((column, index) => (
                            <DraggableColumnItem
                                key={column.id}
                                column={column}
                                index={index}
                                moveColumn={moveColumn}
                                onToggleVisibility={() => handleToggleColumnVisibility(column.id)}
                            />
                        ))}
                        
                        {filteredColumns.length === 0 && (
                            <ListItem>
                                <Typography color="text.secondary" align="center" sx={{ width: '100%', py: 2 }}>
                                    Nessuna colonna trovata con i criteri di ricerca attuali
                                </Typography>
                            </ListItem>
                        )}
                    </List>
                </DndProvider>
            </DialogContent>
            
            <Divider />
            
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Annulla</Button>
                <Button variant="contained" onClick={handleApplyColumnOrder}>
                    Applica
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ColumnVisibilityMenu;