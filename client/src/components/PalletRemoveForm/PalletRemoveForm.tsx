import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Autocomplete,
  Stack,
  FormControl,
  Typography,
} from '@mui/material';
import { getStorageLocations, getItemsByLocation, groupItemsByLocation } from '../../api/moveItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { ItemGroup } from '../../types/Item';
import { RemoveItemFormLabel } from '../../pages/TestPage/RemoveItemPage.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';

export interface PalletRemoveFormData {
  warehouse: Warehouse;
  sourceSlotId: string;
  removalAction: 'DONATED' | 'DISCARD';
  notes: string;
}

interface PalletRemoveFormProps {
  initialWarehouse?: Warehouse | null;
  onSubmit: (data: PalletRemoveFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const removalActionOptions = [
  { value: 'DONATED' as const, label: 'Donate' },
  { value: 'DISCARD' as const, label: 'Delete (Defective)' },
];

export default function PalletRemoveForm({
  initialWarehouse = null,
  onSubmit,
  onCancel,
  submitLabel,
}: PalletRemoveFormProps) {
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedSourceSlot, setSelectedSourceSlot] = useState<StorageLocation | null>(null);
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [removalAction, setRemovalAction] = useState<'DONATED' | 'DISCARD'>('DONATED');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const locationsData = await getStorageLocations();
        setStorageLocations(locationsData);
      } catch {
        setError('Failed to load initial data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  const warehouseLocations = useMemo(() => {
    return selectedWarehouse
      ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
      : [];
  }, [selectedWarehouse, storageLocations]);

  // Fetch items when source slot changes
  useEffect(() => {
    async function fetchItemsInSlot() {
      if (!selectedSourceSlot) {
        setItemGroups([]);
        return;
      }
      setLoadingItems(true);
      try {
        const items = await getItemsByLocation(selectedSourceSlot.id);
        const groups = groupItemsByLocation(items);
        setItemGroups(groups);
      } catch {
        setError('Failed to load items for the selected slot.');
        setItemGroups([]);
      } finally {
        setLoadingItems(false);
      }
    }
    fetchItemsInSlot();
  }, [selectedSourceSlot]);

  const totalItems = useMemo(() => {
    return itemGroups.reduce((sum, g) => sum + g.quantity, 0);
  }, [itemGroups]);

  const isFormValid = (): boolean => {
    return !!selectedWarehouse && !!selectedSourceSlot && itemGroups.length > 0;
  };

  const resolvedSubmitLabel =
    submitLabel ?? (removalAction === 'DONATED' ? 'Donate All Items' : 'Delete All Items');

  const handleSubmit = async () => {
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!selectedSourceSlot) {
      setError('Please select a source slot.');
      return;
    }
    if (itemGroups.length === 0) {
      setError('No items found in the source slot.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        warehouse: selectedWarehouse,
        sourceSlotId: selectedSourceSlot.id,
        removalAction,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack
      component="form"
      spacing={3}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <WarehouseSelector
        value={selectedWarehouse}
        onChange={(newWarehouse) => {
          setSelectedWarehouse(newWarehouse);
          setSelectedSourceSlot(null);
          setItemGroups([]);
          setError('');
        }}
        label="Warehouse"
        placeholder="Select warehouse"
        fullWidth
        required
      />

      <FormControl fullWidth disabled={!selectedWarehouse}>
        <RemoveItemFormLabel htmlFor="pallet-remove-source-slot-select" required>
          Source Slot
        </RemoveItemFormLabel>
        <Autocomplete
          id="pallet-remove-source-slot-select"
          options={warehouseLocations}
          getOptionLabel={(option) => option.location_code ?? 'No location code'}
          getOptionKey={(option) => option.id}
          value={selectedSourceSlot}
          onChange={(_, newValue) => {
            setSelectedSourceSlot(newValue);
            setItemGroups([]);
            setError('');
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={!selectedWarehouse ? 'Select warehouse first' : 'Select source slot'}
            />
          )}
          noOptionsText="No matching slots found"
          disabled={!selectedWarehouse}
        />
      </FormControl>

      {/* Item Preview */}
      {selectedSourceSlot && (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Items in Slot ({totalItems} total)
          </Typography>
          {loadingItems ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : itemGroups.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items found in this slot.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {itemGroups.map((group) => (
                <Box
                  key={`${group.product_id}-${group.current_location_id}`}
                  sx={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2">{group.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    x{group.quantity}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Removal Action */}
      <FormControl fullWidth>
        <RemoveItemFormLabel htmlFor="pallet-removal-action-select" required>
          Removal Action
        </RemoveItemFormLabel>
        <Autocomplete
          id="pallet-removal-action-select"
          options={removalActionOptions}
          value={
            removalActionOptions.find((o) => o.value === removalAction) ?? removalActionOptions[0]
          }
          onChange={(_, newValue) => {
            if (newValue) setRemovalAction(newValue.value);
          }}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          disableClearable
          renderInput={(params) => (
            <TextField {...params} placeholder="Select removal action" fullWidth />
          )}
        />
      </FormControl>

      <FormControl fullWidth>
        <RemoveItemFormLabel htmlFor="pallet-remove-notes-input">Notes</RemoveItemFormLabel>
        <TextField
          id="pallet-remove-notes-input"
          fullWidth
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter notes"
        />
      </FormControl>

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="outlined" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          fullWidth
          type="submit"
          color="error"
          disabled={submitting || !isFormValid()}
        >
          {submitting ? <CircularProgress size={24} /> : resolvedSubmitLabel}
        </Button>
      </Box>
    </Stack>
  );
}
