// src/components/modules/ChatBot/components/common/TypingIndicator.jsx
import React from 'react';
import { Box, Paper, useTheme } from '@mui/material';

/**
 * Componente che mostra l'indicatore di digitazione animato
 */
const TypingIndicator = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        mb: 2
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '8px 8px 0 0',
            borderColor: `${theme.palette.background.paper} transparent transparent transparent`,
            left: '-8px',
            top: 10
          }
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: theme.palette.primary.main,
                animation: 'typing-animation 1s infinite',
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </Box>
      </Paper>
      <style jsx>{`
        @keyframes typing-animation {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </Box>
  );
};

export default TypingIndicator;
