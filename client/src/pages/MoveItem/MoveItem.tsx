import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Autocomplete,
  Paper,
  Stack,
  FormControl,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  getStorageLocations,
  getItemsByLocation,
  createInventoryMovement,
  updateItemLocation,
  createItem,
  updateItemQuantity,
} from '../../api/moveItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Item } from '../../types/Item';
import {
  MoveItemFormLabel,
  SourceSlotOptionContainer,
  LocationCodeText,
  ItemListText,
  HighlightedText,
} from './MoveItem.styles';
import { WarehouseSelector } from '../../components/WarehouseSelector/WarehouseSelector';

export default function MoveItem() {
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedSourceSlot, setSelectedSourceSlot] = useState<StorageLocation | null>(null);
  const [itemsInSourceSlot, setItemsInSourceSlot] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedToSlot, setSelectedToSlot] = useState<StorageLocation | null>(null);
  const [notes, setNotes] = useState('');
  const [quantityToMove, setQuantityToMove] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch storage locations on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const locationsData = await getStorageLocations();
        setStorageLocations(locationsData);
      } catch (err) {
        setError('Failed to load initial data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Fetch all items when warehouse is selected (for item name search)
  useEffect(() => {
    async function fetchWarehouseItems() {
      if (!selectedWarehouse) {
        setAllItems([]);
        return;
      }

      try {
        setError('');
        const warehouseLocations = storageLocations.filter(
          (loc) => loc.warehouse_id === selectedWarehouse.id
        );

        // TODO: Kiersten's PR will allow directly fetching items by warehouse id
        const itemsPromises = warehouseLocations.map((loc) =>
          getItemsByLocation(loc.id).catch(() => [])
        );
        const itemsArrays = await Promise.all(itemsPromises);
        const items = itemsArrays.flat();
        setAllItems(items);
      } catch (err) {
        setError('Failed to load items for the selected warehouse.');
      }
    }

    fetchWarehouseItems();
  }, [selectedWarehouse, storageLocations]);

  // Fetch items when source slot is selected
  useEffect(() => {
    async function fetchItemsInSlot() {
      if (!selectedSourceSlot) {
        setItemsInSourceSlot([]);
        return;
      }

      try {
        const items = await getItemsByLocation(selectedSourceSlot.id);
        setItemsInSourceSlot(items);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load items for the selected slot.');
        setItemsInSourceSlot([]);
      }
    }

    fetchItemsInSlot();
  }, [selectedSourceSlot]);

  // Custom filter for Source Slot Autocomplete
  // Searches by: location_code OR product names of items in that location
  const filterSourceSlotOptions = (
    options: StorageLocation[],
    state: { inputValue: string }
  ): StorageLocation[] => {
    const searchTerm = state.inputValue.toLowerCase().trim();

    if (!searchTerm) {
      return options;
    }

    // TODO: Optimize if needed
    return options.filter((location) => {
      // Match by location code
      if (location.location_code?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Match by item name of items at this location
      const itemsAtLocation = allItems.filter((item) => item.current_location_id === location.id);

      return itemsAtLocation.some((item) => {
        return item.name?.toLowerCase().includes(searchTerm);
      });
    });
  };

  // Create location-to-items map for efficient lookup
  const locationItemsMap = useMemo(() => {
    const map = new Map<string, Item[]>();

    allItems.forEach((item) => {
      const locationId = item.current_location_id;
      if (!map.has(locationId)) {
        map.set(locationId, []);
      }
      map.get(locationId)!.push(item);
    });

    return map;
  }, [allItems]);

  // Helper to get items for a location
  const getItemsForLocation = (locationId: string): Item[] => {
    return locationItemsMap.get(locationId) || [];
  };

  // Helper to format item names for display
  const getItemNamesForLocation = (locationId: string, searchTerm?: string): string => {
    const items = getItemsForLocation(locationId);

    if (items.length === 0) {
      return 'No items';
    }

    const itemNames = items.map((item) => item.name).filter((name) => name && name.trim() !== '');

    // Remove duplicates
    const uniqueNames = Array.from(new Set(itemNames));

    // Sort: matched items first, then non-matched
    if (searchTerm?.trim()) {
      const lowerSearch = searchTerm.toLowerCase().trim();
      uniqueNames.sort((a, b) => {
        const aMatches = a.toLowerCase().includes(lowerSearch);
        const bMatches = b.toLowerCase().includes(lowerSearch);
        if (aMatches && !bMatches) return -1; // a first
        if (!aMatches && bMatches) return 1; // b first
        return 0; // maintain original order
      });
    }

    // Limit display to prevent overly long lines
    const MAX_DISPLAY = 5;
    if (uniqueNames.length > MAX_DISPLAY) {
      const displayed = uniqueNames.slice(0, MAX_DISPLAY);
      const remaining = uniqueNames.length - MAX_DISPLAY;
      return `${displayed.join(', ')} + ${remaining} more`;
    }

    return uniqueNames.join(', ');
  };

  // Helper to highlight matching text
  const highlightText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) {
      return text;
    }

    const lowerText = text.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase().trim();
    const index = lowerText.indexOf(lowerSearch);

    if (index === -1) {
      return text;
    }

    // Split text into: before match, match, after match
    const before = text.slice(0, index);
    const match = text.slice(index, index + lowerSearch.length);
    const after = text.slice(index + lowerSearch.length);

    return (
      <>
        {before}
        <HighlightedText>{match}</HighlightedText>
        {after}
      </>
    );
  };

  // Get filtered storage locations for selected warehouse (for source and destination)
  const warehouseLocations = selectedWarehouse
    ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
    : [];

  // Helper to check if quantity is valid
  const isQuantityValid = (): boolean => {
    if (!selectedItem) return false;
    return quantityToMove >= 1 && quantityToMove <= selectedItem.quantity;
  };

  // Helper to get quantity error message
  const getQuantityError = (): string => {
    if (!selectedItem) return '';
    if (quantityToMove < 1) return 'Quantity must be at least 1';
    if (quantityToMove > selectedItem.quantity) {
      return `Cannot exceed ${selectedItem.quantity} available`;
    }
    return '';
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!selectedSourceSlot) {
      setError('Please select a source slot.');
      return;
    }
    if (!selectedItem) {
      setError('Please select an item.');
      return;
    }
    if (!quantityToMove || quantityToMove < 1) {
      setError('Please enter a valid quantity (at least 1).');
      return;
    }
    if (quantityToMove > selectedItem.quantity) {
      setError(`Cannot move more than ${selectedItem.quantity} available.`);
      return;
    }
    if (!selectedToSlot) {
      setError('Please select a destination slot.');
      return;
    }
    if (selectedSourceSlot.id === selectedToSlot.id) {
      setError('Destination slot must be different from the source slot.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const isFullMove = quantityToMove === selectedItem.quantity;

      if (isFullMove) {
        // Case 1: Moving entire item quantity
        // Just update location, no need to split
        await updateItemLocation(selectedItem.id, selectedToSlot.id);

        // Record movement with source item ID
        await createInventoryMovement({
          inventory_action: 'MOVE',
          item_id: selectedItem.id,
          product_id: selectedItem.product_id,
          from_location_id: selectedItem.current_location_id,
          to_location_id: selectedToSlot.id,
          quantity: quantityToMove,
          performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID
          note: notes || undefined,
        });
      } else {
        // Case 2: Partial move - need to split item

        // Step 1: Create new item at destination with partial quantity
        const newItem = await createItem({
          product_id: selectedItem.product_id,
          quantity: quantityToMove,
          current_location_id: selectedToSlot.id,
          status: selectedItem.status,
          created_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID
        });

        // Step 2: Reduce source item quantity
        const remainingQuantity = selectedItem.quantity - quantityToMove;
        await updateItemQuantity(selectedItem.id, remainingQuantity);

        // Step 3: Record movement with NEW item's ID (not source item's ID!)
        await createInventoryMovement({
          inventory_action: 'MOVE',
          item_id: newItem.id,
          product_id: selectedItem.product_id,
          from_location_id: selectedItem.current_location_id,
          to_location_id: selectedToSlot.id,
          quantity: quantityToMove,
          performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID
          note: notes || undefined,
        });
      }

      setSuccess('Item moved successfully!');
      // Reset form (keep warehouse selected for convenience)
      setSelectedSourceSlot(null);
      setItemsInSourceSlot([]);
      setSelectedItem(null);
      setSelectedToSlot(null);
      setNotes('');
      setQuantityToMove(0);
    } catch (err) {
      console.error('Error moving item:', err);
      setError(
        'Failed to move item. Please check the inventory and try again. ' +
          'If the item was partially updated, you may need to verify the inventory manually.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
        Move Item
      </Typography>

      <Paper
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 2,
          maxWidth: 600,
          mx: 'auto',
        }}
        elevation={2}
      >
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <WarehouseSelector
            value={selectedWarehouse}
            onChange={(newWarehouse) => {
              setSelectedWarehouse(newWarehouse);
              // Cascade reset
              setSelectedSourceSlot(null);
              setItemsInSourceSlot([]);
              setSelectedItem(null);
              setSelectedToSlot(null);
              setQuantityToMove(0);
              setError('');
            }}
            label="Warehouse"
            placeholder="Select warehouse"
            fullWidth
          />

          <FormControl fullWidth disabled={!selectedWarehouse}>
            <MoveItemFormLabel htmlFor="source-slot-select">
              Source Slot (Search by location code or item name)
            </MoveItemFormLabel>
            <Autocomplete
              id="source-slot-select"
              options={warehouseLocations}
              getOptionLabel={(option) => option.location_code ?? 'No location code'}
              getOptionKey={(option) => option.id} // TODO: should we enforce nonnull unique location codes per warehouse
              filterOptions={filterSourceSlotOptions}
              renderOption={(props, option, state) => {
                const { key, ...otherProps } = props;
                const locationCode = option.location_code ?? 'No location code';
                const searchTerm = state.inputValue;
                const itemNames = getItemNamesForLocation(option.id, searchTerm);

                return (
                  <li key={key} {...otherProps}>
                    <SourceSlotOptionContainer>
                      <LocationCodeText>{highlightText(locationCode, searchTerm)}</LocationCodeText>
                      <ItemListText>{highlightText(itemNames, searchTerm)}</ItemListText>
                    </SourceSlotOptionContainer>
                  </li>
                );
              }}
              value={selectedSourceSlot}
              onChange={(_, newValue) => {
                setSelectedSourceSlot(newValue);
                setItemsInSourceSlot([]);
                setSelectedItem(null);
                setQuantityToMove(0);
                setError('');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    !selectedWarehouse
                      ? 'Select warehouse first'
                      : 'Search by slot code or item name'
                  }
                />
              )}
              noOptionsText="No matching slots found"
              disabled={!selectedWarehouse}
            />
          </FormControl>

          <FormControl fullWidth disabled={!selectedSourceSlot || itemsInSourceSlot.length === 0}>
            <MoveItemFormLabel htmlFor="item-in-slot-select">Item in Source Slot</MoveItemFormLabel>
            <Autocomplete
              id="item-in-slot-select"
              options={itemsInSourceSlot}
              getOptionLabel={(option) => `${option.name} - Qty: ${option.quantity}`} // TODO: render a nicer tile with more information
              value={selectedItem}
              onChange={(_, newValue) => {
                setSelectedItem(newValue);
                // Auto-populate quantity with the full available quantity
                setQuantityToMove(newValue?.quantity ?? 0);
                setError('');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    !selectedSourceSlot ? 'Select source slot first' : 'Select item to move'
                  }
                />
              )}
              noOptionsText="No matching items found"
              disabled={!selectedSourceSlot || itemsInSourceSlot.length === 0}
            />
          </FormControl>

          <FormControl
            fullWidth
            disabled={!selectedItem}
            error={selectedItem ? !isQuantityValid() : false}
          >
            <MoveItemFormLabel htmlFor="quantity-input">Quantity to Move</MoveItemFormLabel>
            <TextField
              id="quantity-input"
              type="number"
              fullWidth
              value={quantityToMove || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setQuantityToMove(isNaN(value) ? 0 : value);
              }}
              placeholder={!selectedItem ? 'Select item first' : 'Enter quantity'}
              disabled={!selectedItem}
              error={selectedItem ? !isQuantityValid() : false}
              helperText={
                selectedItem ? getQuantityError() || `${selectedItem.quantity} available` : ''
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: selectedItem?.quantity ?? 0,
                  step: 1,
                },
              }}
            />
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <ArrowDownwardIcon sx={{ fontSize: '2rem', color: 'text.secondary' }} />
          </Box>

          <FormControl fullWidth disabled={!selectedWarehouse}>
            <MoveItemFormLabel htmlFor="to-slot-input">To Slot</MoveItemFormLabel>
            <Autocomplete
              id="to-slot-input"
              options={warehouseLocations}
              getOptionLabel={(option) => option.location_code ?? 'No location code'}
              value={selectedToSlot}
              onChange={(_, newValue) => {
                setSelectedToSlot(newValue);
                setError('');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    !selectedWarehouse ? 'Select warehouse first' : 'Select destination slot'
                  }
                />
              )}
              disabled={!selectedWarehouse}
            />
          </FormControl>
          <FormControl fullWidth>
            <MoveItemFormLabel htmlFor="notes-input">Notes</MoveItemFormLabel>
            <TextField
              id="notes-input"
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
            />
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setSelectedWarehouse(null);
                setSelectedSourceSlot(null);
                setItemsInSourceSlot([]);
                setSelectedItem(null);
                setSelectedToSlot(null);
                setNotes('');
                setQuantityToMove(0);
                setError('');
                setSuccess('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              fullWidth
              type="submit"
              disabled={
                submitting ||
                !selectedWarehouse ||
                !selectedSourceSlot ||
                !selectedItem ||
                !isQuantityValid() ||
                !selectedToSlot
              }
            >
              {submitting ? <CircularProgress size={24} /> : 'Confirm Move'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
