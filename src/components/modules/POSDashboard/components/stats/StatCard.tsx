import React from 'react';
import { Paper, Stack, Box, Typography } from '@mui/material';
import type { SvgIconProps } from '@mui/material';

interface StatCardProps {
  icon: React.ReactElement<SvgIconProps>;
  value: number;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
  <Paper elevation={1} sx={{ p: 2 }}>
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ color: 'primary.main' }}>
        {React.cloneElement(icon, { 
          fontSize: 'large',
          style: { fontSize: 40 } 
        })}
      </Box>
      <Box>
        <Typography variant="h4" component="div">{value}</Typography>
        <Typography color="text.secondary">{label}</Typography>
      </Box>
    </Stack>
  </Paper>
);
