import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Autocomplete,
  FormControl,
} from '@mui/material';

import { getItems } from '../../api/items';
import { getItemsByLocation, removeItemsWithMovement } from '../../api/moveItem';
import { useAuth } from '../../context/AuthContext';
import { Item } from '../../types/Item';
import { Warehouse } from '../../types/Warehouse';
import { RemoveItemCard, RemoveItemFormLabel } from './RemoveItemPage.styles';
import { WarehouseSelector } from '../../components/WarehouseSelector/WarehouseSelector';
import { getAllStorageLocations } from '../../api/storageLocation';
import { useMemo } from 'react';
import FormModeToggle, { FormMode } from '../../components/FormModeToggle/FormModeToggle';
import PalletRemoveForm, {
  PalletRemoveFormData,
} from '../../components/PalletRemoveForm/PalletRemoveForm';

type ItemGroupWithLocation = {
  items: Item[]; // all DB rows for this name+location group
  name: string;
  locationCode: string;
  locationId: string;
};

export default function RemoveItemPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  // 'slot' and 'product' modes are not yet implemented — scoped to future sprints
  const removeByOptions: Array<'item' | 'product'> = ['item'];
  const [removeBy, setRemoveBy] = useState<'item' | 'product'>('item');
  const [selectedGroup, setSelectedGroup] = useState<ItemGroupWithLocation | null>(null);
  const productOptions: string[] = ['Product A', 'Product B', 'Product C']; // hardcoded for now will change in later sprints
  const [selectedProduct, setSelectedProduct] = useState('');

  const removalActionOptions = [
    { value: 'DONATED' as const, label: 'Donate' },
    { value: 'DISCARD' as const, label: 'Delete (Defective)' },
  ];
  const [removalAction, setRemovalAction] = useState<'DONATED' | 'DISCARD'>('DONATED');

  const [quantityToRemove, setQuantityToRemove] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupOptions, setGroupOptions] = useState<ItemGroupWithLocation[]>([]);

  const [mode, setMode] = useState<FormMode>('individual');

  const selectedGroupLive = useMemo(() => {
    if (!selectedGroup) return null;
    return (
      groupOptions.find(
        (group) =>
          group.name === selectedGroup.name && group.locationId === selectedGroup.locationId
      ) ?? null
    );
  }, [groupOptions, selectedGroup]);

  // Load items
  useEffect(() => {
    async function loadData() {
      try {
        const itemsData = await getItems();
        setItems(itemsData);
      } catch {
        setError('Failed to load items.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Remove item handler (donate or delete/defective)
  const handleRemoveItem = async () => {
    if (!selectedGroupLive || quantityToRemove === null || quantityToRemove <= 0) {
      setError('Please select an item and quantity to remove.');
      return;
    }

    if (quantityToRemove > selectedGroupLive.items.length) {
      setError('Quantity to remove exceeds available stock.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const itemsToRemove = selectedGroupLive.items.slice(0, quantityToRemove);

      await removeItemsWithMovement({
        item_ids: itemsToRemove.map((item) => item.id),
        movement: {
          inventory_action: removalAction,
          from_location_id: selectedGroupLive.locationId,
          quantity: quantityToRemove,
          performed_by: user!.id,
          note: notes || undefined,
        },
      });

      // Refresh items
      const refreshedItems = await getItems();
      setItems(refreshedItems);

      // Keep selection when possible so available count updates in-place
      setSelectedGroup(null);
      setQuantityToRemove(null);
      setRemovalAction('DONATED');
      setSelectedProduct('');
      setNotes('');

      const actionLabel = removalAction === 'DONATED' ? 'donated' : 'marked as defective';
      setSuccess(`${quantityToRemove} item(s) ${actionLabel}.`);
    } catch (err) {
      console.error(err);
      setError('Failed to remove item.');
    } finally {
      setLoading(false);
    }
  };

  // Pallet remove handler
  const handlePalletRemoveSubmit = async (data: PalletRemoveFormData) => {
    const { sourceSlotId, removalAction: action, notes: palletNotes } = data;

    setError('');
    setSuccess('');

    try {
      const allItems = await getItemsByLocation(sourceSlotId);
      const activeItems = allItems.filter((item) => item.status === 'active');

      if (activeItems.length === 0) {
        throw new Error('No active items found in the source slot.');
      }

      await removeItemsWithMovement({
        item_ids: activeItems.map((item) => item.id),
        movement: {
          inventory_action: action,
          from_location_id: sourceSlotId,
          quantity: activeItems.length,
          performed_by: user!.id,
          note: palletNotes || undefined,
        },
      });

      // Refresh items
      const refreshedItems = await getItems();
      setItems(refreshedItems);

      const actionLabel = action === 'DONATED' ? 'donated' : 'marked as defective';
      setSuccess(`${activeItems.length} item${activeItems.length > 1 ? 's' : ''} ${actionLabel}.`);
      setFormKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Failed to remove pallet items. Please try again.';
      setError(message);
    }
  };

  // Items in currently selected warehouse
  const itemsInSelectedWarehouse = useMemo(() => {
    if (!selectedWarehouse) return [];
    return items.filter(
      (item) =>
        item.warehouse === selectedWarehouse.id &&
        item.status === 'active' &&
        Boolean(item.current_location_id)
    );
  }, [items, selectedWarehouse]);

  useEffect(() => {
    const buildGroupOptions = async () => {
      if (!selectedWarehouse) {
        setGroupOptions([]);
        return;
      }

      try {
        const allLocations = await getAllStorageLocations();
        const locationMap = new Map(allLocations.map((loc) => [loc.id, loc.location_code]));

        // Group items by name + location — one dropdown entry per unique combination
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
            });
          }
        }

        setGroupOptions(Array.from(groupMap.values()));
      } catch (err) {
        console.error('Failed to build item options', err);
        setGroupOptions([]);
      }
    };

    buildGroupOptions();
  }, [itemsInSelectedWarehouse, selectedWarehouse]);

  const handleModeChange = (newMode: FormMode) => {
    setMode(newMode);
    setFormKey((k) => k + 1);
    setError('');
    setSuccess('');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Remove Item
      </Typography>
      <FormModeToggle value={mode} onChange={handleModeChange} />

      {mode === 'pallet' ? (
        <RemoveItemCard key={formKey}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <PalletRemoveForm
            onSubmit={handlePalletRemoveSubmit}
            onCancel={() => {
              setFormKey((k) => k + 1);
              setError('');
              setSuccess('');
            }}
          />
        </RemoveItemCard>
      ) : (
        <>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && (
            <RemoveItemCard key={formKey}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}
                {/* Warehouse */}
                <WarehouseSelector
                  value={selectedWarehouse}
                  onChange={(newWarehouse) => {
                    setSelectedWarehouse(newWarehouse);
                    setSelectedGroup(null);
                    setQuantityToRemove(null);
                    setError('');
                  }}
                  label="Warehouse"
                  placeholder="Select warehouse"
                  fullWidth
                />
                {/* Remove By */}{' '}
                <FormControl>
                  <RemoveItemFormLabel htmlFor="remove-by-select">Remove By</RemoveItemFormLabel>
                  <Autocomplete
                    options={removeByOptions}
                    value={removeBy}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        setRemoveBy(newValue);
                      }
                    }}
                    getOptionLabel={(option) => option.charAt(0).toUpperCase() + option.slice(1)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Remove By" fullWidth />
                    )}
                  />
                </FormControl>
                {/* Removal Action */}
                <FormControl>
                  <RemoveItemFormLabel htmlFor="removal-action-select">
                    Removal Action
                  </RemoveItemFormLabel>
                  <Autocomplete
                    options={removalActionOptions}
                    value={
                      removalActionOptions.find((o) => o.value === removalAction) ??
                      removalActionOptions[0]
                    }
                    onChange={(_, newValue) => {
                      if (newValue) {
                        setRemovalAction(newValue.value);
                      }
                    }}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    disableClearable
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Select removal action" fullWidth />
                    )}
                  />
                </FormControl>
                {/* CONDITIONAL FIELDS */}
                {/* Remove by ITEM */}{' '}
                {removeBy === 'item' && (
                  <FormControl>
                    <RemoveItemFormLabel>Item Name</RemoveItemFormLabel>
                    <Autocomplete
                      options={groupOptions}
                      value={selectedGroupLive}
                      onChange={(_, newValue) => setSelectedGroup(newValue)}
                      isOptionEqualToValue={(a, b) =>
                        a.name === b.name && a.locationId === b.locationId
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
                        <TextField
                          {...params}
                          placeholder="Search by location or item name"
                          fullWidth
                        />
                      )}
                    />
                  </FormControl>
                )}{' '}
                {/* Remove by PRODUCT */}{' '}
                {removeBy === 'product' && (
                  <Autocomplete
                    options={productOptions}
                    value={selectedProduct || null}
                    onChange={(_, newValue) => {
                      setSelectedProduct(newValue ?? '');
                    }}
                    freeSolo
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Product"
                        placeholder="Select product"
                        fullWidth
                      />
                    )}
                  />
                )}
                {/* Quantity to remove */}
                <FormControl>
                  <RemoveItemFormLabel htmlFor="quantity-select">
                    Quantity To Remove
                  </RemoveItemFormLabel>
                  <TextField
                    placeholder="Enter Quantity"
                    type="number"
                    value={quantityToRemove ?? ''}
                    onChange={(e) => {
                      if (!selectedGroupLive) return;

                      const raw = e.target.value;

                      if (raw === '') {
                        setQuantityToRemove(null);
                        return;
                      }

                      const val = Number(raw);
                      setQuantityToRemove(
                        Math.min(Math.max(val, 0), selectedGroupLive.items.length)
                      );
                    }}
                    fullWidth
                    inputProps={{ min: 0, max: selectedGroupLive?.items.length ?? 0 }}
                    helperText={
                      selectedGroupLive
                        ? `Available: ${selectedGroupLive.items.length}`
                        : 'Select an item first'
                    }
                    disabled={!selectedGroupLive}
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
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelectedGroup(null);
                      setQuantityToRemove(null);
                      setRemovalAction('DONATED');
                      setSelectedProduct('');
                      setNotes('');
                      setError('');
                      setSuccess('');
                      setFormKey((k) => k + 1);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button variant="contained" color="error" onClick={handleRemoveItem}>
                    {removalAction === 'DONATED' ? 'Donate Item' : 'Delete Item'}
                  </Button>
                </Box>
              </Box>
            </RemoveItemCard>
          )}
        </>
      )}
    </Container>
  );
}
