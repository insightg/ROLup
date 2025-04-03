// src/components/common/StatusBadge.tsx
import React, { useEffect, useState } from 'react';
import { Chip, CircularProgress } from '@mui/material';
import { fetchStatiAvanzamento } from '../../api/posApi';
import { 
  CheckCircle,
  AccessTime as Clock, 
  Warning as AlertCircle,
  Block as BlockIcon,
  HourglassEmpty as WaitingIcon,
  Assignment as AssignedIcon,
  Error as ErrorIcon,
  MoreHoriz as MoreIcon,
  NewReleases as NewIcon,
  LocalShipping as ShippingIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import type { SvgIconProps } from '@mui/material';

export type StatusType = 'order' | 'task' | 'subtask';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  isIgnored?: boolean;
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

// Stato globale per memorizzare gli stati caricati e ridurre le chiamate API
let cachedStati: StatoAvanzamento[] | null = null;
let isLoadingGlobal = false;
let loadPromise: Promise<StatoAvanzamento[]> | null = null;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  type = 'order',
  isIgnored = false 
}) => {
  const [stati, setStati] = useState<StatoAvanzamento[]>(cachedStati || []);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedStati);

  // Carica gli stati dalla tabella tsis_stati_avanzamento
  useEffect(() => {
    // Se gli stati sono già in cache, non fare nulla
    if (cachedStati) {
      return;
    }

    const loadStati = async () => {
      // Se c'è già un caricamento in corso, attendi quel risultato
      if (isLoadingGlobal && loadPromise) {
          const result = await loadPromise;
          setStati(result);
          setIsLoading(false);
        return;
      }

      // Altrimenti inizia un nuovo caricamento
      isLoadingGlobal = true;
      loadPromise = fetchStatiAvanzamento()
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          cachedStati = result.data;
          setStati(result.data);
          return result.data;
        } else {
          return [];
        }
      })
      .finally(() => {
        isLoadingGlobal = false;
        setIsLoading(false);
      });

        await loadPromise;
    };

    loadStati();
  }, []);

  // Durante il caricamento, mostra un indicatore di caricamento
  if (isLoading) {
    return (
      <Chip
        icon={<CircularProgress size={16} />}
        label="Caricamento..."
        size="small"
        sx={{ 
          backgroundColor: '#f5f5f5',
          color: '#757575'
        }}
      />
    );
  }

  // Se il subtask è ignorato (exclude_from_completion è true)
  if (type === 'subtask' && isIgnored) {
    return (
      <Chip
        icon={<BlockIcon fontSize="small" />}
        label="Non Attivo"
        sx={{
          color: '#9e9e9e',
          backgroundColor: '#f5f5f5',
          '& .MuiChip-icon': { color: '#9e9e9e' }
        }}
        size="small"
      />
    );
  }

  // Determina lo stato normalizzato
  const normalizedStatus = getNormalizedStatus(status);
  
  
  // Cerca lo stato corrispondente nel database
  const statoDb = stati.find(s => 
    s.codice.toLowerCase() === normalizedStatus.toLowerCase() && 
    s.tipo === type && 
    s.attivo
  );

  // Se troviamo lo stato nel database, lo usiamo
  if (statoDb) {
    return (
      <Chip
        icon={getIconFromName(statoDb.icona)}
        label={statoDb.descrizione}
        sx={{
          color: statoDb.colore || '#424242',
          backgroundColor: getLightColorFromHex(statoDb.colore || '#424242'),
          '& .MuiChip-icon': { color: statoDb.colore || '#424242' }
        }}
        size="small"
      />
    );
  }

  // Per task e subtask, se lo stato non è 'completato' o 'in_lavorazione',
  // utilizziamo 'in_lavorazione' come fallback predefinito
  if ((type === 'task' || type === 'subtask') && 
      normalizedStatus !== 'completato' && 
      normalizedStatus !== 'in_lavorazione') {
    
    const fallbackState = 'in_lavorazione';
    const fallbackDb = stati.find(s => 
      s.codice === fallbackState && 
      s.tipo === type && 
      s.attivo
    );
    
    if (fallbackDb) {
      return (
        <Chip
          icon={getIconFromName(fallbackDb.icona)}
          label={fallbackDb.descrizione}
          sx={{
            color: fallbackDb.colore || '#424242',
            backgroundColor: getLightColorFromHex(fallbackDb.colore || '#424242'),
            '& .MuiChip-icon': { color: fallbackDb.colore || '#424242' }
          }}
          size="small"
        />
      );
    }
  }

  // Stato di fallback se non troviamo nulla nel database
  return (
    <Chip
      icon={<MoreIcon fontSize="small" />}
      label={getNiceStatusLabel(normalizedStatus)}
      sx={{
        color: '#424242',
        backgroundColor: '#f5f5f5',
        '& .MuiChip-icon': { color: '#424242' }
      }}
      size="small"
    />
  );
};

// Funzione per convertire un colore in versione più chiara per lo sfondo
const getLightColorFromHex = (hexColor: string): string => {
  try {
    // Rimuovi il # se presente
    const hex = hexColor.replace('#', '');
    
    // Converti in RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calcola una versione più chiara (mischiando con il bianco)
    const lightR = Math.floor(r * 0.2 + 255 * 0.8);
    const lightG = Math.floor(g * 0.2 + 255 * 0.8);
    const lightB = Math.floor(b * 0.2 + 255 * 0.8);
    
    // Converti di nuovo in esadecimale
    return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
  } catch (e) {
    return '#f5f5f5'; // Fallback a grigio chiaro in caso di errore
  }
};

// Funzione per ottenere l'icona in base al nome
const getIconFromName = (iconName: string | null): React.ReactElement<SvgIconProps> => {
  if (!iconName) return <MoreIcon fontSize="small" />;

  switch (iconName.toLowerCase()) {
    case 'checkcircle':
      return <CheckCircle fontSize="small" />;
    case 'clock':
      return <Clock fontSize="small" />;
    case 'alertcircle':
      return <AlertCircle fontSize="small" />;
    case 'blockicon':
      return <BlockIcon fontSize="small" />;
    case 'waitingicon':
      return <WaitingIcon fontSize="small" />;
    case 'assignedicon':
      return <AssignedIcon fontSize="small" />;
    case 'erroricon':
      return <ErrorIcon fontSize="small" />;
    case 'moreicon':
      return <MoreIcon fontSize="small" />;
    case 'newicon':
      return <NewIcon fontSize="small" />;
    case 'shippingicon':
      return <ShippingIcon fontSize="small" />;
    case 'pauseicon':
      return <PauseIcon fontSize="small" />;
    case 'cancelicon':
      return <CancelIcon fontSize="small" />;
    case 'doneallicon':
      return <DoneAllIcon fontSize="small" />;
    default:
      // Se il nome non corrisponde a nessuna icona nota, prova a usare 
      // il nome stesso come indicazione
      if (iconName.includes('complete') || iconName.includes('done')) {
        return <CheckCircle fontSize="small" />;
      }
      if (iconName.includes('wait') || iconName.includes('pending')) {
        return <WaitingIcon fontSize="small" />;
      }
      if (iconName.includes('assign')) {
        return <AssignedIcon fontSize="small" />;
      }
      if (iconName.includes('cancel') || iconName.includes('block')) {
        return <BlockIcon fontSize="small" />;
      }
      if (iconName.includes('work') || iconName.includes('progress')) {
        return <Clock fontSize="small" />;
      }
      return <MoreIcon fontSize="small" />;
  }
};

// Funzione per normalizzare gli stati in un formato standard
const getNormalizedStatus = (status: string): string => {
  const statusLower = status?.toLowerCase() || '';
  return statusLower || 'sconosciuto';
};

// Funzione per ottenere un'etichetta più leggibile per lo stato
const getNiceStatusLabel = (status: string): string => {
  // Capita prima lettera e sostituzione degli underscore con spazi
  return status.charAt(0).toUpperCase() + 
         status.slice(1).replace(/_/g, ' ');
};
