// src/components/modules/ChatBot/components/common/ProfileCard.jsx
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  IconButton, 
  Box, 
  Chip,
  useTheme 
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  PhoneAndroid as MobileIcon
} from '@mui/icons-material';

/**
 * Card per visualizzare un profilo bot
 */
const ProfileCard = ({ 
  profile, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        mb: 2, 
        transition: 'all 0.3s ease',
        boxShadow: isSelected ? 4 : 1,
        border: isSelected ? `2px solid ${theme.palette.primary.main}` : 'none',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" component="div" gutterBottom>
            {profile.name}
          </Typography>
          
          {profile.isMobileDefault && (
            <Chip 
              icon={<MobileIcon />} 
              label="Default Mobile" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          )}
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {profile.definition}
        </Typography>
        
        <Box>
          <Chip 
            label={`${profile.knowledgeBases?.length || 0} basi di conoscenza`} 
            size="small" 
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
      </CardContent>
      
      <CardActions sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton 
          size="small" 
          onClick={() => onSelect(profile.id)}
          color={isSelected ? "primary" : "default"}
          title="Test"
        >
          <PlayIcon />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={() => onEdit(profile.id)}
          color="info"
          title="Modifica"
        >
          <EditIcon />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={() => onDelete(profile.id)}
          color="error"
          title="Elimina"
        >
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default ProfileCard;
