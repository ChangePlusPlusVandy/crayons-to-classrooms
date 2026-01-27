import { useEffect, useState } from 'react';
import { FormControl, TextField, Autocomplete, FormHelperText } from '@mui/material';
import { getWarehouses } from '../../api/moveItem';
import { Warehouse } from '../../types/Warehouse';
import { WarehouseSelectorLabel } from './WarehouseSelector.styles';

export interface WarehouseSelectorProps {
  value: Warehouse | null;
  onChange: (warehouse: Warehouse | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  onError?: (error: string) => void;
  fullWidth?: boolean;
  required?: boolean;
}

export function WarehouseSelector({
  value,
  onChange,
  label = 'Warehouse',
  placeholder = 'Select warehouse',
  disabled = false,
  onError,
  fullWidth = true,
  required = false,
}: WarehouseSelectorProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchWarehouses() {
      try {
        setLoading(true);
        setError('');
        const data = await getWarehouses();
        setWarehouses(data);
      } catch (err) {
        const errorMessage = 'Failed to load warehouses';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchWarehouses();
    // eslint-disable-next-line -- onError is excluded from dependency array bc fetch should only be ran on mount
  }, []);

  return (
    <FormControl fullWidth={fullWidth} error={!!error}>
      <WarehouseSelectorLabel htmlFor="warehouse-select" required={required}>
        {label}
      </WarehouseSelectorLabel>
      <Autocomplete
        id="warehouse-select"
        options={warehouses}
        getOptionLabel={(option) => option.name || 'Unknown Warehouse'}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        loading={loading}
        disabled={disabled || loading}
        renderInput={(params) => (
          <TextField {...params} placeholder={placeholder} error={!!error} />
        )}
        noOptionsText={
          loading ? 'Loading...' : error ? 'Error loading warehouses' : 'No warehouses available'
        }
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </FormControl>
  );
}
