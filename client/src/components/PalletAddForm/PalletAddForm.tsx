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
  createFilterOptions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { getProducts, getStorageLocations } from '../../api/addItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Product } from '../../types/Product';
import { AddItemFormLabel } from '../AddItemForm/AddItemForm.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';
import NewItemDialog from './NewItemDialog';

export interface NewProductData {
  name: string;
  category: string;
  subcategoryProductId?: string;
  newSubcategoryName?: string;
  limit?: number;
  value?: number;
  packSize?: number;
  fixture?: string;
}

interface ManifestRow {
  product: Product | null;
  quantity: number | '';
  isNewProduct?: boolean;
  newProductData?: NewProductData;
}

export interface PalletAddFormData {
  warehouse: Warehouse;
  items: Array<{
    product: Product;
    quantity: number;
    destinationLocationId: string;
    isNewProduct?: boolean;
    newProductData?: NewProductData;
  }>;
  notes: string;
}

interface PalletAddFormProps {
  initialWarehouse?: Warehouse | null;
  onSubmit: (data: PalletAddFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// Sentinel option used to trigger "Create new item" in the Autocomplete
const CREATE_NEW_SENTINEL: Product = {
  id: '__create_new__',
  created_at: '',
  name: '+ Create new item...',
  description: null,
  unit_of_measure: null,
  value: 0,
  item_limit: 0,
  category: '',
  total_count: 0,
};

const defaultFilter = createFilterOptions<Product>();

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

  // New item dialog state
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [localNewProducts, setLocalNewProducts] = useState<Product[]>([]);

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

  // Merged product list: real products + locally created placeholders
  const allProducts = useMemo(
    () => [...products, ...localNewProducts],
    [products, localNewProducts]
  );

  // Derive available fixtures from storage locations
  const availableFixtures = useMemo(() => {
    const fixtures = storageLocations
      .map((loc) => loc.fixture)
      .filter((f): f is string => !!f && f.trim() !== '');
    return Array.from(new Set(fixtures)).sort((a, b) => a.localeCompare(b));
  }, [storageLocations]);

  // Derive available categories from products
  const availableCategories = useMemo(() => {
    const fromProducts = allProducts
      .map((p) => p.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    const unique = Array.from(new Set(fromProducts));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [allProducts]);

  const updateRow = (index: number, updates: Partial<ManifestRow>) => {
    setManifestRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const removeRow = (index: number) => {
    const row = manifestRows[index];
    // Clean up placeholder from localNewProducts if removing a new-item row
    if (row.isNewProduct && row.product) {
      setLocalNewProducts((prev) => prev.filter((p) => p.id !== row.product!.id));
    }
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
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a destination slot.');
      return;
    }
    if (!isFormValid()) {
      setError('Please fill out all manifest rows with a product and quantity.');
      return;
    }

    // Resolve destination: prefer location with null/empty fixture, fall back to first match
    const slotLocations = warehouseLocations.filter((loc) => loc.slot === selectedSlot);
    const destinationLocation =
      slotLocations.find((loc) => !loc.fixture || loc.fixture.trim() === '') ?? slotLocations[0] ?? null;

    if (!destinationLocation) {
      setError('Could not find a location for the selected slot.');
      return;
    }

    const validItems = manifestRows
      .filter(
        (row): row is ManifestRow & { product: Product; quantity: number } =>
          row.product !== null && typeof row.quantity === 'number' && row.quantity >= 1
      )
      .map((row) => ({
        product: row.product,
        quantity: row.quantity,
        destinationLocationId: destinationLocation.id,
        isNewProduct: row.isNewProduct,
        newProductData: row.newProductData,
      }));

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        warehouse: selectedWarehouse,
        items: validItems,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Autocomplete selection including sentinel
  const handleProductSelect = (index: number, newValue: Product | null) => {
    if (newValue && newValue.id === CREATE_NEW_SENTINEL.id) {
      // Open dialog to create a new item for this row
      setEditingRowIndex(index);
      setNewItemDialogOpen(true);
      return;
    }

    // If switching from a new-item row to a real product, clean up
    const row = manifestRows[index];
    if (row.isNewProduct && row.product) {
      setLocalNewProducts((prev) => prev.filter((p) => p.id !== row.product!.id));
    }

    updateRow(index, {
      product: newValue,
      isNewProduct: false,
      newProductData: undefined,
    });
  };

  // Handle dialog confirm (create or edit)
  const handleNewItemConfirm = (data: NewProductData, placeholderProduct: Product) => {
    if (editingRowIndex === null) return;

    const row = manifestRows[editingRowIndex];

    // If editing an existing new-item, replace its placeholder
    if (row.isNewProduct && row.product) {
      setLocalNewProducts((prev) => prev.filter((p) => p.id !== row.product!.id));
    }

    // Add new placeholder to local products
    setLocalNewProducts((prev) => [...prev, placeholderProduct]);

    updateRow(editingRowIndex, {
      product: placeholderProduct,
      isNewProduct: true,
      newProductData: data,
    });

    setNewItemDialogOpen(false);
    setEditingRowIndex(null);
  };

  // Handle edit button click on a new-item row
  const handleEditNewItem = (index: number) => {
    setEditingRowIndex(index);
    setNewItemDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const editingRow = editingRowIndex !== null ? manifestRows[editingRowIndex] : null;

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
                options={allProducts}
                getOptionLabel={(option) =>
                  option.id === CREATE_NEW_SENTINEL.id
                    ? CREATE_NEW_SENTINEL.name
                    : option.name || 'Unknown Product'
                }
                value={row.product}
                onChange={(_, newValue) => handleProductSelect(index, newValue)}
                filterOptions={(options, params) => {
                  const filtered = defaultFilter(options, params);
                  // Always append the sentinel at the end
                  filtered.push(CREATE_NEW_SENTINEL);
                  return filtered;
                }}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  if (option.id === CREATE_NEW_SENTINEL.id) {
                    return (
                      <li key={key} {...otherProps} style={{ fontStyle: 'italic', color: '#1976d2' }}>
                        {CREATE_NEW_SENTINEL.name}
                      </li>
                    );
                  }
                  return (
                    <li key={key} {...otherProps}>
                      {option.name || 'Unknown Product'}
                    </li>
                  );
                }}
                isOptionEqualToValue={(option, val) => option.id === val.id}
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
              {row.isNewProduct && (
                <IconButton
                  onClick={() => handleEditNewItem(index)}
                  size="small"
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
              )}
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

      {/* New Item Dialog */}
      <NewItemDialog
        open={newItemDialogOpen}
        onClose={() => {
          setNewItemDialogOpen(false);
          setEditingRowIndex(null);
        }}
        onConfirm={handleNewItemConfirm}
        products={allProducts}
        availableFixtures={availableFixtures}
        availableCategories={availableCategories}
        initialData={editingRow?.isNewProduct ? editingRow.newProductData ?? null : null}
      />
    </Stack>
  );
}
