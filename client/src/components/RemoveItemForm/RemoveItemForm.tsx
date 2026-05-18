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

// Simple module-level cache to avoid repeatedly fetching all storage locations.
let cachedStorageLocations: StorageLocation[] | null = null;
let cachedStorageLocationsPromise: Promise<StorageLocation[]> | null = null;

async function getCachedStorageLocations(): Promise<StorageLocation[]> {
  // Return already cached locations if available.
  if (cachedStorageLocations) {
    return cachedStorageLocations;
  }

  // If a fetch is already in progress, reuse the same promise.
  if (cachedStorageLocationsPromise) {
    return cachedStorageLocationsPromise;
  }

  // Otherwise, start a new fetch and cache both the promise and result.
  cachedStorageLocationsPromise = getAllStorageLocations()
    .then((locations) => {
      cachedStorageLocations = locations;
      return locations;
    })
    .finally(() => {
      // Clear the in-flight promise once settled; the data itself remains cached.
      cachedStorageLocationsPromise = null;
    });

  return cachedStorageLocationsPromise;
}

export type ItemGroupWithLocation = {
  items: Item[];
  name: string;
  itemInfoId: string;
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
  initialItemName: string;
  initialRemovalAction: 'DONATED' | 'DISCARD';
  initialQuantity: number;
  initialNotes: string;
  initialGroup?: ItemGroupWithLocation;
  onSubmit: (data: RemoveItemFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  disableQuantity?: boolean;
  disableItem?: boolean;
}

const removalActionOptions = [
  { value: 'DONATED' as const, label: 'Donate' },
  { value: 'DISCARD' as const, label: 'Discard' },
];

export default function RemoveItemForm({
  initialWarehouse,
  initialSourceLocation,
  initialItemName,
  initialRemovalAction,
  initialQuantity,
  initialNotes,
  initialGroup,
  onSubmit,
  onCancel,
  submitLabel = 'Remove Item',
  disableQuantity = false,
  disableItem = false,
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

  const maxRemovable = useMemo(() => {
    if (!selectedGroup) return 0;
    // initialGroup is a placeholder with fake items representing already-removed items.
    // When it's the active selection, there are 0 real active items at the location.
    const activeCount = selectedGroup === initialGroup ? 0 : selectedGroup.items.length;
    return activeCount + (initialQuantity ?? 0);
  }, [selectedGroup, initialQuantity, initialGroup]);

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
        // Use cached storage locations to avoid repeated full-list network requests.
        const allLocations = await getCachedStorageLocations();
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
              itemInfoId: item.item_info ?? '',
              locationCode,
              locationId: item.current_location_id,
              productId: item.product_id,
            });
          }
        }

        const options = Array.from(groupMap.values());
        setGroupOptions(options);

        // Pre-select the group matching initialItemName + initialSourceLocation,
        // falling back to the initialGroup prop (used by edit dialogs when items are inactive)
        if (initialSourceLocation) {
          const match = options.find(
            (g) => g.locationId === initialSourceLocation.id && g.name === initialItemName
          );
          setSelectedGroup(match ?? initialGroup ?? null);
        }
      } catch {
        setGroupOptions([]);
      }
    };

    buildGroupOptions();
  }, [
    itemsInSelectedWarehouse,
    selectedWarehouse,
    initialSourceLocation,
    initialItemName,
    initialGroup,
  ]);

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

      {/* Item Name */}
      <FormControl>
        <RemoveItemFormLabel>Item Name</RemoveItemFormLabel>
        <Autocomplete
          options={groupOptions}
          value={selectedGroup}
          onChange={(_, newValue) => {
            if (disableItem) return;
            setSelectedGroup(newValue);
            setQuantityToRemove(null);
          }}
          disabled={disableItem}
          isOptionEqualToValue={(a, b) =>
            a.itemInfoId === b.itemInfoId && a.locationId === b.locationId
          }
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
            if (!selectedGroup || disableQuantity) return;
            const raw = e.target.value;
            if (raw === '') {
              setQuantityToRemove(null);
              return;
            }
            const parsed = Math.floor(Number(raw));
            if (!Number.isFinite(parsed)) {
              setQuantityToRemove(null);
              return;
            }
            const clamped = Math.min(Math.max(parsed, 0), maxRemovable);
            setQuantityToRemove(clamped);
          }}
          fullWidth
          inputProps={{ min: 0, max: maxRemovable }}
          helperText={selectedGroup ? `Available: ${maxRemovable}` : 'Select an item first'}
          disabled={!selectedGroup || disableQuantity}
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
