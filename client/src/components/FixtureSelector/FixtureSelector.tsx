import { useMemo, useEffect } from 'react';
import { FormControl, TextField, Autocomplete } from '@mui/material';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { FixtureSelectorLabel } from './FixtureSelector.styles';

export interface FixtureSelectorProps {
  value: string | null;
  onChange: (fixture: string | null) => void;
  slot: string | null;
  warehouse: Warehouse | null;
  storageLocations: StorageLocation[];
  nullFixtureLabel?: string;
  autoSelectNull?: boolean;
  label?: string;
  placeholder?: string;
  disabledPlaceholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  required?: boolean;
}

export function FixtureSelector({
  value,
  onChange,
  slot,
  warehouse,
  storageLocations,
  nullFixtureLabel = 'None',
  autoSelectNull = false,
  label = 'Fixture',
  placeholder = 'Select fixture',
  disabledPlaceholder = 'Select slot first',
  disabled = false,
  fullWidth = true,
  required = false,
}: FixtureSelectorProps) {
  // Filter locations by warehouse
  const warehouseLocations = useMemo(() => {
    return warehouse
      ? storageLocations.filter((loc) => loc.warehouse_id === warehouse.id)
      : [];
  }, [warehouse, storageLocations]);

  // Get fixtures for selected slot
  const availableFixtures = useMemo(() => {
    if (!slot) return [];

    const fixtureSet = new Set<string>();
    let hasNullFixture = false;

    warehouseLocations
      .filter((loc) => loc.slot === slot)
      .forEach((loc) => {
        if (loc.fixture && loc.fixture.trim() !== '') {
          fixtureSet.add(loc.fixture);
        } else {
          hasNullFixture = true;
        }
      });

    const fixtures = Array.from(fixtureSet).sort();

    // Add null fixture option at the beginning if there are locations with null/empty fixtures
    if (hasNullFixture) {
      fixtures.unshift(nullFixtureLabel);
    }

    return fixtures;
  }, [slot, warehouseLocations, nullFixtureLabel]);

  // Auto-select null fixture option when available
  useEffect(() => {
    if (value == null && autoSelectNull && availableFixtures.includes(nullFixtureLabel)) {
      onChange(nullFixtureLabel);
    }
  }, [autoSelectNull, availableFixtures, nullFixtureLabel, onChange, value]);

  const isDisabled = disabled || !slot;

  return (
    <FormControl fullWidth={fullWidth} disabled={isDisabled}>
      <FixtureSelectorLabel htmlFor="fixture-select" required={required}>
        {label}
      </FixtureSelectorLabel>
      <Autocomplete
        id="fixture-select"
        options={availableFixtures}
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
        noOptionsText="No fixtures available"
      />
    </FormControl>
  );
}
