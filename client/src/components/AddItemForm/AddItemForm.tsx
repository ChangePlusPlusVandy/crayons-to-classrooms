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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getProducts, getStorageLocations, createProduct } from '../../api/addItem';
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

export interface AddItemFormData {
  warehouse: Warehouse;
  product: Product;
  destinationLocationId: string;
  quantity: number;
  notes: string;
  isNewProduct: boolean;
  newProductData?: {
    name: string;
    category: string;
    subcategoryProductId?: string;
    limit?: number;
    value?: number;
    packSize?: number;
    fixture?: string;
  };
}

interface AddItemFormProps {
  initialWarehouse?: Warehouse | null;
  initialProduct?: Product | null;
  initialSlot?: string | null;
  initialQuantity?: number | '';
  initialNotes?: string;
  onSubmit: (data: AddItemFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  allowNewItem?: boolean;
}

export default function AddItemForm({
  initialWarehouse = null,
  initialProduct = null,
  initialSlot = null,
  initialQuantity = '',
  initialNotes = '',
  onSubmit,
  onCancel,
  submitLabel = 'Add Item',
  allowNewItem = true,
}: AddItemFormProps) {
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  // Form states
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(initialSlot);
  const [quantityToAdd, setQuantityToAdd] = useState<number | ''>(initialQuantity);
  const [notes, setNotes] = useState(initialNotes);

  // New item mode states
  const [isNewItemMode, setIsNewItemMode] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string | null>(null);
  const [selectedSubcategoryProduct, setSelectedSubcategoryProduct] = useState<Product | null>(
    null
  );
  const [newItemLimit, setNewItemLimit] = useState<number | ''>('');
  const [newItemValue, setNewItemValue] = useState<number | ''>('');
  const [newItemPackSize, setNewItemPackSize] = useState<number | ''>('');
  const [newItemFixture, setNewItemFixture] = useState<string | null>(null);

  // Category/subcategory dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryProductName, setNewSubcategoryProductName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [creatingSubcategory, setCreatingSubcategory] = useState(false);

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

  // Derive available fixtures from storage locations
  const availableFixtures = useMemo(() => {
    const fixtureSet = new Set<string>();
    storageLocations.forEach((loc) => {
      if (loc.fixture && loc.fixture.trim() !== '') {
        fixtureSet.add(loc.fixture);
      }
    });
    return Array.from(fixtureSet).sort();
  }, [storageLocations]);

  // Derive available categories from existing products + custom ones
  const availableCategories = useMemo(() => {
    const fromProducts = products
      .map((p) => p.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    const unique = Array.from(new Set([...fromProducts, ...customCategories]));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [products, customCategories]);

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

  const hasNewItemFieldErrors = (): boolean => {
    if (typeof newItemValue === 'number' && newItemValue < 0) return true;
    if (typeof newItemLimit === 'number' && newItemLimit < 0) return true;
    if (typeof newItemPackSize === 'number' && newItemPackSize < 1) return true;
    return false;
  };

  const isFormValid = (): boolean => {
    if (isNewItemMode) {
      return (
        !!selectedWarehouse &&
        !!newItemName.trim() &&
        !!selectedSlot &&
        isQuantityValid() &&
        !hasNewItemFieldErrors()
      );
    }
    return !!selectedWarehouse && !!selectedProduct && !!selectedSlot && isQuantityValid();
  };

  const handleSubmit = async () => {
    // Resolve destination: prefer location with null/empty fixture, fall back to first match
    const slotLocations = warehouseLocations.filter((loc) => loc.slot === selectedSlot);
    const destinationLocation =
      slotLocations.find((loc) => !loc.fixture || loc.fixture.trim() === '') ??
      slotLocations[0] ??
      null;

    // Validation
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!isNewItemMode && !selectedProduct) {
      setError('Please select an item name.');
      return;
    }
    if (isNewItemMode && !newItemName.trim()) {
      setError('Please enter an item name.');
      return;
    }
    if (isNewItemMode && hasNewItemFieldErrors()) {
      setError('Please fix the errors in the new item fields before submitting.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a slot.');
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
      if (isNewItemMode) {
        // Build a placeholder product for the form data — the real product will be created by the parent
        const placeholderProduct: Product = {
          id: '',
          created_at: '',
          name: newItemName.trim(),
          description: null,
          unit_of_measure: null,
          value: typeof newItemValue === 'number' ? newItemValue : 0,
          item_limit: typeof newItemLimit === 'number' ? newItemLimit : 0,
          category: newItemCategory || '',
          total_count: 0,
        };

        await onSubmit({
          warehouse: selectedWarehouse,
          product: placeholderProduct,
          destinationLocationId: destinationLocation.id,
          quantity: quantityToAdd as number,
          notes,
          isNewProduct: true,
          newProductData: {
            name: newItemName.trim(),
            category: newItemCategory || '',
            subcategoryProductId: selectedSubcategoryProduct?.id || undefined,
            limit: typeof newItemLimit === 'number' ? newItemLimit : undefined,
            value: typeof newItemValue === 'number' ? newItemValue : undefined,
            packSize: typeof newItemPackSize === 'number' ? newItemPackSize : undefined,
            fixture: newItemFixture || undefined,
          },
        });
      } else {
        await onSubmit({
          warehouse: selectedWarehouse,
          product: selectedProduct!,
          destinationLocationId: destinationLocation.id,
          quantity: quantityToAdd as number,
          notes,
          isNewProduct: false,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !availableCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    setNewItemCategory(trimmed);
    setNewCategoryName('');
    setCategoryDialogOpen(false);
  };

  const handleAddSubcategory = async () => {
    const trimmed = newSubcategoryProductName.trim();
    if (!trimmed) return;

    setCreatingSubcategory(true);
    try {
      const newProduct = await createProduct({ name: trimmed, value: 0 });
      setProducts((prev) => [...prev, newProduct]);
      setSelectedSubcategoryProduct(newProduct);
      setNewSubcategoryProductName('');
      setSubcategoryDialogOpen(false);
    } catch {
      setError('Failed to create subcategory product. Please try again.');
    } finally {
      setCreatingSubcategory(false);
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
          setError('');
        }}
        label="Warehouse"
        placeholder="Select warehouse"
        fullWidth
      />

      {/* Item Name (Product) Selection */}
      <FormControl fullWidth>
        <AddItemFormLabel htmlFor="item-name-select">Item Name</AddItemFormLabel>
        {isNewItemMode ? (
          <>
            <TextField
              id="item-name-input"
              fullWidth
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter new item name"
            />

            {/* Category */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <AddItemFormLabel htmlFor="category-select">Category</AddItemFormLabel>
              <Autocomplete
                id="category-select"
                options={availableCategories}
                value={newItemCategory}
                onChange={(_, newValue) => setNewItemCategory(newValue)}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select or add a category (optional)" />
                )}
                freeSolo={false}
              />
              <Button
                startIcon={<AddIcon />}
                onClick={() => setCategoryDialogOpen(true)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'primary.main',
                  marginTop: 0,
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              >
                New Category
              </Button>
            </FormControl>

            {/* Subcategory (Product) */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <AddItemFormLabel htmlFor="subcategory-select">Subcategory</AddItemFormLabel>
              <Autocomplete
                id="subcategory-select"
                options={products}
                getOptionLabel={(option) => option.name || 'Unknown Product'}
                filterOptions={(options, state) => {
                  const searchTerm = state.inputValue.toLowerCase().trim();
                  if (!searchTerm) return options;
                  return options.filter((p) => p.name?.toLowerCase().includes(searchTerm));
                }}
                value={selectedSubcategoryProduct}
                onChange={(_, newValue) => setSelectedSubcategoryProduct(newValue)}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select a subcategory (optional)" />
                )}
                noOptionsText="No matching products found"
              />
              <Button
                startIcon={<AddIcon />}
                onClick={() => setSubcategoryDialogOpen(true)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'primary.main',
                  marginTop: 0,
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              >
                New Subcategory
              </Button>
            </FormControl>

            {/* Limit */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <AddItemFormLabel htmlFor="limit-input">Limit</AddItemFormLabel>
              <TextField
                id="limit-input"
                type="number"
                fullWidth
                value={newItemLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNewItemLimit(isNaN(val) ? '' : val);
                }}
                placeholder="Enter item limit (optional)"
                error={typeof newItemLimit === 'number' && newItemLimit < 0}
                helperText={
                  typeof newItemLimit === 'number' && newItemLimit < 0
                    ? 'Limit cannot be negative'
                    : ''
                }
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </FormControl>

            {/* Value */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <AddItemFormLabel htmlFor="value-input">Value</AddItemFormLabel>
              <TextField
                id="value-input"
                type="number"
                fullWidth
                value={newItemValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setNewItemValue(isNaN(val) ? '' : val);
                }}
                placeholder="Enter item value (optional)"
                error={newItemValue !== '' && typeof newItemValue === 'number' && newItemValue < 0}
                helperText={
                  newItemValue !== '' && typeof newItemValue === 'number' && newItemValue < 0
                    ? 'Value cannot be negative'
                    : ''
                }
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </FormControl>

            {/* Pack Size */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <AddItemFormLabel htmlFor="pack-size-input">Pack Size</AddItemFormLabel>
              <TextField
                id="pack-size-input"
                type="number"
                fullWidth
                value={newItemPackSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNewItemPackSize(isNaN(val) ? '' : val);
                }}
                placeholder="Enter pack size (optional, default 1)"
                error={
                  newItemPackSize !== '' &&
                  (typeof newItemPackSize !== 'number' || newItemPackSize < 1)
                }
                helperText={
                  newItemPackSize !== '' &&
                  (typeof newItemPackSize !== 'number' || newItemPackSize < 1)
                    ? 'Pack size must be at least 1'
                    : ''
                }
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
            </FormControl>

            {/* Fixture */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <AddItemFormLabel htmlFor="fixture-input">Fixture</AddItemFormLabel>
              <Autocomplete
                id="fixture-input"
                options={availableFixtures}
                value={newItemFixture}
                onChange={(_, newValue) => setNewItemFixture(newValue)}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select fixture (optional)" />
                )}
                noOptionsText="No fixtures available"
              />
            </FormControl>

            <Button
              onClick={() => {
                setIsNewItemMode(false);
                setError('');
              }}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: 'primary.main',
                marginTop: 1,
                '&:hover': { backgroundColor: 'transparent' },
              }}
            >
              Select Existing Item Instead
            </Button>
          </>
        ) : (
          <>
            <Autocomplete
              id="item-name-select"
              options={products}
              getOptionLabel={(option) => option.name || 'Unknown Product'}
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
            {allowNewItem && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  setIsNewItemMode(true);
                  setSelectedProduct(null);
                  setError('');
                }}
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
            )}
          </>
        )}
      </FormControl>

      {/* Slot Selection */}
      <SlotSelector
        value={selectedSlot}
        onChange={(newSlot) => {
          setSelectedSlot(newSlot);
          setError('');
        }}
        warehouse={selectedWarehouse}
        storageLocations={storageLocations}
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

      {/* New Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Subcategory Dialog */}
      <Dialog open={subcategoryDialogOpen} onClose={() => setSubcategoryDialogOpen(false)}>
        <DialogTitle>Add New Subcategory</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Product Name"
            value={newSubcategoryProductName}
            onChange={(e) => setNewSubcategoryProductName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubcategoryDialogOpen(false)} disabled={creatingSubcategory}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSubcategory}
            disabled={!newSubcategoryProductName.trim() || creatingSubcategory}
          >
            {creatingSubcategory ? <CircularProgress size={20} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
