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
import { WarehouseSelector } from '../WarehouseSelector/WarehouseSelector';
import { SlotSelector } from '../SlotSelector/SlotSelector';
import { editRemoveMovementTransaction } from '../../api/editMovement';
import { InventoryMovement } from '../../types/InventoryMovement';
import { Warehouse } from '../../types/Warehouse';
import { StorageLocation } from '../../types/StorageLocation';
import { getStorageLocations } from '../../api/moveItem';
import { getStorageLocationById, getWarehouseById } from '../../api/addItem';

interface EditPalletRemoveDialogProps {
  open: boolean;
  onClose: () => void;
  movement: InventoryMovement;
  onSuccess?: () => void;
}

export function EditPalletRemoveDialog({
  open,
  onClose,
  movement,
  onSuccess,
}: EditPalletRemoveDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [sourceWarehouse, setSourceWarehouse] = useState<Warehouse | null>(null);
  const [sourceSlot, setSourceSlot] = useState<string | null>(null);
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

        const [allLocations, srcLocation] = await Promise.all([
          getStorageLocations(),
          getStorageLocationById(movement.from_location_id),
        ]);

        setStorageLocations(allLocations);

        const wh = await getWarehouseById(srcLocation.warehouse_id);
        setSourceWarehouse(wh);
        setSourceSlot(srcLocation.slot);
      } catch {
        setFetchError('Failed to load movement details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, movement.from_location_id, movement.note]);

  const handleSubmit = async () => {
    if (!sourceWarehouse || !sourceSlot) return;
    if (!user) {
      setSubmitError('Not authenticated');
      return;
    }

    const matchingLocation = storageLocations.find(
      (loc) => loc.warehouse_id === sourceWarehouse.id && loc.slot === sourceSlot
    );
    if (!matchingLocation) {
      setSubmitError('Could not find the selected source slot');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await editRemoveMovementTransaction(movement.id, {
        inventory_action: movement.inventory_action as 'DONATED' | 'DISCARD',
        from_location_id: matchingLocation.id,
        quantity: movement.quantity,
        performed_by: user.id,
        note: note || undefined,
      });

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

  const canSubmit = !!sourceWarehouse && !!sourceSlot && !submitting;

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

            <WarehouseSelector
              value={sourceWarehouse}
              onChange={(wh) => {
                setSourceWarehouse(wh);
                setSourceSlot(null);
              }}
              label="Warehouse"
              required
            />

            <SlotSelector
              value={sourceSlot}
              onChange={setSourceSlot}
              warehouse={sourceWarehouse}
              storageLocations={storageLocations}
              label="Slot"
              required
            />

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
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
