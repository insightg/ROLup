// src/components/form/CustomFields.tsx
import {
  Box,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Paper,
  Divider
} from '@mui/material';
import type { Field } from '../../types/dashboard';

interface CustomFieldsProps {
  fields: Field[];
  onChange?: (fields: Field[]) => void;
  readOnly?: boolean;
}

export const CustomFields: React.FC<CustomFieldsProps> = ({
  fields,
  onChange,
  readOnly = false
}) => {
  if (!fields.length) return null;

  const handleFieldChange = (index: number, updatedField: Field) => {
    if (onChange) {
      const newFields = [...fields];
      newFields[index] = updatedField;
      onChange(newFields);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
        Campi personalizzati
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={3}>
        {fields.map((field, index) => (
          <Box key={index}>
            {readOnly ? (
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                  {field.label}:
                </Typography>
                {field.type === 'checkbox' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox 
                      checked={field.value === '1'} 
                      disabled 
                      size="small"
                      sx={{ ml: -1, mr: 1 }}
                    />
                    <Typography variant="body2">
                      {field.value === '1' ? 'Sì' : 'No'}
                    </Typography>
                  </Box>
                ) : (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'background.paper',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: field.value ? 'normal' : 'light' }}>
                      {field.value || '-'}
                    </Typography>
                  </Paper>
                )}
              </Stack>
            ) : (
              <FormControl fullWidth variant="outlined" size="small">
                {field.type === 'checkbox' ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value === '1'}
                        onChange={(e) => handleFieldChange(index, {
                          ...field,
                          value: e.target.checked ? '1' : '0'
                        })}
                      />
                    }
                    label={field.label}
                  />
                ) : field.type === 'listbox' && field.options ? (
                  <>
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                      value={field.value}
                      label={field.label}
                      onChange={(e) => handleFieldChange(index, {
                        ...field,
                        value: e.target.value
                      })}
                    >
                      {field.options.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : (
                  <TextField
                    type={field.type === 'date' ? 'date' : 'text'}
                    value={field.value}
                    label={field.label}
                    variant="outlined"
                    fullWidth
                    onChange={(e) => handleFieldChange(index, {
                      ...field,
                      value: e.target.value
                    })}
                  />
                )}
              </FormControl>
            )}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};
