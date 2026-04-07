import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  FormControl,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Product } from '../../types/Product';
import { ItemInfo } from '../../api/itemInfo';
import { AddItemFormLabel } from '../AddItemForm/AddItemForm.styles';
import { NewProductData } from './PalletAddForm';

interface NewItemDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: NewProductData, placeholderItemInfo: ItemInfo) => void;
  products: Product[];
  availableCategories: string[];
  initialData?: NewProductData | null;
}

export default function NewItemDialog({
  open,
  onClose,
  onConfirm,
  products,
  availableCategories,
  initialData = null,
}: NewItemDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [subcategoryProduct, setSubcategoryProduct] = useState<Product | null>(null);
  const [limit, setLimit] = useState<number | ''>('');
  const [value, setValue] = useState<number | ''>('');
  const [packSize, setPackSize] = useState<number | ''>('');

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryProductName, setNewSubcategoryProductName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [pendingSubcategories, setPendingSubcategories] = useState<Product[]>([]);
  const [error, setError] = useState('');

  const isEditMode = initialData !== null;

  // Reset / pre-fill fields when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setCategory(initialData.category || null);
        setLimit(initialData.limit ?? '');
        setValue(initialData.value ?? '');
        setPackSize(initialData.packSize ?? '');

        if (initialData.newSubcategoryName) {
          // Recreate a pending placeholder for display
          const placeholder: Product = {
            id: `pending-sub-${crypto.randomUUID()}`,
            created_at: '',
            name: initialData.newSubcategoryName,
            description: null,
            unit_of_measure: null,
            value: 0,
            item_limit: 0,
            category: '',
            total_count: 0,
          };
          setPendingSubcategories([placeholder]);
          setSubcategoryProduct(placeholder);
        } else {
          setSubcategoryProduct(
            initialData.subcategoryProductId
              ? products.find((p) => p.id === initialData.subcategoryProductId) || null
              : null
          );
          setPendingSubcategories([]);
        }
      } else {
        setName('');
        setCategory(null);
        setSubcategoryProduct(null);
        setLimit('');
        setValue('');
        setPackSize('');

        setPendingSubcategories([]);
      }
      setError('');
    }
  }, [open, initialData, products]);

  const allCategories = Array.from(new Set([...availableCategories, ...customCategories])).sort(
    (a, b) => a.localeCompare(b)
  );

  // Combined subcategory options: real products + pending placeholders
  const subcategoryOptions = [...products, ...pendingSubcategories];

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !allCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    setCategory(trimmed);
    setNewCategoryName('');
    setCategoryDialogOpen(false);
  };

  // Store new subcategory locally as a placeholder — no API call
  const handleAddSubcategory = () => {
    const trimmed = newSubcategoryProductName.trim();
    if (!trimmed) return;

    const placeholder: Product = {
      id: `pending-sub-${crypto.randomUUID()}`,
      created_at: '',
      name: trimmed,
      description: null,
      unit_of_measure: null,
      value: 0,
      item_limit: 0,
      category: '',
      total_count: 0,
    };

    setPendingSubcategories((prev) => [...prev, placeholder]);
    setSubcategoryProduct(placeholder);
    setNewSubcategoryProductName('');
    setSubcategoryDialogOpen(false);
  };

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Item name is required.');
      return;
    }

    const isPendingSubcategory = subcategoryProduct?.id.startsWith('pending-sub-');

    const data: NewProductData = {
      name: trimmedName,
      category: category || '',
      subcategoryProductId: isPendingSubcategory ? undefined : subcategoryProduct?.id || undefined,
      newSubcategoryName: isPendingSubcategory ? subcategoryProduct?.name : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
      value: typeof value === 'number' ? value : undefined,
      packSize: typeof packSize === 'number' ? packSize : undefined,
      fixture: undefined,
    };

    const placeholderItemInfo: ItemInfo = {
      id: `temp-${crypto.randomUUID()}`,
      name: trimmedName,
      product_id: isPendingSubcategory ? null : subcategoryProduct?.id || null,
      category: category || null,
      quantity: null,
      value: typeof value === 'number' ? value : null,
      item_limit: typeof limit === 'number' ? limit : null,
      stock: 0,
      fixture: null,
      last_known_location_code: null,
      time_last_updated: null,
      notes: null,
      limbo: false,
    };

    onConfirm(data, placeholderItemInfo);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditMode ? 'Edit New Item' : 'Create New Item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <span style={{ color: 'red', fontSize: '0.875rem' }}>{error}</span>}

            {/* Item Name */}
            <FormControl fullWidth>
              <AddItemFormLabel>Item Name *</AddItemFormLabel>
              <TextField
                autoFocus
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter new item name"
                size="small"
              />
            </FormControl>

            {/* Category */}
            <FormControl fullWidth>
              <AddItemFormLabel>Category</AddItemFormLabel>
              <Autocomplete
                options={allCategories}
                value={category}
                onChange={(_, newValue) => setCategory(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select or add a category (optional)"
                    size="small"
                  />
                )}
                freeSolo={false}
                size="small"
              />
              <Button
                startIcon={<AddIcon />}
                onClick={() => setCategoryDialogOpen(true)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'primary.main',
                  mt: 0,
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              >
                New Category
              </Button>
            </FormControl>

            {/* Subcategory */}
            <FormControl fullWidth>
              <AddItemFormLabel>Subcategory</AddItemFormLabel>
              <Autocomplete
                options={subcategoryOptions}
                getOptionLabel={(option) => option.name || 'Unknown'}
                filterOptions={(options, state) => {
                  const searchTerm = state.inputValue.toLowerCase().trim();
                  if (!searchTerm) return options;
                  return options.filter((p) => p.name?.toLowerCase().includes(searchTerm));
                }}
                value={subcategoryProduct}
                onChange={(_, newValue) => setSubcategoryProduct(newValue)}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select a subcategory (optional)"
                    size="small"
                  />
                )}
                noOptionsText="No matching subcategories found"
                size="small"
              />
              <Button
                startIcon={<AddIcon />}
                onClick={() => setSubcategoryDialogOpen(true)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'primary.main',
                  mt: 0,
                  '&:hover': { backgroundColor: 'transparent' },
                }}
              >
                New Subcategory
              </Button>
            </FormControl>

            {/* Limit */}
            <FormControl fullWidth>
              <AddItemFormLabel>Limit</AddItemFormLabel>
              <TextField
                type="number"
                fullWidth
                value={limit}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setLimit(isNaN(val) ? '' : val);
                }}
                placeholder="Enter item limit (optional)"
                size="small"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </FormControl>

            {/* Value */}
            <FormControl fullWidth>
              <AddItemFormLabel>Value</AddItemFormLabel>
              <TextField
                type="number"
                fullWidth
                value={value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setValue(isNaN(val) ? '' : val);
                }}
                placeholder="Enter item value (optional)"
                size="small"
                error={value !== '' && typeof value === 'number' && value < 0}
                helperText={
                  value !== '' && typeof value === 'number' && value < 0
                    ? 'Value cannot be negative'
                    : ''
                }
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </FormControl>

            {/* Pack Size */}
            <FormControl fullWidth>
              <AddItemFormLabel>Pack Size</AddItemFormLabel>
              <TextField
                type="number"
                fullWidth
                value={packSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPackSize(isNaN(val) ? '' : val);
                }}
                placeholder="Enter pack size (optional, default 1)"
                size="small"
                error={typeof packSize === 'number' && packSize < 1}
                helperText={
                  typeof packSize === 'number' && packSize < 1 ? 'Pack size must be at least 1' : ''
                }
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={!name.trim()}>
            {isEditMode ? 'Update' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nested: New Category Dialog */}
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

      {/* Nested: New Subcategory Dialog */}
      <Dialog open={subcategoryDialogOpen} onClose={() => setSubcategoryDialogOpen(false)}>
        <DialogTitle>Add New Subcategory</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Subcategory Name"
            value={newSubcategoryProductName}
            onChange={(e) => setNewSubcategoryProductName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubcategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSubcategory} disabled={!newSubcategoryProductName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
