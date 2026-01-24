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
import AddIcon from '@mui/icons-material/Add';
import {
  getStorageLocations,
  getItemsByLocation,
  createInventoryMovement,
  updateItemLocation,
  groupItemsByLocation,
} from '../../api/moveItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Item, ItemGroup } from '../../types/Item';
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
  const [itemGroupsInSourceSlot, setItemGroupsInSourceSlot] = useState<ItemGroup[]>([]);
  const [selectedItemGroup, setSelectedItemGroup] = useState<ItemGroup | null>(null);
  const [selectedDestinationSlot, setSelectedDestinationSlot] = useState<string | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<string | null>(null);
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
        setItemGroupsInSourceSlot([]);
        return;
      }

      try {
        const items = await getItemsByLocation(selectedSourceSlot.id);
        setItemsInSourceSlot(items);

        // Generate groups for display
        const groups = groupItemsByLocation(items);
        setItemGroupsInSourceSlot(groups);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load items for the selected slot.');
        setItemsInSourceSlot([]);
        setItemGroupsInSourceSlot([]);
      }
    }

    fetchItemsInSlot();
  }, [selectedSourceSlot]);

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

    return options.filter((location) => {
      // Match by location code
      if (location.location_code?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Match by item name of items at this location
      const itemsAtLocation = getItemsForLocation(location.id);

      return itemsAtLocation.some((item) => {
        return item.name?.toLowerCase().includes(searchTerm);
      });
    });
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
  const warehouseLocations = useMemo(
    () =>
      selectedWarehouse
        ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
        : [],
    [selectedWarehouse, storageLocations]
  );

  // Get deduplicated slots for selected warehouse
  const availableDestinationSlots = useMemo(() => {
    if (!selectedWarehouse) return [];

    const slotSet = new Set<string>();
    warehouseLocations.forEach((loc) => {
      if (loc.slot && loc.slot.trim() !== '') {
        slotSet.add(loc.slot);
      }
    });

    return Array.from(slotSet).sort();
  }, [selectedWarehouse, warehouseLocations]);

  // Get fixtures for selected destination slot
  const availableFixtures = useMemo(() => {
    if (!selectedWarehouse || !selectedDestinationSlot) return [];

    const fixtureSet = new Set<string>();
    let hasNullFixture = false;

    warehouseLocations
      .filter((loc) => loc.slot === selectedDestinationSlot)
      .forEach((loc) => {
        if (loc.fixture && loc.fixture.trim() !== '') {
          fixtureSet.add(loc.fixture);
        } else {
          hasNullFixture = true;
        }
      });

    const fixtures = Array.from(fixtureSet).sort();

    // Add "N/A" option at the beginning if there are locations with null/empty fixtures
    if (hasNullFixture) {
      fixtures.unshift('N/A');
    }

    return fixtures;
  }, [selectedWarehouse, selectedDestinationSlot, warehouseLocations]);

  useEffect(() => {
    if (availableFixtures.includes('N/A')) {
      setSelectedFixture('N/A');
    } else {
      setSelectedFixture(null);
    }
  }, [availableFixtures]);

  // Helper to check if quantity is valid
  const isQuantityValid = (): boolean => {
    if (!selectedItemGroup) return false;
    return quantityToMove >= 1 && quantityToMove <= selectedItemGroup.quantity;
  };

  // Helper to get quantity error message
  const getQuantityError = (): string => {
    if (!selectedItemGroup) return '';
    if (quantityToMove < 1) return 'Quantity must be at least 1';
    if (quantityToMove > selectedItemGroup.quantity) {
      return `Cannot exceed ${selectedItemGroup.quantity} available`;
    }
    return '';
  };

  const handleSubmit = async () => {
    const destinationLocation = warehouseLocations.find((loc) => {
      if (selectedFixture === 'N/A') {
        return loc.slot === selectedDestinationSlot && (!loc.fixture || loc.fixture.trim() === '');
      }
      return loc.slot === selectedDestinationSlot && loc.fixture === selectedFixture;
    });

    // Validation
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!selectedSourceSlot) {
      setError('Please select a source slot.');
      return;
    }
    if (!selectedItemGroup) {
      setError('Please select an item.');
      return;
    }
    if (!quantityToMove || quantityToMove < 1) {
      setError('Please enter a valid quantity (at least 1).');
      return;
    }
    if (quantityToMove > selectedItemGroup.quantity) {
      setError(`Cannot move more than ${selectedItemGroup.quantity} available.`);
      return;
    }
    if (!selectedDestinationSlot || !selectedFixture) {
      setError('Please select a destination slot and fixture.');
      return;
    }

    if (!destinationLocation) {
      setError('Invalid destination location.');
      return;
    }

    if (selectedSourceSlot.id === destinationLocation.id) {
      setError('Destination slot must be different from the source slot.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const itemsInGroup = itemsInSourceSlot.filter(
        (item) =>
          item.warehouse === selectedItemGroup.warehouse &&
          item.current_location_id === selectedItemGroup.current_location_id &&
          item.name === selectedItemGroup.name
      );

      const itemsToMove = itemsInGroup
        .sort((a, b) => b.created_at.localeCompare(a.created_at)) // descending by date
        .slice(0, quantityToMove);

      if (itemsToMove.length !== quantityToMove) {
        throw new Error('Insufficient items in group to move');
      }

      // TODO: Replace with batch update API endpoint when available
      await Promise.all(
        itemsToMove.map((item) => updateItemLocation(item.id, destinationLocation.id))
      );

      // Record one inventory movement for the entire operation
      // Use the first item's ID and product_id as representative
      const representativeItem = itemsToMove[0];
      await createInventoryMovement({
        inventory_action: 'MOVE',
        item_id: representativeItem.id,
        product_id: representativeItem.product_id,
        from_location_id: selectedSourceSlot.id,
        to_location_id: destinationLocation.id,
        quantity: quantityToMove,
        performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID
        note: notes || undefined,
      });

      setSuccess('Item moved successfully!');
      // Reset form (resetting warehouse triggers refetch)
      setSelectedWarehouse(null);
      setSelectedSourceSlot(null);
      setItemsInSourceSlot([]);
      setItemGroupsInSourceSlot([]);
      setSelectedItemGroup(null);
      setSelectedDestinationSlot(null);
      setSelectedFixture(null);
      setNotes('');
      setQuantityToMove(0);
    } catch (err: unknown) {
      console.error('Error moving item:', err);
      const errorMessage =
        err instanceof Error && err.message
          ? `Failed to move item. ${err.message}`
          : 'Failed to move item. Please check the inventory and try again.';
      setError(errorMessage);
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
        <Typography variant="h4" sx={{ mb: 3, textAlign: 'left' }}>
          Move Item
        </Typography>
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
              setItemGroupsInSourceSlot([]);
              setSelectedItemGroup(null);
              setSelectedDestinationSlot(null);
              setSelectedFixture(null);
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
              getOptionKey={(option) => option.id}
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
                setItemGroupsInSourceSlot([]);
                setSelectedItemGroup(null);
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

          <FormControl fullWidth disabled={!selectedSourceSlot}>
            <MoveItemFormLabel htmlFor="item-in-slot-select">Item in Source Slot</MoveItemFormLabel>
            <Autocomplete
              id="item-in-slot-select"
              options={itemGroupsInSourceSlot}
              getOptionLabel={(option) => `${option.name} - Qty: ${option.quantity} items`}
              value={selectedItemGroup}
              onChange={(_, newValue) => {
                setSelectedItemGroup(newValue);
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
              disabled={!selectedSourceSlot}
            />
          </FormControl>

          <FormControl
            fullWidth
            disabled={!selectedItemGroup}
            error={selectedItemGroup ? !isQuantityValid() : false}
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
              placeholder={!selectedItemGroup ? 'Select item first' : 'Enter quantity'}
              disabled={!selectedItemGroup}
              error={selectedItemGroup ? !isQuantityValid() : false}
              helperText={
                selectedItemGroup
                  ? getQuantityError() || `${selectedItemGroup.quantity} items available`
                  : ''
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: selectedItemGroup?.quantity ?? 0,
                  step: 1,
                },
              }}
            />
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <ArrowDownwardIcon
              aria-hidden="true"
              sx={{ fontSize: '2rem', color: 'text.secondary' }}
            />
          </Box>
          <Stack spacing={0}>
            <FormControl fullWidth disabled={!selectedWarehouse}>
              <MoveItemFormLabel htmlFor="toslot-input">Destination Slot</MoveItemFormLabel>
              <Autocomplete
                id="toslot-input"
                options={availableDestinationSlots}
                getOptionLabel={(option) => option}
                value={selectedDestinationSlot}
                onChange={(_, newValue) => {
                  setSelectedDestinationSlot(newValue);
                  // Cascade: clear fixture when destination slot changes
                  setSelectedFixture(null);
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
                noOptionsText="No slots available"
              />
              <Button
                startIcon={<AddIcon />}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'primary.main',
                  marginTop: 0,
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
                onClick={() => {
                  // Does nothing for now
                }}
                disabled={!selectedWarehouse}
              >
                New Slot
              </Button>
            </FormControl>

            <FormControl
              fullWidth
              disabled={!selectedDestinationSlot}
              sx={{
                marginTop: 0,
              }}
            >
              <MoveItemFormLabel htmlFor="fixture-input">Fixture</MoveItemFormLabel>
              <Autocomplete
                id="fixture-input"
                options={availableFixtures}
                getOptionLabel={(option) => option}
                value={selectedFixture}
                onChange={(_, newValue) => {
                  setSelectedFixture(newValue);
                  setError('');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={
                      !selectedDestinationSlot ? 'Select destination slot first' : 'Select fixture'
                    }
                  />
                )}
                disabled={!selectedDestinationSlot}
                noOptionsText="No fixtures available"
              />
            </FormControl>
          </Stack>
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
                setItemGroupsInSourceSlot([]);
                setSelectedItemGroup(null);
                setSelectedDestinationSlot(null);
                setSelectedFixture(null);
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
                !selectedItemGroup ||
                !isQuantityValid() ||
                !selectedDestinationSlot ||
                !selectedFixture
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
