// src/components/modules/ChatBot/components/common/Message.jsx
import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Componente per visualizzare un messaggio nella chat
 * 
 * @param {Object} props
 * @param {string} props.message - Testo del messaggio
 * @param {string} props.type - Tipo di messaggio ('user' o 'bot')
 * @param {string} props.timestamp - Timestamp in formato ISO
 */
const Message = ({ message, type, timestamp }) => {
  const theme = useTheme();
  
  // Formatta l'orario
  const formattedTime = timestamp 
    ? format(new Date(timestamp), 'HH:mm', { locale: it })
    : format(new Date(), 'HH:mm', { locale: it });
  
  // Stili in base al tipo di messaggio
  const isUser = type === 'user';
  const backgroundColor = isUser 
    ? theme.palette.primary.light 
    : theme.palette.background.paper;
  const textColor = isUser 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary;
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '75%',
          borderRadius: 2,
          backgroundColor,
          color: textColor,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '8px 8px 0 0',
            borderColor: `${backgroundColor} transparent transparent transparent`,
            transform: isUser ? 'rotate(90deg)' : 'rotate(0deg)',
            right: isUser ? '-8px' : 'auto',
            left: isUser ? 'auto' : '-8px',
            top: 10
          }
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {message}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            textAlign: 'right', 
            mt: 1, 
            color: isUser ? 'rgba(255,255,255,0.7)' : 'text.secondary' 
          }}
        >
          {formattedTime}
        </Typography>
      </Paper>
    </Box>
  );
};

export default Message;
