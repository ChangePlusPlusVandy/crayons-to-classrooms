import { useEffect, useState } from 'react';
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
  getProducts,
} from '../../api/moveItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Item } from '../../types/Item';
import { Product } from '../../types/Product';
import { MoveItemFormLabel } from './MoveItem.styles';
import { WarehouseSelector } from '../../components/WarehouseSelector/WarehouseSelector';

export default function MoveItem() {
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedSourceSlot, setSelectedSourceSlot] = useState<StorageLocation | null>(null);
  const [itemsInSourceSlot, setItemsInSourceSlot] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedToSlot, setSelectedToSlot] = useState<StorageLocation | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch storage locations and products on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [locationsData, productsData] = await Promise.all([
          getStorageLocations(),
          getProducts(),
        ]);
        setStorageLocations(locationsData);
        setProducts(productsData);
      } catch (err) {
        setError('Failed to load initial data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Fetch all items when warehouse is selected (for product name search)
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

  // Helper function to get product name
  const getProductName = (productId: string): string => {
    const product = products.find((p) => p.id === productId);
    return product?.name || 'Unknown Product';
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

    // TODO: Optimize if needed
    return options.filter((location) => {
      // Match by location code
      if (location.location_code?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Match by product name of items at this location
      const itemsAtLocation = allItems.filter((item) => item.current_location_id === location.id);

      return itemsAtLocation.some((item) => {
        const product = products.find((p) => p.id === item.product_id);
        return product?.name?.toLowerCase().includes(searchTerm);
      });
    });
  };

  // Get filtered storage locations for selected warehouse (for source and destination)
  const warehouseLocations = selectedWarehouse
    ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
    : [];

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
      // Create inventory movement
      await createInventoryMovement({
        inventory_action: 'MOVE',
        item_id: selectedItem.id,
        product_id: selectedItem.product_id,
        from_location_id: selectedItem.current_location_id,
        to_location_id: selectedToSlot.id,
        quantity: selectedItem.quantity,
        performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID
        note: notes || undefined,
      });

      // Update item location
      await updateItemLocation(selectedItem.id, selectedToSlot.id); // TODO: Should this be in a transaction with createInventoryMovement?

      setSuccess('Item moved successfully!');
      // Reset form (keep warehouse selected for convenience)
      setSelectedSourceSlot(null);
      setItemsInSourceSlot([]);
      setSelectedItem(null);
      setSelectedToSlot(null);
      setNotes('');
    } catch (err) {
      setError('Failed to move item. Please try again.');
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
              setError('');
            }}
            label="Warehouse"
            placeholder="Select warehouse"
            fullWidth
          />

          <FormControl fullWidth disabled={!selectedWarehouse}>
            <MoveItemFormLabel htmlFor="source-slot-select">
              Source Slot (Search by location code or product name)
            </MoveItemFormLabel>
            <Autocomplete
              id="source-slot-select"
              options={warehouseLocations}
              getOptionLabel={(option) => option.location_code ?? 'No location code'} // TODO: render a nicer tile with more information (eg preview of items in this location)
              getOptionKey={(option) => option.id} // TODO: should we enforce nonnull unique location codes per warehouse
              filterOptions={filterSourceSlotOptions}
              value={selectedSourceSlot}
              onChange={(_, newValue) => {
                setSelectedSourceSlot(newValue);
                setItemsInSourceSlot([]);
                setSelectedItem(null);
                setError('');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    !selectedWarehouse
                      ? 'Select warehouse first'
                      : 'Search by slot code or product name'
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
              getOptionLabel={(option) =>
                `${getProductName(option.product_id)} - Qty: ${option.quantity}`
              } // TODO: render a nicer tile with more information
              value={selectedItem}
              onChange={(_, newValue) => {
                setSelectedItem(newValue);
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
