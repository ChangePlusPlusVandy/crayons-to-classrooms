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
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getProducts, getStorageLocations } from '../../api/addItem';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Product } from '../../types/Product';
import {
  AddItemFormLabel,
  ProductOptionContainer,
  ProductNameText,
  ProductDetailsText,
  HighlightedText,
} from './AddItemForm.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';
import { FixtureSelector } from '../FixtureSelector/FixtureSelector';

export interface AddItemFormData {
  warehouse: Warehouse;
  product: Product;
  destinationLocationId: string;
  quantity: number;
  notes: string;
}

interface AddItemFormProps {
  initialWarehouse?: Warehouse | null;
  initialProduct?: Product | null;
  initialSlot?: string | null;
  initialFixture?: string | null;
  initialQuantity?: number | '';
  initialNotes?: string;
  onSubmit: (data: AddItemFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export default function AddItemForm({
  initialWarehouse = null,
  initialProduct = null,
  initialSlot = null,
  initialFixture = null,
  initialQuantity = '',
  initialNotes = '',
  onSubmit,
  onCancel,
  submitLabel = 'Add Item',
}: AddItemFormProps) {
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  // Form states
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(initialSlot);
  const [selectedFixture, setSelectedFixture] = useState<string | null>(initialFixture);
  const [quantityToAdd, setQuantityToAdd] = useState<number | ''>(initialQuantity);
  const [notes, setNotes] = useState(initialNotes);

  // UI states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  // Compute warehouseLocations for form submission
  const warehouseLocations = useMemo(() => {
    return selectedWarehouse
      ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
      : [];
  }, [selectedWarehouse, storageLocations]);

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

  const isFormValid = (): boolean => {
    return (
      !!selectedWarehouse &&
      !!selectedProduct &&
      !!selectedSlot &&
      !!selectedFixture &&
      isQuantityValid()
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
    if (!isQuantityValid()) {
      setError('Please enter a valid quantity to add (at least 1).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        warehouse: selectedWarehouse,
        product: selectedProduct,
        destinationLocationId: destinationLocation.id,
        quantity: quantityToAdd as number,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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

      {/* Warehouse Selection */}
      <WarehouseSelector
        value={selectedWarehouse}
        onChange={(newWarehouse) => {
          setSelectedWarehouse(newWarehouse);
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
          filterOptions={(options, state) => {
            const searchTerm = state.inputValue.toLowerCase().trim();
            if (!searchTerm) return options;
            return options.filter((product) => product.name?.toLowerCase().includes(searchTerm));
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
          renderInput={(params) => <TextField {...params} placeholder="Search for an item name" />}
          noOptionsText="No matching products found"
        />
        <Tooltip title="Coming soon">
          <span>
            <Button
              disabled
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
            >
              New Item Name
            </Button>
          </span>
        </Tooltip>
      </FormControl>

      {/* Slot Selection */}
      <SlotSelector
        value={selectedSlot}
        onChange={(newSlot) => {
          setSelectedSlot(newSlot);
          setSelectedFixture(null);
          setError('');
        }}
        warehouse={selectedWarehouse}
        storageLocations={storageLocations}
      />

      {/* Fixture Selection */}
      <FixtureSelector
        value={selectedFixture}
        onChange={(newFixture) => {
          setSelectedFixture(newFixture);
          setError('');
        }}
        slot={selectedSlot}
        warehouse={selectedWarehouse}
        storageLocations={storageLocations}
        nullFixtureLabel="None"
      />

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
        <Button variant="outlined" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" fullWidth type="submit" disabled={submitting || !isFormValid()}>
          {submitting ? <CircularProgress size={24} /> : submitLabel}
        </Button>
      </Box>
    </Stack>
  );
}
