import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import { editRemoveMovementTransaction, editGroupedRemoveMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { getStorageLocationById } from '../../api/addItem';

interface EditPalletRemoveDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  onSuccess?: () => void;
  isGroupedOperation?: boolean;
}

export function EditPalletRemoveDialog({
  open,
  onClose,
  movement,
  onSuccess,
  isGroupedOperation,
}: EditPalletRemoveDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [sourceSlotName, setSourceSlotName] = useState('');
  const [note, setNote] = useState(movement.note || '');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError('');
    setSubmitError('');
    setNote(movement.note || '');

    async function fetchData() {
      try {
        if (!movement.from_location_id) {
          setFetchError('Cannot edit: movement is missing source location');
          return;
        }

        const srcLocation = await getStorageLocationById(movement.from_location_id);
        setSourceSlotName(srcLocation.slot);
      } catch {
        setFetchError('Failed to load movement details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, movement.from_location_id, movement.note]);

  const handleSubmit = async () => {
    if (!movement.from_location_id) return;
    if (!user) {
      setSubmitError('Not authenticated');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        inventory_action: movement.inventory_action as 'DONATED' | 'DISCARD',
        from_location_id: movement.from_location_id,
        quantity: movement.quantity,
        performed_by: user.id,
        note: note || undefined,
      };

      if (isGroupedOperation) {
        await editGroupedRemoveMovementTransaction(movement.id, payload);
      } else {
        await editRemoveMovementTransaction(movement.id, payload);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to save changes. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit Pallet Removal
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : fetchError ? (
          <Alert severity="error">{fetchError}</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError('')}>
                {submitError}
              </Alert>
            )}

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Action
              </Typography>
              <Typography variant="body1">{movement.inventory_action}</Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Quantity: {movement.quantity} items
            </Typography>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Removed from
              </Typography>
              <Typography variant="body1">{sourceSlotName}</Typography>
            </Box>

            <TextField
              label="Notes"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Box>
        )}
      </DialogContent>
      {!loading && !fetchError && (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
