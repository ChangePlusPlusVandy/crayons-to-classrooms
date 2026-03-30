import { useState, useEffect } from 'react';
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
import {
  updateItemInfo,
  getItemInfoCategories,
  ItemInfoDetails,
} from '../../api/itemInfo';
import { EditItemFormLabel } from './EditItemInfoDialog.styles';

interface EditItemInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  itemInfo: ItemInfoDetails | null;
}

export function EditItemInfoDialog({
  open,
  onClose,
  onSaved,
  itemInfo,
}: EditItemInfoDialogProps) {
  const [category, setCategory] = useState<string | null>(null);
  const [limit, setLimit] = useState<number | ''>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load categories and pre-populate fields when dialog opens
  useEffect(() => {
    if (!open) return;

    getItemInfoCategories()
      .then(setCategories)
      .catch(() => {});

    if (itemInfo) {
      setCategory(itemInfo.category ?? null);
      setLimit(itemInfo.item_limit ?? '');
    }

    setError('');
  }, [open, itemInfo]);

  const hasValidationError = typeof limit === 'number' && limit < 0;

  const handleSave = async () => {
    if (!itemInfo || hasValidationError) return;

    setSaving(true);
    setError('');

    try {
      await updateItemInfo(itemInfo.id, {
        category: category ?? undefined,
        item_limit: typeof limit === 'number' ? limit : undefined,
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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
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
              error={hasValidationError}
              helperText={hasValidationError ? 'Limit cannot be negative' : ''}
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
            />
          </FormControl>

        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }} disabled={saving}>
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
