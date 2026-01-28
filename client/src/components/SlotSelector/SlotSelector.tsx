import { useMemo, ReactNode } from 'react';
import { FormControl, TextField, Autocomplete } from '@mui/material';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { SlotSelectorLabel } from './SlotSelector.styles';

export interface SlotSelectorProps {
  value: string | null;
  onChange: (slot: string | null) => void;
  warehouse: Warehouse | null;
  storageLocations: StorageLocation[];
  label?: string;
  placeholder?: string;
  disabledPlaceholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  required?: boolean;
  children?: ReactNode;
}

export function SlotSelector({
  value,
  onChange,
  warehouse,
  storageLocations,
  label = 'Slot',
  placeholder = 'Select slot',
  disabledPlaceholder = 'Select warehouse first',
  disabled = false,
  fullWidth = true,
  required = false,
  children,
}: SlotSelectorProps) {
  // Filter locations by warehouse
  const warehouseLocations = useMemo(() => {
    return warehouse
      ? storageLocations.filter((loc) => loc.warehouse_id === warehouse.id)
      : [];
  }, [warehouse, storageLocations]);

  // Get deduplicated slots for selected warehouse
  const availableSlots = useMemo(() => {
    if (!warehouse) return [];

    const slotSet = new Set<string>();
    warehouseLocations.forEach((loc) => {
      if (loc.slot && loc.slot.trim() !== '') {
        slotSet.add(loc.slot);
      }
    });

    return Array.from(slotSet).sort();
  }, [warehouse, warehouseLocations]);

  const isDisabled = disabled || !warehouse;

  return (
    <FormControl fullWidth={fullWidth} disabled={isDisabled}>
      <SlotSelectorLabel htmlFor="slot-select" required={required}>
        {label}
      </SlotSelectorLabel>
      <Autocomplete
        id="slot-select"
        options={availableSlots}
        getOptionLabel={(option) => option}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        disabled={isDisabled}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={isDisabled ? disabledPlaceholder : placeholder}
          />
        )}
        noOptionsText="No slots available"
      />
      {children}
    </FormControl>
  );
}
