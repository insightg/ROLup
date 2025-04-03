// src/components/common/ProgressBar.tsx
import { Box, LinearProgress, Typography } from '@mui/material';

interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: '180px' }}>
    <Box sx={{ width: '100%', mr: 1 }}>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          height: 8, 
          borderRadius: 4,
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            backgroundColor: progress < 30 ? 'warning.main' : 
                             progress < 70 ? 'info.main' : 
                             'success.main'
          }
        }} 
      />
    </Box>
    <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ width: '40px', textAlign: 'right' }}>
      {progress}%
    </Typography>
  </Box>
);
