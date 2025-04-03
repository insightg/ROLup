import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 64px)',
        p: 3,
        textAlign: 'center'
      }}
    >
      <Typography variant="h1" sx={{ mb: 2, fontSize: { xs: '6rem', md: '10rem' } }}>
        404
      </Typography>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Pagina non trovata
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
        La pagina che stai cercando non esiste o è stata spostata.
      </Typography>
      <Button component={Link} to="/" variant="contained" size="large">
        Torna alla home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
