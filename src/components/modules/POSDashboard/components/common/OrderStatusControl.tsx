// src/components/common/OrderStatusControl.tsx
import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  Tooltip
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { StatusBadge } from './StatusBadge';
import { StatusSelect } from './StatusSelect';

interface OrderStatusControlProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => Promise<void>;
}

export const OrderStatusControl: React.FC<OrderStatusControlProps> = ({
  currentStatus,
  onStatusChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setIsEditing(true);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      handleClose();
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsUpdating(false);
      handleClose();
    }
  };

  return (
    <Box>
      <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center' }}>
        <StatusBadge status={currentStatus} type="order" />
        <Tooltip title="Modifica stato">
          <IconButton size="small" onClick={handleClick} sx={{ ml: 0.5 }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={isEditing}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <MenuItem sx={{ minWidth: 200, pointerEvents: isUpdating ? 'none' : 'auto' }}>
          <StatusSelect
            value={currentStatus}
            onChange={handleStatusChange}
            type="order"
            disabled={isUpdating}
            fullWidth
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};
