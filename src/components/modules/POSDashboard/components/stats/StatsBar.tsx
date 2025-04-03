import React from 'react';
import { Grid, Box, Paper, Stack, Typography, Skeleton } from '@mui/material';
import { Store, CheckCircle, AccessTime as Clock } from '@mui/icons-material';
import { Package } from 'lucide-react';
import type { SvgIconProps } from '@mui/material';
import type { Stats } from '../../types/dashboard';

interface StatCardProps {
  icon: React.ReactElement<SvgIconProps>;
  value: number;
  label: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, isLoading = false }) => (
  <Paper elevation={1} sx={{ p: 2 }}>
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ color: 'primary.main' }}>
        {React.cloneElement(icon, { 
          fontSize: 'large',
          style: { fontSize: 40 } 
        })}
      </Box>
      <Box>
        {isLoading ? (
          <Skeleton variant="text" width={60} height={40} />
        ) : (
          <Typography variant="h4" component="div">{value}</Typography>
        )}
        <Typography color="text.secondary">{label}</Typography>
      </Box>
    </Stack>
  </Paper>
);

interface StatsBarProps {
  stats: Stats;
  isLoading?: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, isLoading = false }) => (
  <Box sx={{ mb: 3 }}>
    <Grid container spacing={2}>
      <Grid item xs={3}>
        <StatCard 
          icon={<Store />}
          value={stats.total_pos_with_orders}
          label="POS Totali"
          isLoading={isLoading}
        />
      </Grid>
      <Grid item xs={3}>
        <StatCard 
          icon={<Package />}
          value={stats.orders_assigned}
          label="Assegnati"
          isLoading={isLoading}
        />
      </Grid>
      <Grid item xs={3}>
        <StatCard 
          icon={<Clock />}
          value={stats.orders_in_progress}
          label="In Lavorazione"
          isLoading={isLoading}
        />
      </Grid>
      <Grid item xs={3}>
        <StatCard 
          icon={<CheckCircle />}
          value={stats.orders_completed}
          label="Completati"
          isLoading={isLoading}
        />
      </Grid>
    </Grid>
  </Box>
);
