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
import {
  getProducts,
  getStorageLocations,
  createItem,
  createInventoryMovement,
} from '../../api/addItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Product } from '../../types/Product';
import {
  AddItemFormLabel,
  ProductOptionContainer,
  ProductNameText,
  ProductDetailsText,
  HighlightedText,
} from './AddItem.styles';
import { WarehouseSelector } from '../../components/WarehouseSelector/WarehouseSelector';

export default function AddItem() {
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  // Form states
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState('');
  const [itemLimit, setItemLimit] = useState<number | ''>('');
  const [value, setValue] = useState<number | ''>('');
  const [packSize, setPackSize] = useState<number | ''>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<string | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // UI states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch initial data on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [productsData, locationsData] = await Promise.all([
          getProducts(),
          getStorageLocations(),
        ]);
        setProducts(productsData);
        setStorageLocations(locationsData);
      } catch (err) {
        setError('Failed to load initial data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Autopopulate fields when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setCategory(selectedProduct.category || '');
      setItemLimit(
        typeof selectedProduct.item_limit === 'string'
          ? parseInt(selectedProduct.item_limit, 10) || ''
          : selectedProduct.item_limit || ''
      );
      setValue(selectedProduct.value || '');
      // Pack size comes from product's unit quantity - using a default of 1 if not specified
      setPackSize(1);
    }
  }, [selectedProduct]);

  // Get filtered storage locations for selected warehouse
  const warehouseLocations = selectedWarehouse
    ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
    : [];

  // Get deduplicated slots for selected warehouse
  const availableSlots = useMemo(() => {
    if (!selectedWarehouse) return [];

    const slotSet = new Set<string>();
    warehouseLocations.forEach((loc) => {
      if (loc.slot && loc.slot.trim() !== '') {
        slotSet.add(loc.slot);
      }
    });

    return Array.from(slotSet).sort();
  }, [selectedWarehouse, warehouseLocations]);

  // Get fixtures for selected slot
  const availableFixtures = useMemo(() => {
    if (!selectedWarehouse || !selectedSlot) return [];

    const fixtureSet = new Set<string>();
    let hasNullFixture = false;

    warehouseLocations
      .filter((loc) => loc.slot === selectedSlot)
      .forEach((loc) => {
        if (loc.fixture && loc.fixture.trim() !== '') {
          fixtureSet.add(loc.fixture);
        } else {
          hasNullFixture = true;
        }
      });

    const fixtures = Array.from(fixtureSet).sort();

    // Add "None" option at the beginning if there are locations with null/empty fixtures
    if (hasNullFixture) {
      fixtures.unshift('None');
    }

    return fixtures;
  }, [selectedWarehouse, selectedSlot, warehouseLocations]);

  // Helper to highlight matching text in search results
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

  // Validation helpers
  const isQuantityValid = (): boolean => {
    return typeof quantityToAdd === 'number' && quantityToAdd >= 1;
  };

  const isPackSizeValid = (): boolean => {
    return typeof packSize === 'number' && packSize >= 1;
  };

  const isFormValid = (): boolean => {
    return (
      !!selectedWarehouse &&
      !!selectedProduct &&
      !!selectedSlot &&
      !!selectedFixture &&
      isQuantityValid() &&
      isPackSizeValid() &&
      typeof value === 'number' &&
      value >= 0
    );
  };

  const handleSubmit = async () => {
    // Find the destination location based on slot and fixture
    const destinationLocation = warehouseLocations.find((loc) => {
      if (selectedFixture === 'None') {
        return loc.slot === selectedSlot && (!loc.fixture || loc.fixture.trim() === '');
      }
      return loc.slot === selectedSlot && loc.fixture === selectedFixture;
    });

    // Validation
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!selectedProduct) {
      setError('Please select an item name.');
      return;
    }
    if (!selectedSlot || !selectedFixture) {
      setError('Please select a slot and fixture.');
      return;
    }
    if (!destinationLocation) {
      setError('Invalid destination location.');
      return;
    }
    if (!isPackSizeValid()) {
      setError('Please enter a valid pack size (at least 1).');
      return;
    }
    if (!isQuantityValid()) {
      setError('Please enter a valid quantity to add (at least 1).');
      return;
    }
    if (typeof value !== 'number' || value < 0) {
      setError('Please enter a valid value.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Create the new item
      const newItem = await createItem({
        name: selectedProduct.name,
        product_id: selectedProduct.id,
        quantity: packSize as number,
        stock: quantityToAdd as number,
        current_location_id: destinationLocation.id,
        status: 'active',
        created_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID from auth context
        warehouse: selectedWarehouse.id,
        category: category || undefined,
        item_limit: typeof itemLimit === 'number' ? itemLimit : undefined,
        value: value as number,
        limbo: false,
        notes: notes || undefined,
      });

      // Create the inventory movement
      await createInventoryMovement({
        inventory_action: 'ADD',
        item_id: newItem.id,
        product_id: selectedProduct.id,
        from_location_id: null,
        to_location_id: destinationLocation.id,
        quantity: quantityToAdd as number,
        performed_by: 'b4974f63-ee89-42a1-bdb3-ce9df255c682', // TODO: Get user ID from auth context
        note: notes || undefined,
      });

      setSuccess('Item added successfully!');

      // Reset form (keep warehouse selected for convenience)
      setSelectedProduct(null);
      setCategory('');
      setItemLimit('');
      setValue('');
      setPackSize('');
      setSelectedSlot(null);
      setSelectedFixture(null);
      setQuantityToAdd('');
      setNotes('');
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
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
          Add Item
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

          {/* Warehouse Selection */}
          <WarehouseSelector
            value={selectedWarehouse}
            onChange={(newWarehouse) => {
              setSelectedWarehouse(newWarehouse);
              // Cascade reset location fields
              setSelectedSlot(null);
              setSelectedFixture(null);
              setError('');
            }}
            label="Warehouse"
            placeholder="Select warehouse"
            fullWidth
          />

          {/* Item Name (Product) Selection */}
          <FormControl fullWidth>
            <AddItemFormLabel htmlFor="item-name-select">Item Name</AddItemFormLabel>
            <Autocomplete
              id="item-name-select"
              options={products}
              getOptionLabel={(option) => option.name || 'Unknown Product'}
              getOptionKey={(option) => option.id}
              filterOptions={(options, state) => {
                const searchTerm = state.inputValue.toLowerCase().trim();
                if (!searchTerm) return options;
                return options.filter((product) =>
                  product.name?.toLowerCase().includes(searchTerm)
                );
              }}
              renderOption={(props, option, state) => {
                const { key, ...otherProps } = props;
                const searchTerm = state.inputValue;

                return (
                  <li key={key} {...otherProps}>
                    <ProductOptionContainer>
                      <ProductNameText>
                        {highlightText(option.name || 'Unknown', searchTerm)}
                      </ProductNameText>
                      <ProductDetailsText>
                        {option.category} | Value: ${option.value}
                      </ProductDetailsText>
                    </ProductOptionContainer>
                  </li>
                );
              }}
              value={selectedProduct}
              onChange={(_, newValue) => {
                setSelectedProduct(newValue);
                setError('');
              }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Search for an item name" />
              )}
              noOptionsText="No matching products found"
            />
          </FormControl>

          {/* Category */}
          <FormControl fullWidth>
            <AddItemFormLabel htmlFor="category-input">Category</AddItemFormLabel>
            <TextField
              id="category-input"
              fullWidth
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Enter category"
            />
          </FormControl>

          {/* Limit */}
          <FormControl fullWidth>
            <AddItemFormLabel htmlFor="limit-input">Limit</AddItemFormLabel>
            <TextField
              id="limit-input"
              type="number"
              fullWidth
              value={itemLimit}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setItemLimit(isNaN(val) ? '' : val);
              }}
              placeholder="Enter item limit"
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: 1,
                },
              }}
            />
          </FormControl>

          {/* Value */}
          <FormControl fullWidth>
            <AddItemFormLabel htmlFor="value-input">Value</AddItemFormLabel>
            <TextField
              id="value-input"
              type="number"
              fullWidth
              value={value}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setValue(isNaN(val) ? '' : val);
              }}
              placeholder="Enter value"
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: 0.01,
                },
              }}
            />
          </FormControl>

          {/* Pack Size */}
          <FormControl fullWidth>
            <AddItemFormLabel htmlFor="pack-size-input">Pack Size</AddItemFormLabel>
            <TextField
              id="pack-size-input"
              type="number"
              fullWidth
              value={packSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setPackSize(isNaN(val) ? '' : val);
              }}
              placeholder="Enter pack size"
              error={packSize !== '' && !isPackSizeValid()}
              helperText={
                packSize !== '' && !isPackSizeValid() ? 'Pack size must be at least 1' : ''
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  step: 1,
                },
              }}
            />
          </FormControl>

          {/* Slot Selection */}
          <FormControl fullWidth disabled={!selectedWarehouse}>
            <AddItemFormLabel htmlFor="slot-input">Slot</AddItemFormLabel>
            <Autocomplete
              id="slot-input"
              options={availableSlots}
              getOptionLabel={(option) => option}
              value={selectedSlot}
              onChange={(_, newValue) => {
                setSelectedSlot(newValue);
                // Cascade: clear fixture when slot changes
                setSelectedFixture(null);
                setError('');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={!selectedWarehouse ? 'Select warehouse first' : 'Select slot'}
                />
              )}
              disabled={!selectedWarehouse}
              noOptionsText="No slots available"
            />
          </FormControl>

          {/* Fixture Selection */}
          <FormControl fullWidth disabled={!selectedSlot}>
            <AddItemFormLabel htmlFor="fixture-input">Fixture</AddItemFormLabel>
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
                  placeholder={!selectedSlot ? 'Select slot first' : 'Select fixture'}
                />
              )}
              disabled={!selectedSlot}
              noOptionsText="No fixtures available"
            />
          </FormControl>

          {/* Quantity to Add */}
          <FormControl fullWidth>
            <AddItemFormLabel htmlFor="quantity-input">Quantity to Add</AddItemFormLabel>
            <TextField
              id="quantity-input"
              type="number"
              fullWidth
              value={quantityToAdd}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setQuantityToAdd(isNaN(val) ? '' : val);
              }}
              placeholder="Enter quantity to add"
              error={quantityToAdd !== '' && !isQuantityValid()}
              helperText={
                quantityToAdd !== '' && !isQuantityValid() ? 'Quantity must be at least 1' : ''
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  step: 1,
                },
              }}
            />
          </FormControl>

          {/* Notes */}
          <FormControl fullWidth>
            <AddItemFormLabel htmlFor="notes-input">Notes</AddItemFormLabel>
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

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setSelectedWarehouse(null);
                setSelectedProduct(null);
                setCategory('');
                setItemLimit('');
                setValue('');
                setPackSize('');
                setSelectedSlot(null);
                setSelectedFixture(null);
                setQuantityToAdd('');
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
              disabled={submitting || !isFormValid()}
            >
              {submitting ? <CircularProgress size={24} /> : 'Add Item'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
