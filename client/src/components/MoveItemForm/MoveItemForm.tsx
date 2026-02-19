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
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import {
  getStorageLocations,
  getItemsByLocation,
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
} from './MoveItemForm.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';
import { FixtureSelector } from '../FixtureSelector/FixtureSelector';

export interface MoveItemFormData {
  warehouse: Warehouse;
  sourceSlot: StorageLocation;
  itemGroup: ItemGroup;
  destinationLocationId: string;
  quantity: number;
  notes: string;
}

interface MoveItemFormProps {
  initialWarehouse?: Warehouse | null;
  initialSourceSlot?: StorageLocation | null;
  initialProductName?: string | null;
  initialDestinationSlot?: string | null;
  initialDestinationFixture?: string | null;
  initialQuantity?: number;
  initialNotes?: string;
  onSubmit: (data: MoveItemFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  adjustItemGroups?: (groups: ItemGroup[], sourceSlotId: string) => ItemGroup[];
}

export default function MoveItemForm({
  initialWarehouse = null,
  initialSourceSlot = null,
  initialProductName = null,
  initialDestinationSlot = null,
  initialDestinationFixture = null,
  initialQuantity,
  initialNotes = '',
  onSubmit,
  onCancel,
  submitLabel = 'Confirm Move',
  adjustItemGroups,
}: MoveItemFormProps) {
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedSourceSlot, setSelectedSourceSlot] = useState<StorageLocation | null>(initialSourceSlot);
  const [itemsInSourceSlot, setItemsInSourceSlot] = useState<Item[]>([]);
  const [itemGroupsInSourceSlot, setItemGroupsInSourceSlot] = useState<ItemGroup[]>([]);
  const [selectedItemGroup, setSelectedItemGroup] = useState<ItemGroup | null>(null);
  const [selectedDestinationSlot, setSelectedDestinationSlot] = useState<string | null>(initialDestinationSlot);
  const [selectedFixture, setSelectedFixture] = useState<string | null>(initialDestinationFixture);
  const [notes, setNotes] = useState(initialNotes);
  const [quantityToMove, setQuantityToMove] = useState<number>(initialQuantity ?? 0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Track whether we still need to auto-select the item group from initialProductName
  const [pendingAutoSelect, setPendingAutoSelect] = useState(!!initialProductName);

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

        // Generate groups for display, with optional adjustment from parent
        let groups = groupItemsByLocation(items);
        if (adjustItemGroups) {
          groups = adjustItemGroups(groups, selectedSourceSlot.id);
        }
        setItemGroupsInSourceSlot(groups);

        // Auto-select item group if initialProductName is provided
        if (pendingAutoSelect && initialProductName) {
          const matchingGroup = groups.find((g) => g.name === initialProductName);
          if (matchingGroup) {
            setSelectedItemGroup(matchingGroup);
            if (initialQuantity === undefined) {
              setQuantityToMove(matchingGroup.quantity);
            }
          }
          setPendingAutoSelect(false);
        }
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
  const filterSourceSlotOptions = (
    options: StorageLocation[],
    state: { inputValue: string }
  ): StorageLocation[] => {
    const searchTerm = state.inputValue.toLowerCase().trim();

    if (!searchTerm) {
      return options;
    }

    return options.filter((location) => {
      if (location.location_code?.toLowerCase().includes(searchTerm)) {
        return true;
      }

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
    const uniqueNames = Array.from(new Set(itemNames));

    if (searchTerm?.trim()) {
      const lowerSearch = searchTerm.toLowerCase().trim();
      uniqueNames.sort((a, b) => {
        const aMatches = a.toLowerCase().includes(lowerSearch);
        const bMatches = b.toLowerCase().includes(lowerSearch);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

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

  // Compute warehouseLocations for form submission and source slot filtering
  const warehouseLocations = useMemo(() => {
    return selectedWarehouse
      ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
      : [];
  }, [selectedWarehouse, storageLocations]);

  const isQuantityValid = (): boolean => {
    if (!selectedItemGroup) return false;
    return quantityToMove >= 1 && quantityToMove <= selectedItemGroup.quantity;
  };

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

    try {
      await onSubmit({
        warehouse: selectedWarehouse,
        sourceSlot: selectedSourceSlot,
        itemGroup: selectedItemGroup,
        destinationLocationId: destinationLocation.id,
        quantity: quantityToMove,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      spacing={3}
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
        >
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
        </SlotSelector>

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
          onClick={onCancel}
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
          {submitting ? <CircularProgress size={24} /> : submitLabel}
        </Button>
      </Box>
    </Stack>
  );
}
