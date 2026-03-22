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
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  getStorageLocations,
  getItemsByLocation,
  groupItemsByLocation,
} from '../../api/moveItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { ItemGroup } from '../../types/Item';
import { MoveItemFormLabel } from '../MoveItemForm/MoveItemForm.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';
import { FixtureSelector } from '../FixtureSelector/FixtureSelector';

export interface PalletMoveFormData {
  warehouse: Warehouse;
  sourceSlotId: string;
  destinationLocationId: string;
  notes: string;
}

interface PalletMoveFormProps {
  initialWarehouse?: Warehouse | null;
  onSubmit: (data: PalletMoveFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export default function PalletMoveForm({
  initialWarehouse = null,
  onSubmit,
  onCancel,
  submitLabel = 'Move All Items',
}: PalletMoveFormProps) {
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedSourceSlot, setSelectedSourceSlot] = useState<StorageLocation | null>(null);
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [selectedDestinationSlot, setSelectedDestinationSlot] = useState<string | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<string | null>(null);
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
    return (
      !!selectedWarehouse &&
      !!selectedSourceSlot &&
      itemGroups.length > 0 &&
      !!selectedDestinationSlot &&
      !!selectedFixture
    );
  };

  const handleSubmit = async () => {
    const destinationLocation = warehouseLocations.find((loc) => {
      if (selectedFixture === 'N/A') {
        return loc.slot === selectedDestinationSlot && (!loc.fixture || loc.fixture.trim() === '');
      }
      return loc.slot === selectedDestinationSlot && loc.fixture === selectedFixture;
    });

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
    if (!selectedDestinationSlot || !selectedFixture || !destinationLocation) {
      setError('Please select a valid destination slot and fixture.');
      return;
    }
    if (selectedSourceSlot.id === destinationLocation.id) {
      setError('Destination must be different from the source slot.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        warehouse: selectedWarehouse,
        sourceSlotId: selectedSourceSlot.id,
        destinationLocationId: destinationLocation.id,
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
          setSelectedDestinationSlot(null);
          setSelectedFixture(null);
          setError('');
        }}
        label="Warehouse"
        placeholder="Select warehouse"
        fullWidth
      />

      <FormControl fullWidth disabled={!selectedWarehouse}>
        <MoveItemFormLabel htmlFor="pallet-source-slot-select">Source Slot</MoveItemFormLabel>
        <Autocomplete
          id="pallet-source-slot-select"
          options={warehouseLocations}
          getOptionLabel={(option) => option.location_code ?? 'No location code'}
          getOptionKey={(option) => option.id}
          value={selectedSourceSlot}
          onChange={(_, newValue) => {
            setSelectedSourceSlot(newValue);
            setItemGroups([]);
            setSelectedDestinationSlot(null);
            setSelectedFixture(null);
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

      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <ArrowDownwardIcon aria-hidden="true" sx={{ fontSize: '2rem', color: 'text.secondary' }} />
      </Box>

      <Stack spacing={0}>
        <SlotSelector
          value={selectedDestinationSlot}
          onChange={(newSlot) => {
            setSelectedDestinationSlot(newSlot);
            setSelectedFixture(null);
            setError('');
          }}
          warehouse={selectedWarehouse}
          storageLocations={storageLocations}
          label="Destination Slot"
          placeholder="Select destination slot"
        />

        <FixtureSelector
          value={selectedFixture}
          onChange={(newFixture) => {
            setSelectedFixture(newFixture);
            setError('');
          }}
          slot={selectedDestinationSlot}
          warehouse={selectedWarehouse}
          storageLocations={storageLocations}
          nullFixtureLabel="N/A"
          autoSelectNull
        />
      </Stack>

      <FormControl fullWidth>
        <MoveItemFormLabel htmlFor="pallet-move-notes-input">Notes</MoveItemFormLabel>
        <TextField
          id="pallet-move-notes-input"
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
        <Button variant="contained" fullWidth type="submit" disabled={submitting || !isFormValid()}>
          {submitting ? <CircularProgress size={24} /> : submitLabel}
        </Button>
      </Box>
    </Stack>
  );
}
