import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  Autocomplete,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { updateItemInfo, getItemInfoCategories, ItemInfoDetails } from '../../api/itemInfo';
import { getProducts, getStorageLocations } from '../../api/addItem';
import { Product } from '../../types/Product';
import { EditItemFormLabel } from './EditItemInfoDialog.styles';

interface EditItemInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  itemInfo: ItemInfoDetails | null;
}

export function EditItemInfoDialog({ open, onClose, onSaved, itemInfo }: EditItemInfoDialogProps) {
  const [category, setCategory] = useState<string | null>(null);
  const [subcategoryProduct, setSubcategoryProduct] = useState<Product | null>(null);
  const [limit, setLimit] = useState<number | ''>('');
  const [value, setValue] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [fixture, setFixture] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storageLocations, setStorageLocations] = useState<{ fixture?: string | null }[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fixtures = useMemo(() => {
    const fixtureSet = new Set<string>();
    storageLocations.forEach((loc) => {
      if (loc.fixture && loc.fixture.trim() !== '') {
        fixtureSet.add(loc.fixture);
      }
    });
    return Array.from(fixtureSet).sort();
  }, [storageLocations]);

  useEffect(() => {
    if (!open) return;

    Promise.all([getItemInfoCategories(), getProducts(), getStorageLocations()])
      .then(([cats, prods, locs]) => {
        setCategories(cats);
        setProducts(prods);
        setStorageLocations(locs);

        if (itemInfo) {
          setCategory(itemInfo.category ?? null);
          setLimit(itemInfo.item_limit ?? '');
          setValue(itemInfo.value ?? '');
          setQuantity(itemInfo.quantity ?? '');
          setFixture(itemInfo.fixture ?? null);
          setSubcategoryProduct(
            itemInfo.product_id ? (prods.find((p) => p.id === itemInfo.product_id) ?? null) : null
          );
        }
      })
      .catch(() => {});

    setError('');
  }, [open, itemInfo]);

  const limitError = typeof limit === 'number' && limit < 0;
  const valueError = typeof value === 'number' && value < 0;
  const quantityError = typeof quantity === 'number' && quantity < 1;
  const hasValidationError = limitError || valueError || quantityError;

  const handleSave = async () => {
    if (!itemInfo || hasValidationError) return;

    setSaving(true);
    setError('');

    try {
      await updateItemInfo(itemInfo.id, {
        category: category ?? undefined,
        item_limit: typeof limit === 'number' ? limit : undefined,
        product_id: subcategoryProduct?.id ?? undefined,
        value: typeof value === 'number' ? value : undefined,
        quantity: typeof quantity === 'number' ? quantity : undefined,
        fixture: fixture ?? undefined,
      });
      onSaved();
      onClose();
    } catch {
      setError('Failed to update item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}
      >
        Edit Item Info
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* Category */}
          <FormControl fullWidth>
            <EditItemFormLabel htmlFor="edit-category-select">Category</EditItemFormLabel>
            <Autocomplete
              id="edit-category-select"
              options={categories}
              value={category}
              onChange={(_, newValue) => setCategory(newValue)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select a category (optional)" />
              )}
              freeSolo={false}
            />
          </FormControl>

          {/* Subcategory */}
          <FormControl fullWidth>
            <EditItemFormLabel htmlFor="edit-subcategory-select">Subcategory</EditItemFormLabel>
            <Autocomplete
              id="edit-subcategory-select"
              options={products}
              getOptionLabel={(option) => option.name || 'Unknown Product'}
              filterOptions={(options, state) => {
                const searchTerm = state.inputValue.toLowerCase().trim();
                if (!searchTerm) return options;
                return options.filter((p) => p.name?.toLowerCase().includes(searchTerm));
              }}
              value={subcategoryProduct}
              onChange={(_, newValue) => setSubcategoryProduct(newValue)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select a subcategory (optional)" />
              )}
              noOptionsText="No matching products found"
            />
          </FormControl>

          {/* Limit */}
          <FormControl fullWidth>
            <EditItemFormLabel htmlFor="edit-limit-input">Limit</EditItemFormLabel>
            <TextField
              id="edit-limit-input"
              type="number"
              fullWidth
              value={limit}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setLimit(isNaN(val) ? '' : val);
              }}
              placeholder="Enter item limit (optional)"
              error={limitError}
              helperText={limitError ? 'Limit cannot be negative' : ''}
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
            />
          </FormControl>

          {/* Value */}
          <FormControl fullWidth>
            <EditItemFormLabel htmlFor="edit-value-input">Value</EditItemFormLabel>
            <TextField
              id="edit-value-input"
              type="number"
              fullWidth
              value={value}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setValue(isNaN(val) ? '' : val);
              }}
              placeholder="Enter item value (optional)"
              error={valueError}
              helperText={valueError ? 'Value cannot be negative' : ''}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />
          </FormControl>

          {/* Quantity */}
          <FormControl fullWidth>
            <EditItemFormLabel htmlFor="edit-quantity-input">Quantity</EditItemFormLabel>
            <TextField
              id="edit-quantity-input"
              type="number"
              fullWidth
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setQuantity(isNaN(val) ? '' : val);
              }}
              placeholder="Enter quantity (optional)"
              error={quantityError}
              helperText={quantityError ? 'Quantity must be at least 1' : ''}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
            />
          </FormControl>

          {/* Fixture */}
          <FormControl fullWidth>
            <EditItemFormLabel htmlFor="edit-fixture-select">Fixture</EditItemFormLabel>
            <Autocomplete
              id="edit-fixture-select"
              options={fixtures}
              value={fixture}
              onChange={(_, newValue) => setFixture(newValue)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select fixture (optional)" />
              )}
              noOptionsText="No fixtures available"
            />
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ textTransform: 'none' }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ textTransform: 'none' }}
          disabled={saving || hasValidationError}
        >
          {saving ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
