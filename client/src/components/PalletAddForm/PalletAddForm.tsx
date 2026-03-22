import { useEffect, useState, useMemo } from 'react';
import {
  TextField,
  Button,
  CircularProgress,
  Alert,
  Autocomplete,
  Stack,
  FormControl,
  Box,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getProducts, getStorageLocations } from '../../api/addItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Product } from '../../types/Product';
import { AddItemFormLabel } from '../AddItemForm/AddItemForm.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';

interface ManifestRow {
  product: Product | null;
  quantity: number | '';
}

export interface PalletAddFormData {
  warehouse: Warehouse;
  destinationLocationId: string;
  items: Array<{ product: Product; quantity: number }>;
  notes: string;
}

interface PalletAddFormProps {
  initialWarehouse?: Warehouse | null;
  onSubmit: (data: PalletAddFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export default function PalletAddForm({
  initialWarehouse = null,
  onSubmit,
  onCancel,
  submitLabel = 'Add Pallet',
}: PalletAddFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [manifestRows, setManifestRows] = useState<ManifestRow[]>([
    { product: null, quantity: '' },
  ]);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [productsData, locationsData] = await Promise.all([
          getProducts(),
          getStorageLocations(),
        ]);
        setProducts(productsData);
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

  const updateRow = (index: number, updates: Partial<ManifestRow>) => {
    setManifestRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const removeRow = (index: number) => {
    setManifestRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setManifestRows((prev) => [...prev, { product: null, quantity: '' }]);
  };

  const isFormValid = (): boolean => {
    if (!selectedWarehouse || !selectedSlot) return false;
    if (manifestRows.length === 0) return false;
    return manifestRows.every(
      (row) => row.product !== null && typeof row.quantity === 'number' && row.quantity >= 1
    );
  };

  const handleSubmit = async () => {
    const destinationLocation = warehouseLocations.find((loc) => loc.slot === selectedSlot);

    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!selectedSlot || !destinationLocation) {
      setError('Please select a valid destination slot.');
      return;
    }
    if (!isFormValid()) {
      setError('Please fill out all manifest rows with a product and quantity.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const validItems = manifestRows
        .filter(
          (row): row is { product: Product; quantity: number } =>
            row.product !== null && typeof row.quantity === 'number' && row.quantity >= 1
        )
        .map((row) => ({ product: row.product, quantity: row.quantity }));

      await onSubmit({
        warehouse: selectedWarehouse,
        destinationLocationId: destinationLocation.id,
        items: validItems,
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
          setSelectedSlot(null);
          setError('');
        }}
        label="Warehouse"
        placeholder="Select warehouse"
        fullWidth
      />

      <SlotSelector
        value={selectedSlot}
        onChange={(newSlot) => {
          setSelectedSlot(newSlot);
          setError('');
        }}
        warehouse={selectedWarehouse}
        storageLocations={storageLocations}
        label="Destination Slot"
        placeholder="Select destination slot"
      />

      {/* Item Manifest */}
      <FormControl fullWidth>
        <AddItemFormLabel>Item Manifest</AddItemFormLabel>
        <Stack spacing={2}>
          {manifestRows.map((row, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Autocomplete
                sx={{ flex: 2 }}
                options={products}
                getOptionLabel={(option) => option.name || 'Unknown Product'}
                value={row.product}
                onChange={(_, newValue) => updateRow(index, { product: newValue })}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select product" size="small" />
                )}
                noOptionsText="No matching products found"
              />
              <TextField
                sx={{ flex: 1, minWidth: 100 }}
                type="number"
                size="small"
                value={row.quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateRow(index, { quantity: isNaN(val) ? '' : val });
                }}
                placeholder="Qty"
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
              <IconButton
                onClick={() => removeRow(index)}
                disabled={manifestRows.length <= 1}
                size="small"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
        </Stack>
        <Button
          startIcon={<AddIcon />}
          onClick={addRow}
          sx={{
            justifyContent: 'flex-start',
            textTransform: 'none',
            color: 'primary.main',
            mt: 1,
            '&:hover': { backgroundColor: 'transparent' },
          }}
        >
          Add Item
        </Button>
      </FormControl>

      <FormControl fullWidth>
        <AddItemFormLabel htmlFor="pallet-notes-input">Notes</AddItemFormLabel>
        <TextField
          id="pallet-notes-input"
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
