import { useEffect, useState, useMemo } from 'react';
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
import { removeItemsWithMovement } from '../../api/removeItem';
import { Item } from '../../types/Item';
import { Warehouse } from '../../types/Warehouse';
import { RemoveItemCard, RemoveItemFormLabel } from './RemoveItemPage.styles';
import { WarehouseSelector } from '../../components/WarehouseSelector/WarehouseSelector';
import { getAllStorageLocations } from '../../api/storageLocation';

type ItemGroupWithLocation = {
  items: Item[]; // all DB rows for this item_info+location group
  name: string;
  itemInfoId: string;
  locationCode: string;
  locationId: string;
};

export default function RemoveItemPage() {
  const [items, setItems] = useState<Item[]>([]);
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
    if (!selectedGroup || quantityToRemove === null || quantityToRemove <= 0) {
      setError('Please select an item and quantity to remove.');
      return;
    }

    if (quantityToRemove > selectedGroup.items.length) {
      setError('Quantity to remove exceeds available stock.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const itemsToRemove = selectedGroup.items.slice(0, quantityToRemove);
      const isFullRemoval = quantityToRemove === selectedGroup.items.length;

      await removeItemsWithMovement({
        item_ids: itemsToRemove.map((item) => item.id),
        movement: {
          inventory_action: removalAction,
          from_location_id: selectedGroup.locationId,
          quantity: quantityToRemove,
          performed_by: '3c53c4e6-dc90-4db4-b75b-a793fa454631', // Hardcoded user ID (matches Add/Move pages)
          note: notes || undefined,
        },
      });

      // Refresh items
      const refreshedItems = await getItems();
      setItems(refreshedItems);

      // Reset form
      setSelectedGroup(null);
      setQuantityToRemove(0);
      setRemovalAction('DONATED');
      setNotes('');

      const actionLabel = removalAction === 'DONATED' ? 'donated' : 'marked as defective';
      setSuccess(
        isFullRemoval
          ? `Item fully ${actionLabel}.`
          : `${quantityToRemove} item(s) ${actionLabel}.`
      );
    } catch (err) {
      console.error(err);
      setError('Failed to remove item.');
    } finally {
      setLoading(false);
    }
  };

  // Items in currently selected warehouse
  const itemsInSelectedWarehouse = useMemo(() => {
    if (!selectedWarehouse) return [];
    return items.filter((item) => item.warehouse === selectedWarehouse.id);
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

        // Group items by item_info + location — one dropdown entry per unique combination.
        // Using item_info_id (not name) prevents merging distinct products that share a display name.
        const groupMap = new Map<string, ItemGroupWithLocation>();
        for (const item of itemsInSelectedWarehouse) {
          const key = `${item.item_info}|${item.current_location_id}`;
          const locationCode = locationMap.get(item.current_location_id) ?? 'Unknown';
          if (groupMap.has(key)) {
            groupMap.get(key)!.items.push(item);
          } else {
            groupMap.set(key, {
              items: [item],
              name: item.name,
              itemInfoId: item.item_info,
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Remove Item
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <RemoveItemCard>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            {/* Warehouse */}
            <WarehouseSelector
              value={selectedWarehouse}
              onChange={(newWarehouse) => {
                setSelectedWarehouse(newWarehouse);
                setSelectedGroup(null);
                setQuantityToRemove(0);
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
              <RemoveItemFormLabel htmlFor="removal-action-select">Removal Action</RemoveItemFormLabel>
              <Autocomplete
                options={removalActionOptions}
                value={removalActionOptions.find((o) => o.value === removalAction) ?? removalActionOptions[0]}
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
                  value={selectedGroup}
                  onChange={(_, newValue) => setSelectedGroup(newValue)}
                  isOptionEqualToValue={(a, b) =>
                    a.itemInfoId === b.itemInfoId && a.locationId === b.locationId
                  }
                  getOptionLabel={(option) => option.name}
                  renderOption={(props, option) => (
                    <li {...props} key={`${option.itemInfoId}|${option.locationId}`}>
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
                  <TextField {...params} label="Product" placeholder="Select product" fullWidth />
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
                  if (!selectedGroup) return;

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
                  const clamped = Math.min(Math.max(parsed, 0), selectedGroup.items.length);
                  setQuantityToRemove(clamped);
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
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedGroup(null);
                  setQuantityToRemove(0);
                  setRemovalAction('DONATED');
                  setNotes('');
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
    </Container>
  );
}
