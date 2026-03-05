import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Autocomplete,
  FormControl,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { RemoveItemFormLabel } from '../../pages/TestPage/RemoveItemPage.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { getItems } from '../../api/items';
import { getAllStorageLocations } from '../../api/storageLocation';
import { Item } from '../../types/Item';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';

export type ItemGroupWithLocation = {
  items: Item[];
  name: string;
  locationCode: string;
  locationId: string;
  productId: string;
};

export interface RemoveItemFormData {
  fromLocationId: string;
  productId: string;
  removalAction: 'DONATED' | 'DISCARD';
  quantity: number;
  notes: string;
}

interface RemoveItemFormProps {
  initialWarehouse: Warehouse | null;
  initialSourceLocation: StorageLocation | null;
  initialProductId: string;
  initialRemovalAction: 'DONATED' | 'DISCARD';
  initialQuantity: number;
  initialNotes: string;
  initialGroup?: ItemGroupWithLocation;
  onSubmit: (data: RemoveItemFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const removalActionOptions = [
  { value: 'DONATED' as const, label: 'Donate' },
  { value: 'DISCARD' as const, label: 'Delete (Defective)' },
];

export default function RemoveItemForm({
  initialWarehouse,
  initialSourceLocation,
  initialProductId,
  initialRemovalAction,
  initialQuantity,
  initialNotes,
  initialGroup,
  onSubmit,
  onCancel,
  submitLabel = 'Remove Item',
}: RemoveItemFormProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedGroup, setSelectedGroup] = useState<ItemGroupWithLocation | null>(null);
  const [removalAction, setRemovalAction] = useState<'DONATED' | 'DISCARD'>(initialRemovalAction);
  const [quantityToRemove, setQuantityToRemove] = useState<number | null>(initialQuantity);
  const [notes, setNotes] = useState(initialNotes);

  const [items, setItems] = useState<Item[]>([]);
  const [groupOptions, setGroupOptions] = useState<ItemGroupWithLocation[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load all items once
  useEffect(() => {
    async function loadData() {
      try {
        const itemsData = await getItems();
        setItems(itemsData);
      } catch {
        setLoadError('Failed to load items.');
      } finally {
        setLoadingItems(false);
      }
    }
    loadData();
  }, []);

  // Items in the selected warehouse
  const itemsInSelectedWarehouse = useMemo(() => {
    if (!selectedWarehouse) return [];
    return items.filter((item) => item.warehouse === selectedWarehouse.id);
  }, [items, selectedWarehouse]);

  // Build group options when warehouse or items change
  useEffect(() => {
    const buildGroupOptions = async () => {
      if (!selectedWarehouse) {
        setGroupOptions([]);
        setSelectedGroup(null);
        return;
      }

      try {
        const allLocations = await getAllStorageLocations();
        const locationMap = new Map(allLocations.map((loc) => [loc.id, loc.location_code]));

        const groupMap = new Map<string, ItemGroupWithLocation>();
        for (const item of itemsInSelectedWarehouse) {
          const key = `${item.name}|${item.current_location_id}`;
          const locationCode = locationMap.get(item.current_location_id) ?? 'Unknown';
          if (groupMap.has(key)) {
            groupMap.get(key)!.items.push(item);
          } else {
            groupMap.set(key, {
              items: [item],
              name: item.name,
              locationCode,
              locationId: item.current_location_id,
              productId: item.product_id,
            });
          }
        }

        const options = Array.from(groupMap.values());
        setGroupOptions(options);

        // Pre-select the group matching initialProductId + initialSourceLocation,
        // falling back to the initialGroup prop (used by edit dialogs when items are inactive)
        if (initialSourceLocation) {
          const match = options.find(
            (g) => g.locationId === initialSourceLocation.id && g.productId === initialProductId
          );
          setSelectedGroup(match ?? initialGroup ?? null);
        }
      } catch {
        setGroupOptions([]);
      }
    };

    buildGroupOptions();
  }, [itemsInSelectedWarehouse, selectedWarehouse, initialSourceLocation, initialProductId, initialGroup]);

  const handleSubmit = async () => {
    if (!selectedGroup || quantityToRemove === null || quantityToRemove <= 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({
        fromLocationId: selectedGroup.locationId,
        productId: selectedGroup.productId,
        removalAction,
        quantity: quantityToRemove,
        notes,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingItems) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {submitError && (
        <Alert severity="error" onClose={() => setSubmitError('')}>
          {submitError}
        </Alert>
      )}

      {/* Warehouse */}
      <WarehouseSelector
        value={selectedWarehouse}
        onChange={(newWarehouse) => {
          setSelectedWarehouse(newWarehouse);
          setSelectedGroup(null);
          setQuantityToRemove(null);
        }}
        label="Warehouse"
        placeholder="Select warehouse"
        fullWidth
      />

      {/* Removal Action */}
      <FormControl>
        <RemoveItemFormLabel>Removal Action</RemoveItemFormLabel>
        <Autocomplete
          options={removalActionOptions}
          value={removalActionOptions.find((o) => o.value === removalAction) ?? removalActionOptions[0]}
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

      {/* Item Name */}
      <FormControl>
        <RemoveItemFormLabel>Item Name</RemoveItemFormLabel>
        <Autocomplete
          options={groupOptions}
          value={selectedGroup}
          onChange={(_, newValue) => {
            setSelectedGroup(newValue);
            setQuantityToRemove(null);
          }}
          isOptionEqualToValue={(a, b) => a.name === b.name && a.locationId === b.locationId}
          getOptionLabel={(option) => option.name}
          renderOption={(props, option) => (
            <li {...props} key={`${option.name}|${option.locationId}`}>
              <Box>
                <Typography fontWeight={500}>{option.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {option.locationCode}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} placeholder="Search by location or item name" fullWidth />
          )}
        />
      </FormControl>

      {/* Quantity to remove */}
      <FormControl>
        <RemoveItemFormLabel>Quantity To Remove</RemoveItemFormLabel>
        <TextField
          placeholder="Enter Quantity"
          type="number"
          value={quantityToRemove ?? ''}
          onChange={(e) => {
            if (!selectedGroup) return;
            const raw = e.target.value;
            if (raw === '') {
              setQuantityToRemove(null);
              return;
            }
            const val = Number(raw);
            setQuantityToRemove(Math.min(Math.max(val, 0), selectedGroup.items.length));
          }}
          fullWidth
          inputProps={{ min: 0, max: selectedGroup?.items.length ?? 0 }}
          helperText={
            selectedGroup ? `Available: ${selectedGroup.items.length}` : 'Select an item first'
          }
          disabled={!selectedGroup}
        />
      </FormControl>

      {/* Notes */}
      <TextField
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        fullWidth
        multiline
        minRows={3}
      />

      {/* Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={submitting || !selectedGroup || !quantityToRemove || quantityToRemove <= 0}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : submitLabel}
        </Button>
      </Box>
    </Box>
  );
}
