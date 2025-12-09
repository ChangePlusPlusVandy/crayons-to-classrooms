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
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  getWarehouses,
  getStorageLocations,
  getItemsByLocation,
  createInventoryMovement,
  updateItemLocation,
} from '../../api/moveItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Item } from '../../types/Item';
import { FormContainer, FormField, InfoBox } from './MoveItem.styles';

export default function MoveItem() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedToSlot, setSelectedToSlot] = useState<StorageLocation | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch warehouses and storage locations on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [warehousesData, locationsData] = await Promise.all([
          getWarehouses(),
          getStorageLocations(),
        ]);
        setWarehouses(warehousesData);
        setStorageLocations(locationsData);
      } catch (err) {
        setError('Failed to load initial data.');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Fetch items when warehouse is selected
  useEffect(() => {
    async function fetchItems() {
      if (!selectedWarehouse) {
        setAllItems([]);
        return;
      }

      try {
        setError('');
        const warehouseLocations = storageLocations.filter(
          (loc) => loc.warehouse_id === selectedWarehouse.id
        );

        // TODO: there should be a way to do this with fewer requests
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

    fetchItems();
  }, [selectedWarehouse, storageLocations]);

  // Get filtered storage locations for selected warehouse
  const warehouseLocations = selectedWarehouse
    ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
    : [];

  // Get from slot location based on selected item
  const fromSlot = selectedItem
    ? storageLocations.find((loc) => loc.id === selectedItem.current_location_id)
    : null;

  const handleSubmit = async () => {
    // Validation
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
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
    if (fromSlot?.id === selectedToSlot.id) {
      setError('Destination slot must be different from the current slot.');
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
        performed_by: '00000000-0000-0000-0000-000000000000', // TODO: Placeholder user ID
        note: notes || undefined,
      });

      // Update item location
      await updateItemLocation(selectedItem.id, selectedToSlot.id); // TODO: Should this be in a transaction with createInventoryMovement?

      setSuccess('Item moved successfully!');
      // Reset form
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

      <FormContainer>
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

        <FormField>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            Warehouse
          </Typography>
          <Autocomplete
            options={warehouses}
            getOptionLabel={(option) => option.name || 'Unknown Warehouse'}
            value={selectedWarehouse}
            onChange={(_, newValue) => {
              setSelectedWarehouse(newValue);
              setSelectedItem(null);
              setSelectedToSlot(null);
              setError('');
            }}
            renderInput={(params) => <TextField {...params} placeholder="Select warehouse" />}
          />
        </FormField>

        <FormField>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            Item
          </Typography>
          <Autocomplete
            options={allItems}
            getOptionLabel={(option) =>
              `Item ID: ${option.id.substring(0, 8)}... - Product: ${option.product_id.substring(0, 8)}... - Qty: ${option.quantity}`
            }
            value={selectedItem}
            onChange={(_, newValue) => {
              setSelectedItem(newValue);
              setSelectedToSlot(null);
              setError('');
            }}
            disabled={!selectedWarehouse || allItems.length === 0}
            renderInput={(params) => <TextField {...params} placeholder="Enter or select item" />}
          />
        </FormField>

        <FormField>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            From Slot
          </Typography>
          <TextField
            fullWidth
            value={selectedItem ? fromSlot?.location_code || 'No current location' : ''}
            placeholder="Select Item to See Slot"
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
            disabled
          />
        </FormField>

        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <ArrowDownwardIcon sx={{ fontSize: '2rem', color: 'text.secondary' }} />
        </Box>

        <FormField>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            To Slot
          </Typography>
          <Autocomplete
            options={warehouseLocations}
            getOptionLabel={(option) => option.location_code ?? 'No location code'}
            value={selectedToSlot}
            onChange={(_, newValue) => {
              setSelectedToSlot(newValue);
              setError('');
            }}
            disabled={!selectedWarehouse}
            renderInput={(params) => <TextField {...params} placeholder="Enter or select slot" />}
          />
        </FormField>
        <FormField>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            Notes
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter notes"
          />
        </FormField>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              setSelectedWarehouse(null);
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
            onClick={handleSubmit}
            disabled={submitting || !selectedWarehouse || !selectedItem || !selectedToSlot}
          >
            {submitting ? <CircularProgress size={24} /> : 'Confirm Move'}
          </Button>
        </Box>
      </FormContainer>
    </Container>
  );
}
