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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { getProducts, getStorageLocations } from '../../api/addItem';
import { createStorageLocation } from '../../api/storageLocation';
import { getItemInfoAll, ItemInfo } from '../../api/itemInfo';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Product } from '../../types/Product';
import {
  AddItemFormLabel,
  ProductOptionContainer,
  ProductNameText,
  ProductDetailsText,
} from '../AddItemForm/AddItemForm.styles';
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
  itemInfo: ItemInfo | null;
  quantity: number | '';
  isNewProduct?: boolean;
  newProductData?: NewProductData;
}

export interface PalletAddFormData {
  warehouse: Warehouse;
  items: Array<{
    itemInfo: ItemInfo;
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
const CREATE_NEW_SENTINEL: ItemInfo = {
  id: '__create_new__',
  name: '+ Create new item...',
  product_id: null,
  category: null,
  quantity: null,
  value: null,
  item_limit: null,
  stock: 0,
  fixture: null,
  last_known_location_code: null,
  time_last_updated: null,
  notes: null,
  limbo: false,
};

const defaultFilter = createFilterOptions<ItemInfo>();

export default function PalletAddForm({
  initialWarehouse = null,
  onSubmit,
  onCancel,
  submitLabel = 'Add Pallet',
}: PalletAddFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [itemInfoList, setItemInfoList] = useState<ItemInfo[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [manifestRows, setManifestRows] = useState<ManifestRow[]>([
    { itemInfo: null, quantity: '' },
  ]);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [newSlotCode, setNewSlotCode] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);

  // New item dialog state
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [localNewItemInfos, setLocalNewItemInfos] = useState<ItemInfo[]>([]);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [productsData, itemInfoData, locationsData] = await Promise.all([
          getProducts(),
          getItemInfoAll(),
          getStorageLocations(),
        ]);
        setProducts(productsData);
        setItemInfoList(itemInfoData);
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

  // Merged item info list: real item_info + locally created placeholders
  const allItemInfos = useMemo(
    () => [...itemInfoList, ...localNewItemInfos],
    [itemInfoList, localNewItemInfos]
  );

  // Derive available categories from item_info records and products
  const availableCategories = useMemo(() => {
    const fromItemInfo = allItemInfos
      .map((ii) => ii.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    const fromProducts = products
      .map((p) => p.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    const unique = Array.from(new Set([...fromItemInfo, ...fromProducts]));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [allItemInfos, products]);

  const updateRow = (index: number, updates: Partial<ManifestRow>) => {
    setManifestRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const removeRow = (index: number) => {
    const row = manifestRows[index];
    // Clean up placeholder from localNewItemInfos if removing a new-item row
    if (row.isNewProduct && row.itemInfo) {
      setLocalNewItemInfos((prev) => prev.filter((ii) => ii.id !== row.itemInfo!.id));
    }
    setManifestRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setManifestRows((prev) => [...prev, { itemInfo: null, quantity: '' }]);
  };

  const handleAddNewSlot = async () => {
    const slot = newSlotCode.trim();
    if (!selectedWarehouse) {
      setError('Please select a warehouse before adding a slot.');
      return;
    }
    if (!slot) {
      setError('Please enter a slot code.');
      return;
    }

    setCreatingSlot(true);
    setError('');
    try {
      const created = await createStorageLocation({
        slot,
        active: true,
        warehouse_id: selectedWarehouse.id,
      });
      setStorageLocations((prev) => [...prev, created]);
      setSelectedSlot(created.slot);
      setNewSlotCode('');
      setSlotDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create slot. Please try again.');
      setNewSlotCode('');
      setSlotDialogOpen(false);
    } finally {
      setCreatingSlot(false);
    }
  };

  const isFormValid = (): boolean => {
    if (!selectedWarehouse || !selectedSlot) return false;
    if (manifestRows.length === 0) return false;
    return manifestRows.every(
      (row) => row.itemInfo !== null && typeof row.quantity === 'number' && row.quantity >= 1
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
      setError('Please fill out all manifest rows with an item and quantity.');
      return;
    }

    const destinationLocation = warehouseLocations.find((loc) => loc.slot === selectedSlot) ?? null;

    if (!destinationLocation) {
      setError('Could not find a location for the selected slot.');
      return;
    }

    const validItems = manifestRows
      .filter(
        (row): row is ManifestRow & { itemInfo: ItemInfo; quantity: number } =>
          row.itemInfo !== null && typeof row.quantity === 'number' && row.quantity >= 1
      )
      .map((row) => ({
        itemInfo: row.itemInfo,
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
  const handleItemInfoSelect = (index: number, newValue: ItemInfo | null) => {
    if (newValue && newValue.id === CREATE_NEW_SENTINEL.id) {
      // Open dialog to create a new item for this row
      setEditingRowIndex(index);
      setNewItemDialogOpen(true);
      return;
    }

    // If switching from a new-item row to a real item_info, clean up
    const row = manifestRows[index];
    if (row.isNewProduct && row.itemInfo) {
      setLocalNewItemInfos((prev) => prev.filter((ii) => ii.id !== row.itemInfo!.id));
    }

    updateRow(index, {
      itemInfo: newValue,
      isNewProduct: false,
      newProductData: undefined,
    });
  };

  // Handle dialog confirm (create or edit)
  const handleNewItemConfirm = (data: NewProductData, placeholderItemInfo: ItemInfo) => {
    if (editingRowIndex === null) return;

    const row = manifestRows[editingRowIndex];

    // If editing an existing new-item, replace its placeholder
    if (row.isNewProduct && row.itemInfo) {
      setLocalNewItemInfos((prev) => prev.filter((ii) => ii.id !== row.itemInfo!.id));
    }

    // Add new placeholder to local item_info list
    setLocalNewItemInfos((prev) => [...prev, placeholderItemInfo]);

    updateRow(editingRowIndex, {
      itemInfo: placeholderItemInfo,
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
      >
        <Button
          startIcon={<AddIcon />}
          onClick={() => {
            setError('');
            setNewSlotCode('');
            setSlotDialogOpen(true);
          }}
          disabled={!selectedWarehouse}
          sx={{
            justifyContent: 'flex-start',
            textTransform: 'none',
            color: 'primary.main',
            mt: 0,
            '&:hover': { backgroundColor: 'transparent' },
          }}
        >
          New Slot
        </Button>
      </SlotSelector>

      {/* Item Manifest */}
      <FormControl fullWidth>
        <AddItemFormLabel>Item Manifest</AddItemFormLabel>
        <Stack spacing={2}>
          {manifestRows.map((row, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Autocomplete
                sx={{ flex: 2 }}
                options={allItemInfos}
                getOptionLabel={(option) =>
                  option.id === CREATE_NEW_SENTINEL.id
                    ? CREATE_NEW_SENTINEL.name
                    : option.name || 'Unknown'
                }
                value={row.itemInfo}
                onChange={(_, newValue) => handleItemInfoSelect(index, newValue)}
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
                      <li
                        key={key}
                        {...otherProps}
                        style={{ fontStyle: 'italic', color: '#1976d2' }}
                      >
                        {CREATE_NEW_SENTINEL.name}
                      </li>
                    );
                  }
                  return (
                    <li key={key} {...otherProps}>
                      <ProductOptionContainer>
                        <ProductNameText>{option.name || 'Unknown'}</ProductNameText>
                        <ProductDetailsText>
                          {option.product_name ? `Product: ${option.product_name} · ` : ''}
                          {option.category || 'No category'} | Value: ${option.value ?? 0} | Stock:{' '}
                          {option.stock}
                        </ProductDetailsText>
                      </ProductOptionContainer>
                    </li>
                  );
                }}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search for an item" size="small" />
                )}
                noOptionsText="No matching items found"
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
                <IconButton onClick={() => handleEditNewItem(index)} size="small" color="primary">
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

      <Dialog open={slotDialogOpen} onClose={() => !creatingSlot && setSlotDialogOpen(false)}>
        <DialogTitle>Add New Slot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            required
            label="Slot code"
            value={newSlotCode}
            onChange={(e) => setNewSlotCode(e.target.value)}
            placeholder="e.g. A-12-03"
            sx={{ mt: 1 }}
            helperText={
              selectedWarehouse
                ? `Creates a unique storage location in ${selectedWarehouse.name}.`
                : 'Select a warehouse in the form first.'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlotDialogOpen(false)} disabled={creatingSlot}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleAddNewSlot()}
            disabled={!newSlotCode.trim() || !selectedWarehouse || creatingSlot}
            variant="contained"
          >
            {creatingSlot ? <CircularProgress size={20} /> : 'Add slot'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Item Dialog */}
      <NewItemDialog
        open={newItemDialogOpen}
        onClose={() => {
          setNewItemDialogOpen(false);
          setEditingRowIndex(null);
        }}
        onConfirm={handleNewItemConfirm}
        products={products}
        availableCategories={availableCategories}
        initialData={editingRow?.isNewProduct ? (editingRow.newProductData ?? null) : null}
        storageLocations={storageLocations}
      />
    </Stack>
  );
}
