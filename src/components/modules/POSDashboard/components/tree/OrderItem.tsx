import { Card, CardContent, Stack, Typography } from '@mui/material';
import { Package } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import type { Order } from '../../types/dashboard';

interface OrderItemProps {
  order: Order;
  onClick: () => void;
  isSelected: boolean;
}

export const OrderItem: React.FC<OrderItemProps> = ({
  order,
  onClick,
  isSelected
}) => (
  <Card 
    elevation={isSelected ? 3 : 1}
    sx={{ 
      mb: 1,
      cursor: 'pointer',
      backgroundColor: isSelected ? 'action.selected' : 'background.paper',
      '&:hover': {
        backgroundColor: 'action.hover',
      }
    }}
    onClick={onClick}
  >
    <CardContent>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Package size={20} />
          <Typography variant="subtitle2">{order.title}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <StatusBadge status={order.stato} />
          <Typography variant="caption" color="text.secondary">
            {order.tasks.length} {order.tasks.length === 1 ? 'task' : 'tasks'}
          </Typography>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

