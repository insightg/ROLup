// src/components/common/StatusSelect.tsx
import React, { useEffect, useState } from 'react';
import { fetchStatiAvanzamento } from '../../api/posApi';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  CircularProgress,
  Box,
  Typography,
  SelectChangeEvent
} from '@mui/material';
import { StatusBadge } from './StatusBadge';

export type StatusType = 'order' | 'task' | 'subtask';

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  type: StatusType;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

// Interfaccia per i dati dello stato provenienti dalla tabella
interface StatoAvanzamento {
  id: number;
  codice: string;
  descrizione: string;
  tipo: StatusType;
  ordine: number;
  colore: string | null;
  icona: string | null;
  attivo: boolean;
}

// Utilizza la stessa cache del componente StatusBadge
let cachedStati: StatoAvanzamento[] | null = null;
let loadPromise: Promise<StatoAvanzamento[]> | null = null;

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  type,
  label = 'Stato',
  disabled = false,
  required = false,
  fullWidth = true,
  size = 'small'
}) => {
  const [stati, setStati] = useState<StatoAvanzamento[]>(cachedStati || []);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedStati);

  // Carica gli stati dal database se non sono già in cache
  useEffect(() => {
    // Se gli stati sono già in cache, non fare nulla
    if (cachedStati) {
      return;
    }

    const loadStati = async () => {
      // Se c'è già un caricamento in corso, attendi quel risultato
      if (loadPromise) {
        try {
          const result = await loadPromise;
          setStati(result);
          setIsLoading(false);
        } catch (error) {
          console.error("Errore durante l'attesa del caricamento:", error);
          setIsLoading(false);
        }
        return;
      }

      // Altrimenti inizia un nuovo caricamento
      loadPromise = fetchStatiAvanzamento()
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          cachedStati = result.data;
          setStati(result.data);
          return result.data;
        } else {
          console.error("Formato dati non valido:", result);
          return [];
        }
      })
      .catch(error => {
        console.error("Errore nel recupero degli stati:", error);
        return [];
      })
      .finally(() => {
        setIsLoading(false);
      });

      try {
        await loadPromise;
      } catch (error) {
        console.error("Errore nel caricamento degli stati:", error);
      }
    };

    loadStati();
  }, []);

  // Filtra gli stati per il tipo corrente
  const statiFiltered = stati.filter(s => s.tipo === type && s.attivo);

  // Handler per il cambio di selezione
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl fullWidth={fullWidth} size={size} disabled={disabled || isLoading} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ''}
        label={label}
        onChange={handleChange}
        renderValue={(selected) => (
          <StatusBadge status={selected} type={type} />
        )}
      >
        {isLoading ? (
          <MenuItem disabled>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={20} />
              <Typography>Caricamento stati...</Typography>
            </Box>
          </MenuItem>
        ) : statiFiltered.length > 0 ? (
          statiFiltered.map((stato) => (
            <MenuItem key={stato.id} value={stato.codice}>
              <StatusBadge status={stato.codice} type={type} />
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography color="error">Nessuno stato disponibile</Typography>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
};
