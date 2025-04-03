import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Drawer,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  UploadFile as UploadIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon
} from '@mui/icons-material';
import { fetchDocuments } from '../api/pmApi';

const DocumentsPanel = ({ posId, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica i documenti al montaggio del componente
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetchDocuments(posId);
        
        if (response.success) {
          setDocuments(response.data || []);
        } else {
          setError(response.error || 'Errore nel caricamento dei documenti');
        }
      } catch (error) {
        console.error('Error loading documents:', error);
        setError('Errore nella comunicazione con il server');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDocuments();
  }, [posId]);

  // Funzione per determinare l'icona in base al tipo di file
  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon color="primary" />;
      case 'doc':
      case 'docx':
        return <DocIcon color="primary" />;
      default:
        return <FileIcon />;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={true}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Documenti</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          sx={{ mb: 2 }}
        >
          Carica Documento
        </Button>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : documents.length === 0 ? (
          <Typography sx={{ p: 2, textAlign: 'center' }}>
            Nessun documento disponibile
          </Typography>
        ) : (
          <List>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="download">
                    <DownloadIcon />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  {getFileIcon(doc.filename)}
                </ListItemIcon>
                <ListItemText
                  primary={doc.filename}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {doc.description || 'Nessuna descrizione'}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default DocumentsPanel;

