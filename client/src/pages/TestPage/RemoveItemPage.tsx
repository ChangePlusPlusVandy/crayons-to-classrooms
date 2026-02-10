import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  // MenuItem,
  Button,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  FormControl,
} from '@mui/material';

import { getItems, updateItem } from '../../api/items';
import { createInventoryMovement } from '../../api/addItem';
import { Item, UpdateItemRequest } from '../../types/Item';
import { Warehouse } from '../../types/Warehouse';
import { RemoveItemCard, RemoveItemFormLabel } from './RemoveItemPage.styles';
import { WarehouseSelector } from '../../components/WarehouseSelector/WarehouseSelector';
import { getStorageLocationById } from '../../api/storageLocation';
import { StorageLocation } from '../../types/StorageLocation';
import { useMemo } from 'react';
type ItemWithLocation = {
  item: Item;
  locationCode: string;
};

export default function RemoveItemPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const removeByOptions: Array<'item' | 'slot' | 'product'> = ['item', 'slot', 'product'];
  const [removeBy, setRemoveBy] = useState<'item' | 'slot' | 'product'>('item');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemSlots, setItemSlots] = useState<string[]>([]);
  const slotOptions: string[] = ['A1', 'A2', 'B1', 'B2']; // hardcoded for now - will change in later sprints
  const [selectedSlot, setSelectedLocationCode] = useState('');
  const productOptions: string[] = ['Product A', 'Product B', 'Product C']; // hardcoded for now will change in later sprints
  const [selectedProduct, setSelectedProduct] = useState('');

  const removalActionOptions = [
    { value: 'DONATED' as const, label: 'Donate' },
    { value: 'DISCARD' as const, label: 'Delete (Defective)' },
  ];
  const [removalAction, setRemovalAction] = useState<'DONATED' | 'DISCARD'>('DONATED');

  const [quantityToRemove, setQuantityToRemove] = useState<number | null>(null);
  const [moveToLimbo, setMoveToLimbo] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [itemOptions, setItemOptions] = useState<ItemWithLocation[]>([]);
  const [selectedOption, setSelectedOption] = useState<typeof itemOptions[0] | null>(null);


  // const CURRENT_USER_ID = '8f4a9cb7-909c-43b2-8006-c35ad8311aca'; // HARDCODED VALUE replace with logged-in user ID

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

  //Item selection handler
  const handleItemSelect = (itemId: string) => {
    const item = items.find((i) => i.id === itemId) || null;
    setSelectedItem(item);
    setQuantityToRemove(0);
  };
  // Remove item handler (donate or delete/defective)
  const handleRemoveItem = async () => {
    if (!selectedItem || quantityToRemove === null || quantityToRemove <= 0) {
      setError('Please select an item and quantity to remove.');
      return;
    }

    if (quantityToRemove > selectedItem.quantity) {
      setError('Quantity to remove exceeds available stock.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const isFullRemoval = quantityToRemove === selectedItem.quantity;
      const newStatus = removalAction === 'DONATED' ? 'donated' : 'defective';

      if (isFullRemoval) {
        // Full removal: update status and nullify location fields
        const updateData: UpdateItemRequest = {
          status: newStatus,
          current_location_id: null,
          warehouse: null,
          limbo: moveToLimbo,
        };
        await updateItem(selectedItem.id, updateData);
      } else {
        // Partial removal: just reduce quantity on existing item
        const updateData: UpdateItemRequest = {
          quantity: selectedItem.quantity - quantityToRemove,
          limbo: moveToLimbo,
        };
        await updateItem(selectedItem.id, updateData);
      }

      // Create inventory movement record
      await createInventoryMovement({
        inventory_action: removalAction,
        item_id: selectedItem.id,
        product_id: selectedItem.product_id,
        from_location_id: selectedItem.current_location_id,
        to_location_id: null,
        quantity: quantityToRemove,
        performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // Hardcoded user ID (matches Add/Move pages)
        note: notes || undefined,
      });

      // Refresh items
      const refreshedItems = await getItems();
      setItems(refreshedItems);

      // Reset form
      setSelectedItem(null);
      setSelectedOption(null);
      setQuantityToRemove(0);
      setMoveToLimbo(false);
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

  //item in currently selected warehouse
  const itemsInSelectedWarehouse = useMemo(() => {
    if (!selectedWarehouse) return [];
    return items.filter((item) => item.warehouse === selectedWarehouse.id);
  }, [items, selectedWarehouse]);

  useEffect(() => {
    const buildItemOptions = async () => {
      if (!selectedWarehouse) {
        setItemOptions([]);
        return;
      }

      try {
        const options = await Promise.all(
          itemsInSelectedWarehouse.map(async (item) => {
            const location = await getStorageLocationById(item.current_location_id);

            // if (location.warehouse_id !== selectedWarehouse.id) return null;

            return {
              item,
              locationCode: location.location_code,
            };
          })
        );

        setItemOptions(options.filter((o): o is ItemWithLocation => o !== null));
      } catch (err) {
        console.error('Failed to build item options', err);
        setItemOptions([]);
      }
    };

    buildItemOptions();
  }, [itemsInSelectedWarehouse, selectedWarehouse]);

  useEffect(() => {
    const fetchItemSlots = async () => {
      if (!selectedWarehouse || !selectedItem) {
        setItemSlots([]);
        return;
      }

      // 1️⃣ Get all items with same name in the warehouse
      const matchingItems = itemsInSelectedWarehouse.filter(
        (item) => item.name === selectedItem.name
      );

      if (matchingItems.length === 0) {
        setItemSlots([]);
        return;
      }

      setLoadingSlots(true);

      try {
        // Fetch storage locations for each item's locationId
        const slots = await Promise.all(
          matchingItems.map(async (item) => {
            const location = await getStorageLocationById(item.current_location_id);

            // 3️⃣ Only keep if the storage location belongs to the selected warehouse
            if (location.warehouse_id === selectedWarehouse.id) return location.location_code;
            return null;
          })
        );

        // Remove nulls
        const validSlotCodes = slots.filter((slot): slot is string => slot !== null);

        setItemSlots(validSlotCodes);
      } catch (err) {
        console.error('Failed to fetch item slots', err);
        setItemSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchItemSlots();
  }, [selectedItem, selectedWarehouse, itemsInSelectedWarehouse]);

  // items with the same name in storage
  const getItemsWithSameNameInWarehouse = () => {
    if (!selectedWarehouse || !selectedItem) return [];

    return itemsInSelectedWarehouse.filter((item) => item.name === selectedItem.name);
  };

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
                setSelectedItem(null);
                setSelectedOption(null);
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
                  options={itemOptions}
                  value={selectedOption}
                  onChange={(_, newValue) => {
                    setSelectedOption(newValue);
                    setSelectedItem(newValue?.item ?? null);
                    setSelectedLocationCode(newValue?.locationCode ?? '');
                  }}
                  isOptionEqualToValue={(option, value) => option.item.id === value.item.id}
                  getOptionLabel={(option) => option.item.name}
                  renderOption={(props, option) => (
                    <li {...props} key={option.item.id}>
                      <Box>
                        <Typography fontWeight={500}>{option.item.name}</Typography>
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
                  if (!selectedItem) return;

                  const raw = e.target.value;

                  if (raw === '') {
                    setQuantityToRemove(null);
                    return;
                  }

                  const val = Number(raw);
                  setQuantityToRemove(Math.min(Math.max(val, 0), selectedItem.quantity));
                }}
                fullWidth
                inputProps={{ min: 0, max: selectedItem?.quantity ?? 0 }}
                helperText={
                  selectedItem ? `Available: ${selectedItem.quantity}` : 'Select an item first'
                }
                disabled={!selectedItem}
              />
            </FormControl>
            {/* Move to Limbo */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={moveToLimbo}
                  onChange={(e) => setMoveToLimbo(e.target.checked)}
                  disabled={!selectedItem}
                />
              }
              label="Move Item to Limbo"
            />
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
                  setSelectedItem(null);
                  setSelectedOption(null);
                  setQuantityToRemove(0);
                  setMoveToLimbo(false);
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
