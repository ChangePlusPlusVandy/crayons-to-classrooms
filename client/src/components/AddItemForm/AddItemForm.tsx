import { useEffect, useState, useMemo, useRef } from 'react';
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
  Chip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getProducts, getStorageLocations, createProduct } from '../../api/addItem';
import { createStorageLocation } from '../../api/storageLocation';
import { getItemInfoAll, getItemInfoDetails, ItemInfo } from '../../api/itemInfo';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { Product } from '../../types/Product';
import { AddItemFormLabel, ProductNameText, HighlightedText } from './AddItemForm.styles';
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';

export interface AddItemFormData {
  warehouse: Warehouse;
  itemInfo: ItemInfo;
  destinationLocationId: string;
  quantity: number;
  notes: string;
  isNewProduct: boolean;
  newProductData?: {
    name: string;
    category: string;
    subcategoryProductId?: string;
    newSubcategoryName?: string;
    limit?: number;
    value?: number;
    packSize?: number;
    fixture?: string;
  };
}

interface AddItemFormProps {
  initialWarehouse?: Warehouse | null;
  initialItemInfo?: ItemInfo | null;
  initialItemInfoId?: string;
  initialSlot?: string | null;
  initialQuantity?: number | '';
  initialNotes?: string;
  onSubmit: (data: AddItemFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  allowNewItem?: boolean;
  lockItemInfo?: boolean;
}

export default function AddItemForm({
  initialWarehouse = null,
  initialItemInfo = null,
  initialItemInfoId,
  initialSlot = null,
  initialQuantity = '',
  initialNotes = '',
  onSubmit,
  onCancel,
  submitLabel = 'Add Item',
  allowNewItem = true,
  lockItemInfo = false,
}: AddItemFormProps) {
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [itemInfoList, setItemInfoList] = useState<ItemInfo[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  // Form states
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(initialWarehouse);
  const [selectedItemInfo, setSelectedItemInfo] = useState<ItemInfo | null>(initialItemInfo);
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
  const [fixtureDialogOpen, setFixtureDialogOpen] = useState(false);
  const [newFixtureName, setNewFixtureName] = useState('');
  const [customFixtures, setCustomFixtures] = useState<string[]>([]);

  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [newSlotCode, setNewSlotCode] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);

  // Smart slot suggestion states
  const [existingSlots, setExistingSlots] = useState<string[]>([]);
  const [isLastKnownLocation, setIsLastKnownLocation] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [loadingExistingSlots, setLoadingExistingSlots] = useState(false);
  const fetchRequestId = useRef(0);

  // UI states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial data on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [productsData, itemInfoData, locationsData] = await Promise.all([
          getProducts(),
          getItemInfoAll(),
          getStorageLocations(),
        ]);
        setProducts(productsData);
        setItemInfoList(itemInfoData);
        setStorageLocations(locationsData);
        if (initialItemInfoId && !initialItemInfo) {
          const match = itemInfoData.find((info) => info.id === initialItemInfoId);
          if (match) setSelectedItemInfo(match);
        }
      } catch (err) {
        setError('Failed to load initial data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [initialItemInfoId, initialItemInfo]);

  // Fetch existing slots for the selected item in the selected warehouse
  useEffect(() => {
    const currentRequestId = ++fetchRequestId.current;

    async function fetchExistingSlots() {
      // Reset when dependencies change
      setExistingSlots([]);
      setShowAllSlots(false);
      setIsLastKnownLocation(false);

      // Only fetch if both item and warehouse are selected, and not in new item mode
      if (!selectedItemInfo || !selectedWarehouse || isNewItemMode) {
        return;
      }

      // For items with stock, fetch existing locations from API
      if (selectedItemInfo.stock > 0) {
        setLoadingExistingSlots(true);
        try {
          const details = await getItemInfoDetails(selectedItemInfo.id);

          // Guard against race condition - only update if this is still the latest request
          if (currentRequestId !== fetchRequestId.current) return;

          const warehouseData = details.warehouse_locations.find(
            (wl) => wl.warehouse_id === selectedWarehouse.id
          );

          if (warehouseData) {
            const slots = warehouseData.locations
              .map((loc) => loc.slot)
              .filter((slot): slot is string => !!slot);
            const uniqueSlots = Array.from(new Set(slots));
            setExistingSlots(uniqueSlots);
          }
        } catch (err) {
          if (currentRequestId !== fetchRequestId.current) return;
          console.error('Failed to fetch existing slots:', err);
        } finally {
          if (currentRequestId === fetchRequestId.current) {
            setLoadingExistingSlots(false);
          }
        }
      } else {
        // For out-of-stock items, check if last_known_location_code exists in this warehouse
        const lastKnownCode = selectedItemInfo.last_known_location_code;
        if (lastKnownCode) {
          const matchingLocation = storageLocations.find(
            (loc) =>
              loc.warehouse_id === selectedWarehouse.id &&
              (loc.slot === lastKnownCode || loc.location_code === lastKnownCode)
          );
          if (matchingLocation?.slot) {
            setExistingSlots([matchingLocation.slot]);
            setIsLastKnownLocation(true);
          }
        }
      }
    }

    fetchExistingSlots();
  }, [selectedItemInfo, selectedWarehouse, isNewItemMode, storageLocations]);

  const selectableItemInfoList = itemInfoList;

  // All unique fixture values from existing item_info records + custom ones
  const availableFixtures = useMemo(() => {
    const fixtureSet = new Set<string>();
    itemInfoList.forEach((info) => {
      if (info.fixture && info.fixture.trim() !== '') {
        fixtureSet.add(info.fixture);
      }
    });
    customFixtures.forEach((f) => fixtureSet.add(f));
    return Array.from(fixtureSet).sort();
  }, [itemInfoList, customFixtures]);

  // Compute warehouseLocations for form submission
  const warehouseLocations = useMemo(() => {
    return selectedWarehouse
      ? storageLocations.filter((loc) => loc.warehouse_id === selectedWarehouse.id)
      : [];
  }, [selectedWarehouse, storageLocations]);

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
    if (newItemValue === '') return true;
    if (typeof newItemValue !== 'number' || newItemValue < 0) return true;
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
    return !!selectedWarehouse && !!selectedItemInfo && !!selectedSlot && isQuantityValid();
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
    if (!isNewItemMode && !selectedItemInfo) {
      setError('Please select an item name.');
      return;
    }
    if (isNewItemMode && !newItemName.trim()) {
      setError('Please enter an item name.');
      return;
    }
    if (
      isNewItemMode &&
      (newItemValue === '' || typeof newItemValue !== 'number' || newItemValue < 0)
    ) {
      setError('Please enter a value (0 or greater) for the new item.');
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
        // Build a placeholder itemInfo — the real item_info row will be created server-side by syncItemInfoStock
        const placeholderItemInfo: ItemInfo = {
          id: '',
          name: newItemName.trim(),
          product_id: selectedSubcategoryProduct?.id || null,
          category: newItemCategory || null,
          quantity: null,
          value: typeof newItemValue === 'number' ? newItemValue : null,
          item_limit: typeof newItemLimit === 'number' ? newItemLimit : null,
          stock: 0,
          fixture: newItemFixture,
          last_known_location_code: null,
          time_last_updated: null,
          notes: null,
          limbo: false,
        };

        await onSubmit({
          warehouse: selectedWarehouse,
          itemInfo: placeholderItemInfo,
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
          itemInfo: selectedItemInfo!,
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

  const handleAddFixture = () => {
    const trimmed = newFixtureName.trim();
    if (trimmed && !availableFixtures.includes(trimmed)) {
      setCustomFixtures((prev) => [...prev, trimmed]);
    }
    setNewItemFixture(trimmed);
    setNewFixtureName('');
    setFixtureDialogOpen(false);
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

  const handleAddNewSlot = async () => {
    const slot = newSlotCode.trim();
    if (!selectedWarehouse) {
      setError('Please select a warehouse before adding a slot.');
      return;
    }
    if (!slot) {
      setError('Please enter a slot code.');
      return;
    }

    setCreatingSlot(true);
    setError('');
    try {
      const created = await createStorageLocation({
        slot,
        active: true,
        warehouse_id: selectedWarehouse.id,
      });
      setStorageLocations((prev) => [...prev, created]);
      setSelectedSlot(created.slot);
      setNewSlotCode('');
      setSlotDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create slot. Please try again.');
      setNewSlotCode('');
      setSlotDialogOpen(false);
    } finally {
      setCreatingSlot(false);
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
          setExistingSlots([]);
          setShowAllSlots(false);
          setIsLastKnownLocation(false);
          setError('');
        }}
        label="Warehouse"
        placeholder="Select warehouse"
        fullWidth
        required
      />

      {/* Item name (item_info) */}
      <FormControl fullWidth>
        <AddItemFormLabel htmlFor="item-name-select" required>
          Item Name
        </AddItemFormLabel>
        {lockItemInfo ? (
          <TextField
            fullWidth
            value={selectedItemInfo?.name ?? ''}
            placeholder="Item name"
            disabled
          />
        ) : isNewItemMode ? (
          <>
            <TextField
              id="item-name-input"
              fullWidth
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter new item name"
            />

            {/* Value */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <AddItemFormLabel htmlFor="value-input" required>
                Value
              </AddItemFormLabel>
              <TextField
                id="value-input"
                type="number"
                fullWidth
                value={newItemValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setNewItemValue(isNaN(val) ? '' : val);
                }}
                placeholder="Enter item value"
                error={typeof newItemValue === 'number' && newItemValue < 0}
                helperText={
                  typeof newItemValue === 'number' && newItemValue < 0
                    ? 'Value cannot be negative'
                    : ''
                }
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </FormControl>

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
              <AddItemFormLabel htmlFor="fixture-select">Fixture</AddItemFormLabel>
              <Autocomplete
                id="fixture-select"
                options={availableFixtures}
                value={newItemFixture}
                onChange={(_, newValue) => setNewItemFixture(newValue)}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select or add a fixture (optional)" />
                )}
              />
              <Button
                startIcon={<AddIcon />}
                onClick={() => setFixtureDialogOpen(true)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'primary.main',
                  marginTop: 0,
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              >
                New Fixture
              </Button>
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
              options={selectableItemInfoList}
              getOptionLabel={(option) => option.name || 'Unknown'}
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
                    <ProductNameText>
                      {highlightText(option.name || 'Unknown', searchTerm)}
                    </ProductNameText>
                  </li>
                );
              }}
              value={selectedItemInfo}
              onChange={(_, newValue) => {
                setSelectedItemInfo(newValue);
                setSelectedSlot(null);
                setExistingSlots([]);
                setShowAllSlots(false);
                setIsLastKnownLocation(false);
                setError('');
              }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Search for an item name" />
              )}
              noOptionsText="No matching items found"
            />
            {allowNewItem && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  setIsNewItemMode(true);
                  setSelectedItemInfo(null);
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
      {loadingExistingSlots ? (
        <FormControl fullWidth>
          <AddItemFormLabel required>Slot</AddItemFormLabel>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Checking existing locations...
            </Typography>
          </Box>
        </FormControl>
      ) : existingSlots.length > 0 && !showAllSlots ? (
        <FormControl fullWidth>
          <AddItemFormLabel required>Slot</AddItemFormLabel>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {isLastKnownLocation ? 'Item was last stocked in:' : 'This item exists in:'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {existingSlots.map((slot) => (
                <Chip
                  key={slot}
                  label={slot}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setError('');
                  }}
                  variant={selectedSlot === slot ? 'filled' : 'outlined'}
                  color={selectedSlot === slot ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
            <Button
              variant="text"
              onClick={() => setShowAllSlots(true)}
              sx={{
                textTransform: 'none',
                p: 0,
                minWidth: 'auto',
                '&:hover': { backgroundColor: 'transparent' },
              }}
            >
              Select Other Location →
            </Button>
          </Box>
        </FormControl>
      ) : (
        <>
          <SlotSelector
            value={selectedSlot}
            onChange={(newSlot) => {
              setSelectedSlot(newSlot);
              setError('');
            }}
            warehouse={selectedWarehouse}
            storageLocations={storageLocations}
            required
          >
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                setError('');
                setNewSlotCode('');
                setSlotDialogOpen(true);
              }}
              disabled={!selectedWarehouse}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: 'primary.main',
                mt: 0,
                '&:hover': { backgroundColor: 'transparent' },
              }}
            >
              New Slot
            </Button>
          </SlotSelector>
          {existingSlots.length > 0 && showAllSlots && (
            <Button
              variant="text"
              onClick={() => setShowAllSlots(false)}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                p: 0,
                mt: -2,
                '&:hover': { backgroundColor: 'transparent' },
              }}
            >
              ← Back to suggestions
            </Button>
          )}
        </>
      )}

      {/* Quantity to Add */}
      <FormControl fullWidth>
        <AddItemFormLabel htmlFor="quantity-input" required>
          Quantity to Add
        </AddItemFormLabel>
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

      {/* New Fixture Dialog */}
      <Dialog open={fixtureDialogOpen} onClose={() => setFixtureDialogOpen(false)}>
        <DialogTitle>Add New Fixture</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Fixture Name"
            value={newFixtureName}
            onChange={(e) => setNewFixtureName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFixtureDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddFixture} disabled={!newFixtureName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Slot — creates storage_locations row for the selected warehouse */}
      <Dialog open={slotDialogOpen} onClose={() => !creatingSlot && setSlotDialogOpen(false)}>
        <DialogTitle>Add New Slot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            required
            label="Slot code"
            value={newSlotCode}
            onChange={(e) => setNewSlotCode(e.target.value)}
            placeholder="e.g. A-12-03"
            sx={{ mt: 1 }}
            helperText={
              selectedWarehouse
                ? `Creates a unique storage location in ${selectedWarehouse.name}.`
                : 'Select a warehouse in the form first.'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlotDialogOpen(false)} disabled={creatingSlot}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleAddNewSlot()}
            disabled={!newSlotCode.trim() || !selectedWarehouse || creatingSlot}
            variant="contained"
          >
            {creatingSlot ? <CircularProgress size={20} /> : 'Add slot'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
